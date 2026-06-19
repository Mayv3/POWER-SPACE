// Genera src/app/favicon.ico multi-tamaño desde el logo. Uso único.
// node scripts/gen-favicon.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'public', 'powerspace_logo.png');
const OUT = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');
const SIZES = [16, 32, 48, 64, 256];

(async () => {
  // PNG cuadrado por tamaño (fondo blanco, el logo ya es sobre blanco).
  const pngs = await Promise.all(
    SIZES.map((s) =>
      sharp(SRC)
        .resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer()
    )
  );

  // Contenedor ICO con PNG embebido (válido en navegadores modernos).
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: icono
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach((buf, i) => {
    const s = SIZES[i];
    const b = i * 16;
    dir.writeUInt8(s >= 256 ? 0 : s, b + 0); // ancho (0 = 256)
    dir.writeUInt8(s >= 256 ? 0 : s, b + 1); // alto
    dir.writeUInt8(0, b + 2); // paleta
    dir.writeUInt8(0, b + 3); // reservado
    dir.writeUInt16LE(1, b + 4); // planos
    dir.writeUInt16LE(32, b + 6); // bits por pixel
    dir.writeUInt32LE(buf.length, b + 8); // tamaño imagen
    dir.writeUInt32LE(offset, b + 12); // offset
    offset += buf.length;
  });

  fs.writeFileSync(OUT, Buffer.concat([header, dir, ...pngs]));
  console.log('favicon.ico escrito:', OUT, fs.statSync(OUT).size, 'bytes');
})();
