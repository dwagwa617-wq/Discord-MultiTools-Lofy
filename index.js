import readline from "readline"; 
import got from "got";
import chalk from "chalk";
import discord from "discord.js-selfbot-v13";
import https from "https";
import { joinVoiceChannel } from "@discordjs/voice";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'selfbot-lofy'
const { lofy } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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
					await delay(5000);
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
				console.log(chalk.green('\n[✔] Conectado ao canal de voz.\n'));

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
			} catch (error) {
				console.log(chalk.red(`\n[X] Erro ao conectar no voice: ${error.message}\n`));
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

		console.log(chalk.rgb(0, 160, 255)('┌───────────────────────────────┐'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)(title.padEnd(29)) + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('├───────────────────────────────┤'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('1') + chalk.rgb(120, 120, 120)(' - Message Cleaner') + '          ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('2') + chalk.rgb(120, 120, 120)(' - Server Cloner') + '           ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('3') + chalk.rgb(120, 120, 120)(' - Join Voice') + '              ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('4') + chalk.rgb(120, 120, 120)(' - Add Hypesquad') + '           ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('5') + chalk.rgb(120, 120, 120)(' - Remove Hypesquad') + '        ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('│') + ' ' + chalk.rgb(255, 140, 0)('0') + chalk.rgb(120, 120, 120)(' - Sair') + '                     ' + chalk.rgb(0, 160, 255)('│'));
		console.log(chalk.rgb(0, 160, 255)('└───────────────────────────────┘'));
		console.log();

		const option = await askMain(chalk.rgb(255, 140, 0)('Escolha uma opção: '));

		if (option === '0') {
			console.log(chalk.red('Saindo...'));
			rl.close();
			process.exit(0);
		}

		if (option === '1') {
			console.clear();
			displayAsciiArt();
			console.log();
			await limparMensagens(token);
			continue;
		}

		if (option === '2') {
			console.clear();
			displayAsciiArt();
			console.log();
			await clonarServidor(token);
			continue;
		}

		if (option === '3') {
			console.clear();
			displayAsciiArt();
			console.log();
			await entrarCanalVoz(token);
			continue;
		}

		if (option === '4') {
			console.clear();
			displayAsciiArt();
			console.log();
			await adicionarHypesquad(token);
			continue;
		}

		if (option === '5') {
			console.clear();
			displayAsciiArt();
			console.log();
			await removerHypesquad(token);
			continue;
		}

		console.log(chalk.yellow('Opcao invalida.'));
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
}

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

    await new Promise(resolve => setTimeout(resolve, 2000));

    await menuLoop();

    return;

  } catch (error) {
    console.error(chalk.red('Invalid token!'));
    rl.close();
  }
});