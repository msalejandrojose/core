// Dibuja el icono de Brío y las pantallas de arranque con sharp (SVG → PNG).
// Uso, desde la raíz del repo: node apps/mobile/resources/draw-brio.cjs . <carpeta-salida>
// Después copia icon/splash a resources/ y los iconos web a public/icons/ (ver README).
const path = require('path');
const sharp = require(path.resolve(process.argv[2], 'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp'));
const out = process.argv[3];
const INK = '#1c1c1e', GREEN = '#34C759', BG = '#f2f2f7';
const ARC = 'M12 4a8 8 0 1 1-7.4 5';

// Icono a sangre (iOS redondea las esquinas). `glyph` = fracción del lado que ocupa el arco.
function iconSvg(size, glyph = 0.6, rounded = false) {
  const s = (size * glyph) / 24, off = (size - 24 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2c2c2f"/><stop offset="1" stop-color="#141416"/></linearGradient></defs>
  <rect width="${size}" height="${size}" ${rounded ? `rx="${size * 0.225}"` : ''} fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${s})">
    <path d="${ARC}" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round"/>
  </g></svg>`;
}

// Arranque: el icono redondeado centrado sobre el fondo de la app.
function splashSvg(size, bg) {
  const mark = 420, x = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <g transform="translate(${x} ${x})">${iconSvg(mark, 0.6, true).replace(/<\/?svg[^>]*>/g, '')}</g></svg>`;
}

const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(path.join(out, file));
(async () => {
  await png(iconSvg(1024), 'icon.png');
  await png(splashSvg(2732, BG), 'splash.png');
  await png(splashSvg(2732, INK), 'splash-dark.png');
  await png(iconSvg(180), 'apple-touch-icon.png');
  await png(iconSvg(192), 'icon-192.png');
  await png(iconSvg(512), 'icon-512.png');
  await png(iconSvg(512, 0.48), 'maskable-512.png'); // zona segura de Android
  await png(iconSvg(512, 0.6, true), 'preview-redondeado.png');
  console.log('ok');
})();
