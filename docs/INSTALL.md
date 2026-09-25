# Zumbi Bot — Local installation manual

> Web version, with copy buttons and per-system tabs: https://marcelojaloto.github.io/Zumbi-Bot/manual/
> Versão em português: [INSTALACAO.md](INSTALACAO.md)

You don't need to install anything to **play**: the game runs at https://marcelojaloto.github.io/Zumbi-Bot/ on
computers, phones and tablets. This manual is for running the game on your own machine.

## 1. What you need

- **Node.js 22 LTS** (minimum 20.19, required by Vite 8) — https://nodejs.org/
- **Git** — https://git-scm.com/
- A WebGL browser (up-to-date Chrome, Edge, Firefox or Safari)

## 2. Install the tools

- **Windows:** install Node.js (.msi installer) and Git for Windows, then close and reopen PowerShell.
- **macOS:** install Node.js (.pkg installer) or run `brew install node git`. If Terminal asks to install the
  "command line developer tools", accept it.
- **Linux:** install Git with your package manager (`sudo apt install git`, `sudo dnf install git`) and Node.js 22
  following https://nodejs.org/en/download (recommended: nvm).

Check (Node should print `v22`, or at least `v20.19`):

```bash
node --version
git --version
```

## 3. Download and run the game

```bash
git clone https://github.com/marcelojaloto/Zumbi-Bot.git
cd Zumbi-Bot
npm install
npm run dev
```

When `Local: http://localhost:5173/Zumbi-Bot/` appears, open that address in your browser.
**Keep the terminal open** while you play (it is the game's server); to stop it, press `Ctrl` + `C`.

- **Play on your phone over the same Wi-Fi:** run `npm run dev -- --host` and open the "Network" address it prints
  on your phone (something like `http://192.168.0.10:5173/Zumbi-Bot/`).
- **Production build (same as the website):** `npm run build` then `npm run preview` →
  `http://localhost:4173/Zumbi-Bot/`.
- **Update:** `git pull` and `npm install` inside the `Zumbi-Bot` folder.

## 4. Testing shortcuts

Add these to the address, for example `http://localhost:5173/Zumbi-Bot/?map=arena&god=1`:

| Parameter      | Effect                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `?map=vila`    | Opens a map directly: vila, torre, banco, castelo, toxica, floresta, centro, chamas, guerra, arena |
| `&god=1`       | God mode                                                                                           |
| `&quality=low` | Forces the quality: low, medium or high                                                            |
| `&debug=1`     | Testing tools (F1–F8 spawn enemies)                                                                |
| `&mute=1`      | No sound                                                                                           |

## 5. Common problems

- **"node", "npm" or "git" is not recognized:** the program is not installed, or the terminal was opened before
  installing it. Install it and open a new terminal.
- **Node version error:** install Node.js 22 LTS and check with `node --version`.
- **"This site can't be reached" at localhost:5173:** the server is not running (terminal closed or `npm run dev`
  stopped with an error). Run `npm run dev` again inside the folder. localhost only works on the computer where the
  command is running.
- **"Port 5173 is already in use":** close the other terminal or use the port Vite suggests.
- **Black screen or WebGL error:** turn on hardware acceleration in your browser (Chrome: Settings → System → "Use
  graphics acceleration when available") and restart the browser.
- **No sound:** browsers only allow audio after the first click or tap.
