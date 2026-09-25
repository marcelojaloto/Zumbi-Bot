# Zumbi Bot — Manual de instalação local

> Versão na web, com botões de copiar e abas por sistema: https://marcelojaloto.github.io/Zumbi-Bot/manual/
> English version: [INSTALL.md](INSTALL.md)

Não precisa instalar nada para **jogar**: o jogo roda em https://marcelojaloto.github.io/Zumbi-Bot/ no computador,
no celular ou no tablet. Este manual é para rodar o jogo na sua própria máquina.

## 1. O que você precisa

- **Node.js 22 LTS** (mínimo 20.19, exigido pelo Vite 8) — https://nodejs.org/
- **Git** — https://git-scm.com/
- Um navegador com WebGL (Chrome, Edge, Firefox ou Safari atualizados)

## 2. Instalar as ferramentas

- **Windows:** instale o Node.js (instalador .msi) e o Git for Windows. Depois feche e abra de novo o PowerShell.
- **macOS:** instale o Node.js (instalador .pkg) ou rode `brew install node git`. Se o Terminal pedir as
  "ferramentas de linha de comando", aceite.
- **Linux:** instale o Git pelo gerenciador da distribuição (`sudo apt install git`, `sudo dnf install git`) e o
  Node.js 22 seguindo https://nodejs.org/en/download (recomendado: nvm).

Confira (o Node deve mostrar `v22`, ou pelo menos `v20.19`):

```bash
node --version
git --version
```

## 3. Baixar e rodar o jogo

```bash
git clone https://github.com/marcelojaloto/Zumbi-Bot.git
cd Zumbi-Bot
npm install
npm run dev
```

Quando aparecer `Local: http://localhost:5173/Zumbi-Bot/`, abra esse endereço no navegador.
**Deixe o terminal aberto** enquanto joga (ele é o servidor do jogo); para parar, `Ctrl` + `C`.

- **Jogar no celular pela mesma rede Wi-Fi:** `npm run dev -- --host` e abra no celular o endereço "Network" que
  aparecer (algo como `http://192.168.0.10:5173/Zumbi-Bot/`).
- **Versão de produção (igual à do site):** `npm run build` e `npm run preview` → `http://localhost:4173/Zumbi-Bot/`.
- **Atualizar:** `git pull` e `npm install` dentro da pasta `Zumbi-Bot`.

## 4. Atalhos para testar

Acrescente ao endereço, por exemplo `http://localhost:5173/Zumbi-Bot/?map=arena&god=1`:

| Parâmetro      | Efeito                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `?map=vila`    | Abre direto um mapa: vila, torre, banco, castelo, toxica, floresta, centro, chamas, guerra, arena |
| `&god=1`       | Modo invencível                                                                                   |
| `&quality=low` | Força a qualidade: low, medium ou high                                                            |
| `&debug=1`     | Ferramentas de teste (F1–F8 criam inimigos)                                                       |
| `&mute=1`      | Sem som                                                                                           |

## 5. Problemas comuns

- **"node", "npm" ou "git" não é reconhecido:** o programa não foi instalado ou o terminal foi aberto antes da
  instalação. Instale e abra um terminal novo.
- **Erro de versão do Node:** instale o Node.js 22 LTS e confira com `node --version`.
- **"Não é possível acessar esse site" em localhost:5173:** o servidor não está rodando (terminal fechado ou
  `npm run dev` parou com erro). Rode `npm run dev` de novo dentro da pasta. O localhost só funciona no computador
  onde o comando está rodando.
- **"Port 5173 is already in use":** feche o outro terminal ou use a porta que o Vite sugerir.
- **Tela preta ou erro de WebGL:** ative a aceleração de hardware do navegador (Chrome: Configurações → Sistema →
  "Usar aceleração de gráficos quando disponível") e reinicie o navegador.
- **Sem som:** o navegador só libera o áudio depois do primeiro clique ou toque.
