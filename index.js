import readline from "readline"; 
import got from "got";
import chalk from "chalk";
import discord from "discord.js-selfbot-v13";
import https from "https";
import { joinVoiceChannel } from "@discordjs/voice";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pkg from 'selfbot-lofy';
const { lofy } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let whitelist = [];
let whiteListServers = [];
let trigger = '';

const whitelistFilePath = join(__dirname, 'whitelist.json');

const loadWhitelist = () => {
  if (fs.existsSync(whitelistFilePath)) {
	const fileData = fs.readFileSync(whitelistFilePath, 'utf8');
	const loaded = JSON.parse(fileData);
	whitelist = Array.isArray(loaded.users) ? loaded.users : [];
	whiteListServers = Array.isArray(loaded.servers) ? loaded.servers : [];
  }
};

const saveWhitelist = () => {
  const data = {
	users: whitelist,
	servers: whiteListServers
  };
  fs.writeFileSync(whitelistFilePath, JSON.stringify(data, null, 2));
};

loadWhitelist();

console.clear();
const asciiArt = `
██╗      ██████╗ ███████╗██╗   ██╗ ██████╗  █████╗ ███╗   ██╗ ██████╗    
██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝██╔════╝ ██╔══██╗████╗  ██║██╔════╝   
██║     ██║   ██║█████╗   ╚████╔╝ ██║  ███╗███████║██╔██╗ ██║██║  ███╗  
██║     ██║   ██║██╔══╝    ╚██╔╝  ██║   ██║██╔══██║██║╚██╗██║██║   ██║ 
███████╗╚██████╔╝██║        ██║   ╚██████╔╝██║  ██║██║ ╚████║╚██████╔╝    
╚══════╝ ╚═════╝ ╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝        
																										  
`;

const rl = readline.createInterface({
  input: process.stdin,   
  output: process.stdout  
});

const frames = ["|", "/", "-", "\\"];
const durationMs = 2500;
const stepMs = 80;

const sab = new SharedArrayBuffer(4);
const sleepView = new Int32Array(sab);

const start = Date.now();
let frameIndex = 0;
while (Date.now() - start < durationMs) {
	const progress = Math.min(1, (Date.now() - start) / durationMs);
	const barWidth = 24;
	const fill = Math.round(progress * barWidth);
	let coloredBar = "";
	for (let i = 0; i < barWidth; i += 1) {
		if (i < fill) {
			coloredBar += chalk.rgb(0, 200, 80)('#');     
		} else {
			coloredBar += chalk.rgb(80, 80, 80)('-');
		}
	}
	const spinner = chalk.rgb(0, 160, 255)(frames[frameIndex % frames.length]);
	process.stdout.write(`\r[${spinner}] [${coloredBar}]`);
	frameIndex += 1;
	Atomics.wait(sleepView, 0, 0, stepMs);
}
process.stdout.write(`\r[${chalk.rgb(0, 200, 80)('OK')}] [${chalk.rgb(0, 200, 80)('########################')}]\n\n`);

function displayAsciiArt() {
	const lines = asciiArt.split("\n");
	const total = lines.length;
	let output = "";
	for (let i = 0; i < total; i += 1) {
		const t = total <= 1 ? 1 : i / (total - 1);
		const r = Math.round(255 * (1 - t));
		const g = 0;
		const b = 0;
		output += chalk.rgb(r, g, b)(lines[i]);
		if (i < total - 1) {
			output += "\n";
		}
	}
	console.log(output);
}

function renderDeleteProgress(current, total, frameIndex) {
	const barWidth = 24;
	const progress = total === 0 ? 0 : Math.min(1, current / total);
	const fill = Math.round(progress * barWidth);
	let coloredBar = "";
	for (let i = 0; i < barWidth; i += 1) {
		if (i < fill) {
			coloredBar += chalk.rgb(0, 200, 80)('#');
		} else {
			coloredBar += chalk.rgb(80, 80, 80)('-');
		}
	}
	const spinner = chalk.rgb(0, 160, 255)(frames[frameIndex % frames.length]);
	const counter = chalk.rgb(255, 140, 0)(`${current}/${total}`);
	process.stdout.write(`\r[${spinner}] [${coloredBar}] ${counter}`);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			const chunks = [];
			res.on('data', chunk => chunks.push(chunk));
			res.on('end', () => {
				const buffer = Buffer.concat(chunks);
				const base64 = buffer.toString('base64');
				const mimeType = res.headers['content-type'] || 'image/png';
				resolve(`data:${mimeType};base64,${base64}`);
			});
			res.on('error', reject);
		}).on('error', reject);
	});
}

class ServerCloner {
	constructor(client) {
		this.client = client;
		this.roleMapping = new Map();
		this.stats = {
			rolesCreated: 0,
			categoriesCreated: 0,
			channelsCreated: 0,
			emojisCreated: 0,
			failed: 0
		};
	}

	async cloneServer(sourceGuildId, targetGuildId, cloneEmojis = true) {
		try {
			const sourceGuild = this.client.guilds.cache.get(sourceGuildId);
			const targetGuild = this.client.guilds.cache.get(targetGuildId);

			if (!sourceGuild) {
				throw new Error('Servidor de origem nao encontrado.');
			}

			if (!targetGuild) {
				throw new Error('Servidor de destino nao encontrado.');
			}

			this.info(`Clonando: ${sourceGuild.name} -> ${targetGuild.name}`);
			this.info('Iniciando clonagem...');

			await this.deleteExistingContent(targetGuild);
			await this.cloneRoles(sourceGuild, targetGuild);
			await this.cloneCategories(sourceGuild, targetGuild);
			await this.cloneChannels(sourceGuild, targetGuild);
			if (cloneEmojis) {
				await this.cloneEmojis(sourceGuild, targetGuild);
			}
			await this.cloneServerInfo(sourceGuild, targetGuild);

			this.showStats();
			this.success('Clonagem concluida com sucesso.');
		} catch (error) {
			this.error(`Falha na clonagem: ${error.message}`);
			throw error;
		}
	}

	async deleteExistingContent(guild) {
		this.info('Apagando canais e cargos existentes...');

		const channels = guild.channels.cache.filter(ch => ch.deletable);
		for (const [, channel] of channels) {
			try {
				await channel.delete();
				this.success(`Canal apagado: ${channel.name}`);
				await delay(100);
			} catch (error) {
				this.error(`Falha ao apagar canal ${channel.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		const roles = guild.roles.cache.filter(role =>
			role.name !== '@everyone' &&
			!role.managed &&
			role.editable
		);

		for (const [, role] of roles) {
			try {
				await role.delete();
				this.success(`Cargo apagado: ${role.name}`);
				await delay(100);
			} catch (error) {
				this.error(`Falha ao apagar cargo ${role.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		this.info('Limpeza concluida.');
	}

	async cloneRoles(sourceGuild, targetGuild) {
		this.info('Clonando cargos...');

		const roles = sourceGuild.roles.cache
			.filter(role => role.name !== '@everyone')
			.sort((a, b) => a.position - b.position);

		for (const [, role] of roles) {
			try {
				const newRole = await targetGuild.roles.create({
					name: role.name,
					colors: role.hexColor,
					permissions: role.permissions,
					hoist: role.hoist,
					mentionable: role.mentionable,
					reason: 'Server cloning'
				});

				this.roleMapping.set(role.id, newRole.id);
				this.success(`Cargo criado: ${role.name}`);
				this.stats.rolesCreated++;
				await delay(200);
			} catch (error) {
				this.error(`Falha ao criar cargo ${role.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		await this.fixRolePositions(sourceGuild, targetGuild);
		this.info('Cargos clonados.');
	}

	async fixRolePositions(sourceGuild, targetGuild) {
		try {
			const sourceRoles = sourceGuild.roles.cache
				.filter(role => role.name !== '@everyone')
				.sort((a, b) => b.position - a.position);

			for (const [, sourceRole] of sourceRoles) {
				const targetRole = targetGuild.roles.cache.find(r => r.name === sourceRole.name);
				if (targetRole && targetRole.editable) {
					try {
						await targetRole.setPosition(sourceRole.position);
						await delay(100);
					} catch (error) {
					}
				}
			}
		} catch (error) {
			this.warning('Nao foi possivel ajustar todas as posicoes de cargos.');
		}
	}

	async cloneCategories(sourceGuild, targetGuild) {
		this.info('Clonando categorias...');

		const categories = sourceGuild.channels.cache
			.filter(ch => ch.type === 'GUILD_CATEGORY')
			.sort((a, b) => a.position - b.position);

		for (const [, category] of categories) {
			try {
				const overwrites = this.mapPermissionOverwrites(category.permissionOverwrites, targetGuild);

				await targetGuild.channels.create(category.name, {
					type: 'GUILD_CATEGORY',
					permissionOverwrites: overwrites || [],
					position: category.position,
					reason: 'Server cloning'
				});

				this.success(`Categoria criada: ${category.name}`);
				this.stats.categoriesCreated++;
				await delay(200);
			} catch (error) {
				this.error(`Falha ao criar categoria ${category.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		this.info('Categorias clonadas.');
	}

	async cloneChannels(sourceGuild, targetGuild) {
		this.info('Clonando canais...');

		const channels = sourceGuild.channels.cache
			.filter(ch => ch.type === 'GUILD_TEXT' || ch.type === 'GUILD_VOICE')
			.sort((a, b) => a.position - b.position);

		for (const [, channel] of channels) {
			try {
				const overwrites = this.mapPermissionOverwrites(channel.permissionOverwrites, targetGuild);
				const parent = channel.parent ?
					targetGuild.channels.cache.find(c => c.name === channel.parent.name && c.type === 'GUILD_CATEGORY') :
					null;

				const channelOptions = {
					type: channel.type,
					parent: parent?.id,
					permissionOverwrites: overwrites || [],
					position: channel.position,
					reason: 'Server cloning'
				};

				if (channel.type === 'GUILD_TEXT') {
					channelOptions.topic = channel.topic || '';
					channelOptions.nsfw = channel.nsfw;
					channelOptions.rateLimitPerUser = channel.rateLimitPerUser;
				} else if (channel.type === 'GUILD_VOICE') {
					channelOptions.bitrate = channel.bitrate;
					channelOptions.userLimit = channel.userLimit;
				}

				await targetGuild.channels.create(channel.name, channelOptions);

				const channelType = channel.type === 'GUILD_TEXT' ? 'texto' : 'voz';
				this.success(`Canal ${channelType} criado: ${channel.name}`);
				this.stats.channelsCreated++;
				await delay(200);
			} catch (error) {
				this.error(`Falha ao criar canal ${channel.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		this.info('Canais clonados.');
	}

	async cloneEmojis(sourceGuild, targetGuild) {
		this.info('Clonando emojis...');

		const emojis = sourceGuild.emojis.cache;

		for (const [, emoji] of emojis) {
			try {
				const emojiURL = emoji.url;
				const imageData = await downloadImage(emojiURL);

				await targetGuild.emojis.create(imageData, emoji.name, {
					reason: 'Server cloning'
				});

				this.success(`Emoji criado: ${emoji.name}`);
				this.stats.emojisCreated++;

				await delay(2000);
			} catch (error) {
				this.error(`Falha ao criar emoji ${emoji.name}: ${error.message}`);
				this.stats.failed++;
			}
		}

		this.info('Emojis clonados.');
	}

	async cloneServerInfo(sourceGuild, targetGuild) {
		this.info('Clonando informacoes do servidor...');

		try {
			let iconData = null;

			if (sourceGuild.iconURL()) {
				try {
					iconData = await downloadImage(sourceGuild.iconURL({ format: 'png', size: 1024 }));
				} catch (error) {
					this.warning('Nao foi possivel baixar o icone do servidor.');
				}
			}

			await targetGuild.setName(sourceGuild.name);
			this.success(`Nome atualizado: ${sourceGuild.name}`);

			if (iconData) {
				await targetGuild.setIcon(iconData);
				this.success('Icone atualizado.');
			}
		} catch (error) {
			this.error(`Falha ao atualizar info do servidor: ${error.message}`);
			this.stats.failed++;
		}

		this.info('Info do servidor clonada.');
	}

	mapPermissionOverwrites(overwrites, targetGuild) {
		const mappedOverwrites = [];

		if (!overwrites || !overwrites.cache) {
			return mappedOverwrites;
		}

		overwrites.cache.forEach((overwrite) => {
			try {
				let targetId = overwrite.id;

				if (overwrite.type === 'role') {
					const newRoleId = this.roleMapping.get(overwrite.id);
					if (newRoleId) {
						targetId = newRoleId;
					} else {
						const targetRole = targetGuild.roles.cache.find(r => {
							const sourceGuild = overwrites.constructor.name === 'PermissionOverwriteManager' ? overwrites.channel.guild : null;
							if (sourceGuild) {
								const sourceRole = sourceGuild.roles.cache.get(overwrite.id);
								return sourceRole && r.name === sourceRole.name;
							}
							return false;
						});
						if (targetRole) {
							targetId = targetRole.id;
						} else {
							return;
						}
					}
				}

				if (overwrite.allow !== undefined && overwrite.deny !== undefined) {
					mappedOverwrites.push({
						id: targetId,
						type: overwrite.type,
						allow: overwrite.allow,
						deny: overwrite.deny
					});
				}
			} catch (error) {
				this.warning(`Overwrite ignorado: ${error.message}`);
			}
		});

		return mappedOverwrites;
	}

	showStats() {
		const total = this.stats.rolesCreated + this.stats.categoriesCreated +
			this.stats.channelsCreated + this.stats.emojisCreated;
		const successRate = Math.round((total / (total + this.stats.failed)) * 100) || 0;

		console.log(chalk.cyan('\nEstatisticas de clonagem:'));
		console.log(chalk.green(`Roles: ${this.stats.rolesCreated}`));
		console.log(chalk.green(`Categorias: ${this.stats.categoriesCreated}`));
		console.log(chalk.green(`Canais: ${this.stats.channelsCreated}`));
		console.log(chalk.green(`Emojis: ${this.stats.emojisCreated}`));
		console.log(chalk.red(`Falhas: ${this.stats.failed}`));
		console.log(chalk.cyan(`Sucesso: ${successRate}%\n`));
	}

	info(message) {
		console.log(chalk.cyan(`[i] ${message}`));
	}

	success(message) {
		console.log(chalk.green(`[+] ${message}`));
	}

	warning(message) {
		console.log(chalk.yellow(`[!] ${message}`));
	}

	error(message) {
		console.log(chalk.red(`[-] ${message}`));
	}
}

async function clearOpenDMs(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		client.on('ready', async () => {
			try {
				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Limpando todas as DMs abertas...\n'));

				const dms = client.channels.cache.filter(channel => channel.type === 'DM');
				loadWhitelist();
				const whitelistSet = new Set(whitelist);

				if (dms.size === 0) {
					console.log(chalk.yellow('[!] Não há DMs abertas.\n'));
					await delay(3000);
					client.destroy();
					resolve();
					return;
				}

				let totalDMsProcessed = 0;
				const totalDMs = dms.size;

				for (const dm of dms.values()) {
					if (whitelistSet.has(dm.recipient?.id || '')) {
						console.log(chalk.yellow(`[!] DM com ${dm.recipient?.username} está na whitelist, pulando...`));
						continue;
					}

					let count = 0;
					let lastId;
					let hasMoreMessages = true;

					while (hasMoreMessages) {
						try {
							const messages = await dm.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
							
							if (messages.size === 0) {
								hasMoreMessages = false;
								break;
							}

							const sortedMessages = Array.from(messages.values())
								.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

							for (const message of sortedMessages) {
								if (message.author.id === client.user?.id && !message.system) {
									try {
										await message.delete();
										count++;
										await delay(100);
									} catch (error) {
									}
								}
								lastId = message.id;
							}
						} catch (error) {
							hasMoreMessages = false;
						}
					}

					if (count > 0) {
						console.log(chalk.green(`[+] Limpeza concluída na DM com ${dm.recipient?.tag}. Total: ${count}`));
					}

					try {
						await dm.delete();
						console.log(chalk.green(`[+] DM com ${dm.recipient?.tag} fechada.`));
					} catch (error) {
					}

					totalDMsProcessed++;
				}

				console.log(chalk.green('\n[✔] Processo de limpeza finalizado.\n'));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function deleteDms(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		client.on('ready', async () => {
			try {
				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Fechando todas as DMs...\n'));

				const dms = client.channels.cache.filter(channel => channel.type === 'DM');
				loadWhitelist();
				const whitelistSet = new Set(whitelist);
				const dmCount = dms.size;
				let processedDms = 0;

				for (const dm of dms.values()) {
					if (whitelistSet.has(dm.recipient?.id || '')) {
						console.log(chalk.yellow(`[!] DM com ${dm.recipient?.username} está na whitelist, pulando...`));
						continue;
					}

					try {
						await dm.delete();
						processedDms++;
						console.log(chalk.green(`[+] DM com ${dm.recipient?.tag} fechada.`));
					} catch (error) {
					}
				}

				console.log(chalk.green('\n[✔] Processo de fechamento finalizado.\n'));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function clearDmFriends(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		client.on('ready', async () => {
			try {
				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Limpando DM de Amigos...\n'));

				const friends = await got({
					url: 'https://discord.com/api/v9/users/@me/relationships',
					headers: { 'Authorization': userToken }
				}).json();

				loadWhitelist();
				const whitelistSet = new Set(whitelist);
				let totalMessagesDeleted = 0;

				for (const friend of friends) {
					if (whitelistSet.has(friend.id)) {
						console.log(chalk.yellow(`[!] Amigo ${friend.user.username} está na whitelist, pulando...`));
						continue;
					}

					const dm = client.channels.cache.find(ch => ch.type === 'DM' && ch.recipient?.id === friend.id);
					if (!dm) continue;

					let lastId;
					let messagesDeleted = 0;

					while (true) {
						const messages = await dm.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
						if (messages.size === 0) break;

						const sortedMessages = Array.from(messages.values())
							.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

						for (const msg of sortedMessages) {
							if (!msg.system && msg.author.id === client.user?.id) {
								await msg.delete();
								messagesDeleted++;
								totalMessagesDeleted++;
							}
							lastId = msg.id;
						}
					}

					if (messagesDeleted > 0) {
						console.log(chalk.green(`[+] ${messagesDeleted} mensagens deletadas com ${friend.user.username}`));
					}
				}

				console.log(chalk.green(`\n[✔] Total: ${totalMessagesDeleted} mensagens deletadas\n`));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function clearContent(userToken) {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		const proceedWithClear = async (type, searchText = '') => {
			const client = new discord.Client({ checkUpdate: false });

			client.on('ready', async () => {
				try {
					const id = await ask(chalk.redBright('ID do canal ou usuário: '));

					let channel;
					try {
						const user = await client.users.fetch(id);
						channel = await user.createDM();
					} catch {
						channel = await client.channels.fetch(id);
					}

					console.clear();
					displayAsciiArt();
					console.log(chalk.cyan(`\n[i] Limpando conteúdo tipo: ${type}\n`));

					let totalMessages = 0;
					let tempLastId;

					while (true) {
						const tempMessages = await channel.messages.fetch({ limit: 100, ...(tempLastId && { before: tempLastId }) });
						if (tempMessages.size === 0) break;

						const filteredMessages = tempMessages.filter(m => {
							if (m.author.id !== client.user?.id) return false;
							if (type === 'text') {
								return m.content.toLowerCase().includes(searchText.toLowerCase());
							}
							if (type === 'image') {
								return m.attachments.some(a => a.contentType?.startsWith('image/'));
							}
							if (type === 'video') {
								return m.attachments.some(a => a.contentType?.startsWith('video/'));
							}
							if (type === 'file') {
								return m.attachments.size > 0;
							}
							return false;
						});

						totalMessages += filteredMessages.size;
						tempLastId = tempMessages.last()?.id;
						if (tempMessages.size < 100) break;
					}

					if (totalMessages === 0) {
						console.log(chalk.yellow('[!] Nenhuma mensagem encontrada.\n'));
						await delay(3000);
						client.destroy();
						resolve();
						return;
					}

					console.log(chalk.cyan(`[i] Total de mensagens: ${totalMessages}\n`));

					let deletedCount = 0;
					let lastId;

					while (true) {
						const messages = await channel.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
						if (messages.size === 0) break;

						const sortedMessages = Array.from(messages.values())
							.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

						for (const message of sortedMessages) {
							if (message.author.id === client.user?.id) {
								let shouldDelete = false;
								if (type === 'text') {
									shouldDelete = message.content.toLowerCase().includes(searchText.toLowerCase());
								} else if (type === 'image') {
									shouldDelete = message.attachments.some(a => a.contentType?.startsWith('image/'));
								} else if (type === 'video') {
									shouldDelete = message.attachments.some(a => a.contentType?.startsWith('video/'));
								} else if (type === 'file') {
									shouldDelete = message.attachments.size > 0;
								}

								if (shouldDelete) {
									try {
										await message.delete();
										deletedCount++;
										await delay(100);
									} catch (error) {
									}
								}
							}
							lastId = message.id;
						}

						if (messages.size < 100) break;
					}

					console.log(chalk.green(`\n[✔] ${deletedCount} mensagens deletadas\n`));
					await delay(5000);
				} catch (error) {
					console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
					await delay(5000);
				} finally {
					client.destroy();
					resolve();
				}
			});

			client.login(userToken).catch(async () => {
				console.log(chalk.red('\n[X] Erro ao conectar\n'));
				await delay(5000);
				resolve();
			});
		};

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] Limpar Conteúdo Específico'));
			console.log(chalk.green('[1] Limpar Imagens'));
			console.log(chalk.green('[2] Limpar Vídeos'));
			console.log(chalk.green('[3] Limpar Arquivos'));
			console.log(chalk.green('[4] Limpar Texto Específico'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			switch (choice) {
				case '1': await proceedWithClear('image'); break;
				case '2': await proceedWithClear('video'); break;
				case '3': await proceedWithClear('file'); break;
				case '4':
					const searchText = await ask(chalk.redBright('Texto a procurar: '));
					if (searchText.trim()) {
						await proceedWithClear('text', searchText);
					}
					break;
				case '0':
				default:
					resolve();
			}
		})();
	});
}

async function removeFriends(userToken) {
	return new Promise(async (resolve) => {
		try {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[i] Removendo amizades...\n'));

			const friends = await got({
				url: 'https://discord.com/api/v9/users/@me/relationships',
				headers: { 'Authorization': userToken }
			}).json();

			loadWhitelist();
			let count = 0;

			for (const friend of friends) {
				if (whitelist.includes(friend.id)) {
					console.log(chalk.yellow(`[!] ${friend.user.username} está na whitelist`));
					continue;
				}

				try {
					await got({
						url: `https://discord.com/api/v9/users/@me/relationships/${friend.id}`,
						method: 'DELETE',
						headers: { 'Authorization': userToken }
					});
					count++;
					console.log(chalk.green(`[+] ${friend.user.username} removido`));
				} catch (error) {
				}
			}

			console.log(chalk.green(`\n[✔] ${count} amizades removidas\n`));
			await delay(5000);
		} catch (error) {
			console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
			await delay(5000);
		} finally {
			resolve();
		}
	});
}

async function removeServers(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		client.on('ready', async () => {
			try {
				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Removendo servidores...\n'));

				const servers = client.guilds.cache.map((server) => server);
				loadWhitelist();
				let count = 0;

				for (const server of servers) {
					if (whitelist.includes(server.id)) {
						console.log(chalk.yellow(`[!] ${server.name} está na whitelist`));
						continue;
					}

					try {
						await server.leave();
						count++;
						console.log(chalk.green(`[+] ${server.name} removido`));
					} catch (error) {
					}
				}

				console.log(chalk.green(`\n[✔] ${count} servidores removidos\n`));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function manageWhitelist() {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] Whitelist'));
			console.log(chalk.green('[1] WhiteList de Usuários'));
			console.log(chalk.green('[2] WhiteList de Servidores'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			if (choice === '1') {
				await manageUserWhitelist();
			} else if (choice === '2') {
				await manageServerWhitelist();
			}

			resolve();
		})();
	});
}

async function manageUserWhitelist() {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] WhiteList de Usuários'));
			console.log(chalk.green('[1] Adicionar ID'));
			console.log(chalk.green('[2] Remover ID'));
			console.log(chalk.green('[3] Listar IDs'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			loadWhitelist();

			switch (choice) {
				case '1':
					const addId = await ask(chalk.redBright('ID do usuário: '));
					if (whitelist.includes(addId)) {
						console.log(chalk.yellow('\n[!] ID já está na whitelist\n'));
					} else {
						whitelist.push(addId);
						saveWhitelist();
						console.log(chalk.green('\n[+] ID adicionado\n'));
					}
					await delay(2000);
					break;
				case '2':
					const removeId = await ask(chalk.redBright('ID do usuário: '));
					const index = whitelist.indexOf(removeId);
					if (index === -1) {
						console.log(chalk.yellow('\n[!] ID não encontrado\n'));
					} else {
						whitelist.splice(index, 1);
						saveWhitelist();
						console.log(chalk.green('\n[+] ID removido\n'));
					}
					await delay(2000);
					break;
				case '3':
					console.log(chalk.cyan(`\n[i] Total: ${whitelist.length} IDs`));
					whitelist.forEach(id => console.log(chalk.green(`  - ${id}`)));
					console.log();
					await delay(5000);
					break;
			}

			resolve();
		})();
	});
}

async function manageServerWhitelist() {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] WhiteList de Servidores'));
			console.log(chalk.green('[1] Adicionar ID'));
			console.log(chalk.green('[2] Remover ID'));
			console.log(chalk.green('[3] Listar IDs'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			loadWhitelist();

			switch (choice) {
				case '1':
					const addId = await ask(chalk.redBright('ID do servidor: '));
					if (whiteListServers.includes(addId)) {
						console.log(chalk.yellow('\n[!] ID já está na whitelist\n'));
					} else {
						whiteListServers.push(addId);
						saveWhitelist();
						console.log(chalk.green('\n[+] ID adicionado\n'));
					}
					await delay(2000);
					break;
				case '2':
					const removeId = await ask(chalk.redBright('ID do servidor: '));
					const index = whiteListServers.indexOf(removeId);
					if (index === -1) {
						console.log(chalk.yellow('\n[!] ID não encontrado\n'));
					} else {
						whiteListServers.splice(index, 1);
						saveWhitelist();
						console.log(chalk.green('\n[+] ID removido\n'));
					}
					await delay(2000);
					break;
				case '3':
					console.log(chalk.cyan(`\n[i] Total: ${whiteListServers.length} IDs`));
					whiteListServers.forEach(id => console.log(chalk.green(`  - ${id}`)));
					console.log();
					await delay(5000);
					break;
			}

			resolve();
		})();
	});
}

async function utilInVoice(userToken) {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] Utilidades em Voz'));
			console.log(chalk.green('[1] Mover todos de 1 Canal'));
			console.log(chalk.green('[2] Desconectar todos de 1 Canal'));
			console.log(chalk.green('[3] Desconectar todos de 1 Servidor'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			if (choice === '1') {
				await moveMembersToChannel(userToken);
			} else if (choice === '2') {
				await disconnectMembersFromChannel(userToken);
			} else if (choice === '3') {
				await disconnectMembersFromServer(userToken);
			}

			resolve();
		})();
	});
}

async function moveMembersToChannel(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const fromChannelId = await ask(chalk.redBright('ID do canal de origem: '));
				const toChannelId = await ask(chalk.redBright('ID do canal de destino: '));

				const fromChannel = client.channels.cache.get(fromChannelId);
				const toChannel = client.channels.cache.get(toChannelId);

				if (!fromChannel || !toChannel || fromChannel.type !== 'GUILD_VOICE' || toChannel.type !== 'GUILD_VOICE') {
					console.log(chalk.red('\n[X] Canais inválidos\n'));
					await delay(3000);
					client.destroy();
					resolve();
					return;
				}

				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Movendo membros...\n'));

				for (const [memberID, member] of fromChannel.members) {
					try {
						await member.voice.setChannel(toChannel);
						console.log(chalk.green(`[+] ${member.user.tag} movido`));
					} catch (error) {
					}
				}

				console.log(chalk.green('\n[✔] Processo concluído\n'));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function disconnectMembersFromChannel(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const channelId = await ask(chalk.redBright('ID do canal: '));
				const channel = client.channels.cache.get(channelId);

				if (!channel || channel.type !== 'GUILD_VOICE') {
					console.log(chalk.red('\n[X] Canal inválido\n'));
					await delay(3000);
					client.destroy();
					resolve();
					return;
				}

				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Desconectando membros...\n'));

				for (const [memberID, member] of channel.members) {
					try {
						await member.voice.disconnect();
						console.log(chalk.green(`[+] ${member.user.tag} desconectado`));
					} catch (error) {
					}
				}

				console.log(chalk.green('\n[✔] Processo concluído\n'));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function disconnectMembersFromServer(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const guildId = await ask(chalk.redBright('ID do servidor: '));
				const guild = client.guilds.cache.get(guildId);

				if (!guild) {
					console.log(chalk.red('\n[X] Servidor inválido\n'));
					await delay(3000);
					client.destroy();
					resolve();
					return;
				}

				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Desconectando membros de todos os canais...\n'));

				for (const [channelID, channel] of guild.channels.cache) {
					if (channel.type === 'GUILD_VOICE') {
						for (const [memberID, member] of channel.members) {
							try {
								await member.voice.disconnect();
								console.log(chalk.green(`[+] ${member.user.tag} desconectado de ${channel.name}`));
							} catch (error) {
							}
						}
					}
				}

				console.log(chalk.green('\n[✔] Processo concluído\n'));
				await delay(5000);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function utilInChannel(userToken) {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] Utilidades em Chat'));
			console.log(chalk.green('[1] Flodar mensagem em 1 Canal'));
			console.log(chalk.green('[0] Voltar\n'));

			const choice = await ask(chalk.rgb(255, 140, 0)('Escolha: '));

			if (choice === '1') {
				await floodMessage(userToken);
			}

			resolve();
		})();
	});
}

async function floodMessage(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const message = await ask(chalk.redBright('Mensagem para flodar: '));
				const channelId = await ask(chalk.redBright('ID do canal: '));

				const channel = client.channels.cache.get(channelId);

				if (!channel || channel.type !== 'GUILD_TEXT') {
					console.log(chalk.red('\n[X] Canal inválido\n'));
					await delay(3000);
					client.destroy();
					resolve();
					return;
				}

				console.clear();
				displayAsciiArt();
				console.log(chalk.cyan('\n[i] Iniciando flood... Digite "0" para parar\n'));

				let flooding = true;

				const floodInterval = setInterval(async () => {
					if (!flooding) {
						clearInterval(floodInterval);
						return;
					}

					try {
						await channel.send(message);
					} catch (error) {
					}
				}, 100);

				const stopFlood = () => {
					rl.question('', (input) => {
						if (input.trim() === '0') {
							flooding = false;
							clearInterval(floodInterval);
							console.log(chalk.green('\n[✔] Flood interrompido\n'));
							client.destroy();
							resolve();
						} else {
							stopFlood();
						}
					});
				};

				stopFlood();
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro: ${error.message}\n`));
				await delay(5000);
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function setTrigger() {
	return new Promise((resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		(async () => {
			console.clear();
			displayAsciiArt();
			console.log(chalk.cyan('\n[=] Configurar Trigger'));
			console.log(chalk.yellow(`[i] Trigger atual: ${trigger || 'Nenhum'}\n`));

			const newTrigger = await ask(chalk.redBright('Nova palavra-chave do trigger: '));

			if (newTrigger) {
				trigger = newTrigger;
				
				if (triggerClient) {
					triggerClient.destroy();
					triggerClient = null;
				}
				startTriggerClient(token);
				
				console.log(chalk.green('\n[✔] Trigger atualizado\n'));
			} else {
				console.log(chalk.yellow('\n[!] Operação cancelada\n'));
			}

			await delay(2000);
			resolve();
		})();
	});
}

async function manageSettings() {
	return new Promise((resolve) => {
		(async () => {
			console.clear();
			displayAsciiArt();
			loadWhitelist();
			console.log(chalk.cyan('\n[i] Configurações atuais:'));
			console.log(chalk.green(`  Trigger: ${trigger || 'Não configurado'}`));
			console.log(chalk.green(`  Whitelist: ${whitelist.length} usuários`));
			console.log(chalk.green(`  Whitelist Servidores: ${whiteListServers.length} servidores\n`));
			await delay(5000);
			resolve();
		})();
	});
}

async function adicionarHypesquad(userToken) {
	return new Promise(async (resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		try {
			const house = await ask(chalk.redBright('Digite o número da house (1, 2 ou 3): '));

			if (!['1', '2', '3'].includes(house)) {
				console.log(chalk.red('\n[X] Número de house inválido.\n'));
				await delay(2000);
				return resolve();
			}

			const response = await got({
				url: 'https://discord.com/api/v9/hypesquad/online',
				method: 'POST',
				headers: {
					'Authorization': userToken,
					'Content-Type': 'application/json'
				},
				json: { house_id: parseInt(house) }
			}).json();

			console.log(chalk.green('\n[✔] Hypesquad adicionado com sucesso!\n'));
			await delay(2000);
		} catch (error) {
			console.log(chalk.red(`\n[X] Erro ao adicionar hypesquad: ${error.message}\n`));
			await delay(2000);
		} finally {
			resolve();
		}
	});
}

async function removerHypesquad(userToken) {
	return new Promise(async (resolve) => {
		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		try {
			const confirmacao = await ask(chalk.redBright('Tem certeza que deseja remover o hypesquad? (s/n): '));

			if (confirmacao.toLowerCase() !== 's' && confirmacao.toLowerCase() !== 'sim') {
				console.log(chalk.yellow('\n[!] Operação cancelada.\n'));
				await delay(2000);
				return resolve();
			}

			const response = await got({
				url: 'https://discord.com/api/v9/hypesquad/online',
				method: 'DELETE',
				headers: {
					'Authorization': userToken,
					'Content-Type': 'application/json'
				}
			});

			console.log(chalk.green('\n[✔] Hypesquad removido com sucesso!\n'));
			await delay(2000);
		} catch (error) {
			console.log(chalk.red(`\n[X] Erro ao remover hypesquad: ${error.message}\n`));
			await delay(2000);
		} finally {
			resolve();
		}
	});
}

async function limparMensagens(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const id = await ask(chalk.redBright('Insira o ID do usuário ou do grupo para limpar as mensagens: '));
				let canal;
				let nome;

				try {
					const usuario = await client.users.fetch(id);
					canal = await usuario.createDM();
					nome = usuario.tag;
				} catch (err) {
					canal = await client.channels.fetch(id);

					if (canal.type !== "GROUP_DM" && canal.type !== "GUILD_TEXT") {
						throw new Error("ID inválido. Use um canal de servidor, grupo privado ou ID de usuário.");
					}

					nome = canal.name || "Grupo Privado";
				}
				console.clear();
				displayAsciiArt();

				let all_ids = [];
				const msg1 = await canal.messages.fetch({ limit: 100 });

				msg1.forEach(element => {
					if (element.author.id !== client.user.id) return;
					if (!element.id) return;
					all_ids.push(element);
				});

				const buscas = async (a) => {
					const msg2 = await canal.messages.fetch({
						limit: 100,
						before: a
					});
					msg2.forEach(element => {
						if (element.author.id !== client.user.id) return;
						if (!element.id) return;
						all_ids.push(element);
					});
					if ((await msg2.last())?.id) {
						return await buscas((await msg2.last())?.id);
					} else {
						return;
					}
				};

				if ((await msg1.last())?.id) {
					await buscas((await msg1.last())?.id);
				}

				if (!all_ids.length) {
					console.log(chalk.red(`\n[X] Nenhuma mensagem para deletar em: ${nome}`));
					client.destroy();
					await delay(5000);
					resolve();
					return;
				}


				let contador = 0;
				let falhas = 0;
				let spinnerIndex = 0;

				renderDeleteProgress(contador, all_ids.length, spinnerIndex);
				for (const sure of all_ids) {
					contador++;
					await sure.delete().catch(() => {
						falhas += 1;
					});
					spinnerIndex += 1;
					renderDeleteProgress(contador, all_ids.length, spinnerIndex);
				}

				process.stdout.write("\n");
				if (falhas === 0) {
					console.log(chalk.green(`\n[✔] Limpeza concluída em: ${nome}\n`));
				} else {
					console.log(chalk.yellow(`\n[!] Limpeza concluída em: ${nome} (falhas: ${falhas})\n`));
				}

			} catch (error) {
				console.log(chalk.red(`\n[X] Erro ao limpar: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async (err) => {
			console.log(chalk.red('\n[X] Erro ao conectar com o token\n'));
			await delay(5000);
			resolve();
		});
	});
}

async function clonarServidor(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const sourceId = await ask(chalk.redBright('ID do servidor de origem: '));
				const targetId = await ask(chalk.redBright('ID do servidor de destino: '));
				const emojisAnswer = await ask(chalk.redBright('Clonar emojis? (y/n): '));

				if (!sourceId || !targetId) {
					console.log(chalk.red('\n[X] IDs invalidos.\n'));
					await delay(5000);
					return;
				}

				const cloneEmojis = emojisAnswer.toLowerCase().startsWith('y');
				console.clear();
				displayAsciiArt();
				console.log();

				const cloner = new ServerCloner(client);
				await cloner.cloneServer(sourceId, targetId, cloneEmojis);
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro ao clonar: ${error.message}\n`));
				await delay(5000);
			} finally {
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar com o token\n'));
			await delay(5000);
			resolve();
		});
	});
}


async function entrarCanalVoz(userToken) {
	return new Promise((resolve) => {
		const client = new discord.Client({ checkUpdate: false });

		const ask = (question) => new Promise((res) => {
			rl.question(question, (answer) => res(answer.trim()));
		});

		client.on('ready', async () => {
			try {
				const guildId = await ask(chalk.redBright('ID do servidor: '));
				const channelId = await ask(chalk.redBright('ID do canal de voz: '));

				if (!guildId || !channelId) {
					console.log(chalk.red('\n[X] IDs invalidos.\n'));
					await delay(2000);
					client.destroy();
					resolve();
					return;
				}

				const join = async () => {
					const guild = client.guilds.cache.get(guildId);
					if (!guild) {
						throw new Error('Servidor nao encontrado.');
					}

					const voiceChannel = guild.channels.cache.get(channelId);
					if (!voiceChannel) {
						throw new Error('Canal de voz nao encontrado.');
					}

					joinVoiceChannel({
						channelId: voiceChannel.id,
						guildId: guild.id,
						adapterCreator: guild.voiceAdapterCreator,
						selfDeaf: false,
						selfMute: true
					});
				};

				await join();
				console.log(chalk.green('\n[✔] Conectado ao canal de voz. (Rodando em background)\n'));

				client.on('voiceStateUpdate', async (oldState, newState) => {
					if (oldState.member?.id !== client.user.id) return;
					const oldVoice = oldState.channelId;
					const newVoice = newState.channelId;
					if (oldVoice !== newVoice) {
						if (!newVoice || newVoice !== channelId) {
							try {
								await join();
							} catch (error) {
								console.log(chalk.red(`\n[X] Erro ao reconectar: ${error.message}\n`));
							}
						}
					}
				});

				await delay(2000);
				resolve();
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro ao conectar no voice: ${error.message}\n`));
				await delay(2000);
				client.destroy();
				resolve();
			}
		});

		client.login(userToken).catch(async () => {
			console.log(chalk.red('\n[X] Erro ao conectar com o token\n'));
			await delay(2000);
			resolve();
		});
	});
}

displayAsciiArt();

let token;

const askMain = (question) => new Promise((res) => {
	rl.question(question, (answer) => res(answer.trim()));
});

async function menuLoop() {
	while (true) {
		console.clear();
		displayAsciiArt();
		console.log();

		const title = "MENU";

		console.log(chalk.rgb(0, 160, 255)('┌────────────────────────────────────┐'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)(title.padEnd(34)) + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('├────────────────────────────────────┤'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('1 ') + chalk.rgb(120, 120, 120)(' - Clear DM') + '                   ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('2 ') + chalk.rgb(120, 120, 120)(" - Clear DM's") + '                 ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('3 ') + chalk.rgb(120, 120, 120)(' - Clear DM Friends') + '           ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('4 ') + chalk.rgb(120, 120, 120)(' - Clear Content') + '              ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('5 ') + chalk.rgb(120, 120, 120)(' - Server Cloner') + '              ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('6 ') + chalk.rgb(120, 120, 120)(' - Trigger') + '                    ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('7 ') + chalk.rgb(120, 120, 120)(' - Clear Friends') + '              ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('8 ') + chalk.rgb(120, 120, 120)(' - Clear Servers') + '              ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('9 ') + chalk.rgb(120, 120, 120)(' - Delete DMs') + '                 ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('10') + chalk.rgb(120, 120, 120)(' - WhiteList') + '                  ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('11') + chalk.rgb(120, 120, 120)(' - Utilidades em Call') + '       ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('12') + chalk.rgb(120, 120, 120)(' - Utilidades em Chat') + '       ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('13') + chalk.rgb(120, 120, 120)(' - Join Voice') + '                 ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('14') + chalk.rgb(120, 120, 120)(' - Add Hypesquad') + '            ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('15') + chalk.rgb(120, 120, 120)(' - Remove Hypesquad') + '         ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('99') + chalk.rgb(120, 120, 120)(' - Configurações') + '            ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('0 ') + chalk.rgb(120, 120, 120)(' - Sair') + '                      ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('└────────────────────────────────────┘'));
		console.log();

		const option = await askMain(chalk.rgb(255, 140, 0)('Escolha uma opção: '));

		switch (option) {
			case '0':
				console.log(chalk.red('Saindo...'));
				rl.close();
				process.exit(0);
				break;
			case '1':
				await limparMensagens(token);
				break;
			case '2':
				await clearOpenDMs(token);
				break;
			case '3':
				await clearDmFriends(token);
				break;
			case '4':
				await clearContent(token);
				break;
			case '5':
				await clonarServidor(token);
				break;
			case '6':
				await setTrigger();
				break;
			case '7':
				await removeFriends(token);
				break;
			case '8':
				await removeServers(token);
				break;
			case '9':
				await deleteDms(token);
				break;
			case '10':
				await manageWhitelist();
				break;
			case '11':
				await utilInVoice(token);
				break;
			case '12':
				await utilInChannel(token);
				break;
			case '13':
				await entrarCanalVoz(token);
				break;
			case '14':
				await adicionarHypesquad(token);
				break;
			case '15':
				await removerHypesquad(token);
				break;
			case '99':
				await manageSettings();
				break;
			default:
				console.log(chalk.yellow('Opcao invalida.'));
				await delay(1000);
		}
	}
}

// Trigger client (background)
let triggerClient = null;

const startTriggerClient = (userToken) => {
	if (!trigger || triggerClient) return;

	triggerClient = new discord.Client({ checkUpdate: false });

	triggerClient.on('messageCreate', async (message) => {
		if (!trigger || !message.content) return;
		if (message.author.id !== triggerClient.user?.id) return;

		if (message.content === trigger) {
			try {
				let channel = message.channel;
				let lastId;

				while (true) {
					const messages = await channel.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
					if (messages.size === 0) break;

					const sortedMessages = Array.from(messages.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);

					for (const msg of sortedMessages) {
						if (!msg.system && msg.author.id === triggerClient.user?.id) {
							await msg.delete().catch(() => {});
						}
						lastId = msg.id;
					}

					if (messages.size < 100) break;
				}
			} catch (error) {
			}
		}
	});

	triggerClient.login(userToken).catch(() => {
		triggerClient = null;
	});
};

rl.question(chalk.rgb(255, 0, 0)('Discord token: '), async (tokenv) => {
  token = tokenv;

  try {
	const verify = await got({
	  url: "https://discord.com/api/v9/users/@me",
	  headers: {
		"authorization": token
	  }
	}).json();

	const username = verify.username;
	console.log(chalk.green(`Logged with success, ${username}!\n`));

	if (trigger) {
	  startTriggerClient(token);
	}

	await new Promise(resolve => setTimeout(resolve, 2000));

	await menuLoop();

	return;

  } catch (error) {
	console.error(chalk.red('Invalid token!'));
	rl.close();
  }
});
