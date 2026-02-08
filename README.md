# 🔥 LOFYGANG Discord Tools

<div align="center">

```
██╗      ██████╗ ███████╗██╗   ██╗ ██████╗  █████╗ ███╗   ██╗ ██████╗    
██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝██╔════╝ ██╔══██╗████╗  ██║██╔════╝   
██║     ██║   ██║█████╗   ╚████╔╝ ██║  ███╗███████║██╔██╗ ██║██║  ███╗  
██║     ██║   ██║██╔══╝    ╚██╔╝  ██║   ██║██╔══██║██║╚██╗██║██║   ██║ 
███████╗╚██████╔╝██║        ██║   ╚██████╔╝██║  ██║██║ ╚████║╚██████╔╝    
╚══════╝ ╚═════╝ ╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝        
```

**Ferramenta completa de automação para Discord com funcionalidades avançadas**

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

</div>

---

## 📋 Índice

- [Sobre](#-sobre)
- [Features](#-features)
- [Instalação](#-instalação)
- [Como Usar](#-como-usar)
- [Funcionalidades](#-funcionalidades)
- [Aviso Legal](#%EF%B8%8F-aviso-legal)
- [Tecnologias](#-tecnologias)

---

## 🎯 Sobre

LOFYGANG Discord Tools é uma ferramenta poderosa desenvolvida em Node.js que oferece diversas funcionalidades para automação no Discord. Com uma interface CLI intuitiva e colorida, permite gerenciar mensagens, clonar servidores, participar de canais de voz e gerenciar badges de Hypesquad.

---

## ✨ Features

- 🧹 **Message Cleaner** - Limpa todas as suas mensagens em DMs, grupos ou canais de servidor
- 🔄 **Server Cloner** - Clona servidores completos (roles, canais, categorias, emojis, permissões)
- 🎤 **Join Voice** - Entra e permanece em canais de voz automaticamente
- 🏠 **Hypesquad Manager** - Adiciona ou remove badges de Hypesquad (Bravery, Brilliance, Balance)
- 📊 **Progress Tracking** - Barras de progresso animadas para todas as operações
- 🎨 **Interface Colorida** - CLI estilizada com gradientes e animações

---

## 🚀 Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) versão 16 ou superior
- npm (vem com Node.js)
- Token de conta Discord

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/dwagwa617-wq/Discord-MultiTools-Lofy.git
cd Discord-MultiTools-Lofy
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute o programa**
```bash
npm start
```

---

## 💻 Como Usar

1. Ao iniciar o programa, você será solicitado a inserir seu **token do Discord**

2. Após a autenticação, um menu interativo será exibido:

```
┌───────────────────────────────┐
│ MENU                          │
├───────────────────────────────┤
│ 1 - Message Cleaner           │
│ 2 - Server Cloner             │
│ 3 - Join Voice                │
│ 4 - Add Hypesquad             │
│ 5 - Remove Hypesquad          │
│ 0 - Sair                      │
└───────────────────────────────┘
```

3. Escolha a opção desejada digitando o número correspondente

---

## 🛠 Funcionalidades

### 1️⃣ Message Cleaner
Limpa todas as suas mensagens em um canal específico.

**Como usar:**
- Selecione a opção `1`
- Insira o ID do usuário, grupo ou canal
- Aguarde a conclusão da limpeza

**Suporta:**
- DMs (mensagens diretas)
- Grupos privados
- Canais de servidor

---

### 2️⃣ Server Cloner
Clona um servidor Discord completo, incluindo estrutura e configurações.

**O que é clonado:**
- ✅ Cargos (roles) com permissões
- ✅ Categorias de canais
- ✅ Canais de texto
- ✅ Canais de voz
- ✅ Emojis personalizados (opcional)
- ✅ Permissões e sobrescritas
- ✅ Ícone e nome do servidor

**Como usar:**
- Selecione a opção `2`
- Insira o ID do servidor de origem
- Insira o ID do servidor de destino
- Escolha se deseja clonar emojis (y/n)

---

### 3️⃣ Join Voice
Entra e permanece em um canal de voz automaticamente.

**Recursos:**
- Reconexão automática se for desconectado
- Microfone mutado por padrão
- Áudio desativado

**Como usar:**
- Selecione a opção `3`
- Insira o ID do servidor
- Insira o ID do canal de voz

---

### 4️⃣ Add Hypesquad
Adiciona uma badge de Hypesquad ao seu perfil.

**Houses disponíveis:**
- `1` - Bravery (Vermelho)
- `2` - Brilliance (Roxo)
- `3` - Balance (Verde)

---

### 5️⃣ Remove Hypesquad
Remove a badge de Hypesquad do seu perfil.


---

## 🔧 Tecnologias

Este projeto foi desenvolvido com as seguintes tecnologias:

- [Node.js](https://nodejs.org/) - Runtime JavaScript
- [discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) - Biblioteca Discord selfbot
- [got](https://github.com/sindresorhus/got) - Cliente HTTP
- [chalk](https://github.com/chalk/chalk) - Estilização de terminal
- [@discordjs/voice](https://github.com/discordjs/voice) - Suporte a canais de voz

---

## 📝 Como obter o Token do Discord

1. Abra o Discord no navegador (discord.com/app)
2. Pressione `F12` para abrir o DevTools
3. Vá para a aba `Console`
4. Cole o seguinte código:
```javascript
window.webpackChunkdiscord_app.push([
  [Math.random()],
  {},
  req => {
    if (!req.c) return;
    for (const m of Object.keys(req.c)
      .map(x => req.c[x].exports)
      .filter(x => x)) {
      if (m.default && m.default.getToken !== undefined) {
        return copy(m.default.getToken());
      }
      if (m.getToken !== undefined) {
        return copy(m.getToken());
      }
    }
  },
]);
console.log('%cToken copiado!', 'font-size: 50px');
```
5. Seu token será copiado para a área de transferência

> ⚠️ **NUNCA compartilhe seu token com ninguém!**

---

## 📊 Estatísticas

Durante a clonagem de servidores, são exibidas estatísticas detalhadas:

- Roles criados
- Categorias criadas
- Canais criados
- Emojis criados
- Falhas ocorridas
- Taxa de sucesso (%)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

## 📄 Licença

Este projeto está sob a licença ISC.

---

## 👨‍💻 Autor

Desenvolvido com 💜 por Console

---

<div align="center">

**⚠️ Use com responsabilidade | Educational purposes only ⚠️**

</div>
