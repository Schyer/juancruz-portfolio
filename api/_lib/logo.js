// La "JC" en píxeles (16x16) que se usa como favicon
import { deflateSync } from "node:zlib";

export const ROWS = [
  "................", "................", "................",
  "...####...#####.", "...####..######.", ".....##..##.....",
  ".....##..##.....", ".....##..##.....", ".....##..##.....",
  ".##..##..##.....", ".##..##..##.....", ".######..######.",
  "..####....#####.", "................", "................", "................"
];

export function svg(color) {
  let rects = "";
  ROWS.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "#") rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" rx="3" fill="${color}"/><g fill="#fff">${rects}</g></svg>`;
}

// PNG sin dependencias (para el ícono del celular y navegadores sin SVG)
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

export function png(color, size, rounded = true) {
  const [R, G, B] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const s = size / 16, radius = rounded ? 3 * s : 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "none"
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      // esquinas redondeadas
      const cx = x < radius ? radius - x : x >= size - radius ? x - (size - radius - 1) : 0;
      const cy = y < radius ? radius - y : y >= size - radius ? y - (size - radius - 1) : 0;
      const inside = !radius || cx === 0 || cy === 0 || cx * cx + cy * cy <= radius * radius;
      if (!inside) continue; // transparente
      const on = ROWS[Math.floor(y / s)][Math.floor(x / s)] === "#";
      raw[o] = on ? 255 : R; raw[o + 1] = on ? 255 : G; raw[o + 2] = on ? 255 : B; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
