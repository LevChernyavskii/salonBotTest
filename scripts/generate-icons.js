import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple CRC32 table & function for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  // Create RGBA image buffer
  // Dark background: #0D1117 (R: 13, G: 17, B: 23)
  // Glow / Card accent: Indigo / Cyan (#6366F1, #38BDF8)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.35 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: #0D1117
      let r = 13, g = 17, b = 23, a = 255;

      // Outer circular badge
      if (dist < radius) {
        // Deep modern slate card container
        const t = dist / radius;
        r = Math.round(22 * (1 - t * 0.4));
        g = Math.round(27 * (1 - t * 0.4));
        b = Math.round(34 * (1 - t * 0.4));

        // Front Card rectangle: center-top
        // Card bounds
        const cardW = width * (isMaskable ? 0.38 : 0.44);
        const cardH = height * (isMaskable ? 0.46 : 0.52);

        // Card 1: Back rotated card (accent cyan)
        const rx = dx * 0.95 + dy * 0.28;
        const ry = -dx * 0.28 + dy * 0.95;
        if (Math.abs(rx) < cardW / 2 && Math.abs(ry) < cardH / 2) {
          // Soft cyan border/glow
          r = 45; g = 85; b = 130;
        }

        // Card 2: Main crisp front card (indigo/purple gradient)
        if (Math.abs(dx) < cardW / 2 && Math.abs(dy) < cardH / 2) {
          // Indigo front: #4F46E5 / #6366F1
          const ny = (dy + cardH / 2) / cardH;
          r = Math.round(79 + ny * 20);
          g = Math.round(70 + ny * 32);
          b = Math.round(229 + ny * 18);

          // Star or lightning / flashcard symbol in center
          if (Math.abs(dx) < cardW * 0.3 && Math.abs(dy - 4) < cardH * 0.08) {
            // White text line
            r = 255; g = 255; b = 255;
          }
          if (Math.abs(dx) < cardW * 0.22 && Math.abs(dy + cardH * 0.18) < cardH * 0.08) {
            r = 147; g = 197; b = 253; // light blue accent
          }
          if (Math.abs(dx) < cardW * 0.18 && Math.abs(dy - cardH * 0.22) < cardH * 0.06) {
            r = 52; g = 211; b = 153; // emerald accent
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: deflate
  ihdrData[11] = 0; // Filter: standard
  ihdrData[12] = 0; // Interlace: none
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', deflated);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(48, 48, false));

// SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D1117" />
      <stop offset="100%" stop-color="#161B22" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0.2" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <!-- Background tilted card -->
  <rect x="175" y="105" width="220" height="280" rx="20" fill="#1E293B" transform="rotate(12 285 245)" stroke="#38BDF8" stroke-width="4" stroke-opacity="0.4" />
  <!-- Main card -->
  <rect x="120" y="125" width="230" height="290" rx="22" fill="url(#cardGrad)" stroke="#A5B4FC" stroke-width="3" />
  <!-- Symbol / Repeat Flash -->
  <circle cx="235" cy="235" r="46" fill="#0D1117" fill-opacity="0.3" />
  <path d="M220 195 L255 235 L225 240 L245 285 L215 245 L240 240 Z" fill="#FDE047" />
  <!-- Accent Lines representing vocabulary / cards -->
  <rect x="155" y="325" width="160" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.9" />
  <rect x="175" y="350" width="120" height="8" rx="4" fill="#A7F3D0" />
  <!-- SRS Indicator dots -->
  <circle cx="165" cy="165" r="7" fill="#60A5FA" />
  <circle cx="190" cy="165" r="7" fill="#F43F5E" />
  <circle cx="215" cy="165" r="7" fill="#34D399" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg.trim());
console.log('PWA Icons and assets created successfully!');
