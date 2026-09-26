// Ícone e tela de abertura do app de iPhone, desenhados a partir do robô do ícone do jogo.
// Uso: npm run ios:assets  (grava em ios/App/App/Assets.xcassets/)
// A App Store recusa ícone com canal alfa: o ícone é gravado em RGB (sem transparência).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const ASSETS = 'ios/App/App/Assets.xcassets';

/** O robô (cabeça, visor aceso, corpo) no espaço 512×512 do ícone. */
const ROBOT = `
  <rect x="232" y="72" width="48" height="52" rx="10" fill="#5d687d"/>
  <rect x="144" y="112" width="224" height="184" rx="36" fill="#7a8aa0"/>
  <rect x="176" y="160" width="160" height="56" rx="28" fill="#39e6ff" filter="url(#glow)" opacity="0.85"/>
  <rect x="176" y="160" width="160" height="56" rx="28" fill="#8af6ff"/>
  <rect x="160" y="312" width="192" height="104" rx="32" fill="#ff8c1a"/>
  <rect x="192" y="344" width="128" height="24" rx="12" fill="#5a2d00"/>`;

const DEFS = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="72%">
      <stop offset="0" stop-color="#231811"/>
      <stop offset="1" stop-color="#0b0d14"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="11"/></filter>
  </defs>`;

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${DEFS}
  <rect width="512" height="512" fill="url(#bg)"/>${ROBOT}</svg>`;

// tela de abertura: o robô no centro (cabe na faixa do meio que aparece no celular deitado)
const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-427 -439 1366 1366">${DEFS}
  <rect x="-427" y="-439" width="1366" height="1366" fill="#0b0d14"/>
  <circle cx="256" cy="244" r="420" fill="url(#bg)"/>${ROBOT}</svg>`;

/** Desenha o SVG num canvas do tamanho pedido e devolve os pixels RGBA. */
async function render(page, svg, size) {
  const b64 = await page.evaluate(
    async ([src, n]) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(src)}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, n, n);
      const px = g.getImageData(0, 0, n, n).data;
      let s = '';
      for (let i = 0; i < px.length; i += 0x8000) s += String.fromCharCode(...px.subarray(i, i + 0x8000));
      return btoa(s);
    },
    [svg, size],
  );
  return Buffer.from(b64, 'base64');
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])));
  return Buffer.concat([head, data, crc]);
}

/** PNG RGB de 8 bits (sem canal alfa). */
function pngRGB(size, rgba) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[o++] = rgba[i];
      raw[o++] = rgba[i + 1];
      raw[o++] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  writeFileSync(
    `${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`,
    pngRGB(1024, await render(page, ICON_SVG, 1024)),
  );
  const splash = pngRGB(2732, await render(page, SPLASH_SVG, 2732));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    writeFileSync(`${ASSETS}/Splash.imageset/${f}`, splash);
} finally {
  await browser.close();
}
console.log(`ícone e tela de abertura em ${ASSETS}/`);
