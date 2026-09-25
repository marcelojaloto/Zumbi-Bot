# Zumbi Bot — A revolução dos robôs no apocalipse zumbi

Beat 'em up 2.5D para navegador, no estilo _Streets of Rage_ / _Captain Commando_: você é um robô que avança
pelas fases da esquerda para a direita (e em profundidade) enfrentando hordas de zumbis e máquinas com socos,
chutes, armas brancas, armas de fogo e cajados elementais.

Feito com **Three.js** (iluminação dinâmica, sombras, névoa e pós-processamento), **TypeScript** e **Vite**.
Todo o visual e o áudio são gerados por código — não há arquivos de arte ou som externos.

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173/Zumbi-Bot/)
npm run build      # build de produção em dist/
npm run preview    # serve o build em http://localhost:4173/Zumbi-Bot/
npm test           # testes unitários (Vitest)
npm run e2e        # testes ponta a ponta (Playwright + Chromium)
npm run check      # typecheck + testes + build
```

## Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` publica o jogo a cada push na `main`.
Para ativar: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
O jogo fica em `https://<usuario>.github.io/Zumbi-Bot/`.

## Licença

CC0 1.0 — domínio público.
