// Genera PNGs placeholder (icono + splash claro/oscuro) sin dependencias:
// fondo sólido de marca + un disco centrado a modo de logotipo temporal.
// Sustituye estos ficheros por el arte real y regénralos con @capacitor/assets.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function png(size, bg, disc) {
  const [br, bgc, bb] = hex(bg);
  const [dr, dg, db] = disc.color ? hex(disc.color) : [0, 0, 0];
  const cx = size / 2, cy = size / 2, r2 = (disc.r ?? 0) ** 2;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro none por scanline
    for (let x = 0; x < size; x++) {
      const inside = disc.r && (x - cx) ** 2 + (y - cy) ** 2 <= r2;
      raw[p++] = inside ? dr : br;
      raw[p++] = inside ? dg : bgc;
      raw[p++] = inside ? db : bb;
      raw[p++] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = ~0; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return ~c; }

const CLAY = '#bc6a4a', GREIGE = '#f0efec', DARK = '#1c1b19';
writeFileSync('resources/icon.png', png(1024, CLAY, { r: 300, color: GREIGE }));
writeFileSync('resources/splash.png', png(2732, GREIGE, { r: 200, color: CLAY }));
writeFileSync('resources/splash-dark.png', png(2732, DARK, { r: 200, color: CLAY }));
console.log('Generados: resources/icon.png, splash.png, splash-dark.png');
