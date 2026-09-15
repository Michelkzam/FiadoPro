import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '..', 'public', 'favicon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

const maskableSizes = [
  { name: 'icon-maskable-192x192.png', size: 192 },
  { name: 'icon-maskable-512x512.png', size: 512 },
];

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  console.log('Generating standard icons...');
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(OUTPUT_DIR, name));
    console.log(`  Created ${name}`);
  }

  console.log('Generating maskable icons...');
  for (const { name, size } of maskableSizes) {
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;

    const background = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#2563eb"/>
      </svg>`
    );

    const resizedIcon = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .toBuffer();

    await sharp(background)
      .composite([{
        input: resizedIcon,
        left: padding,
        top: padding,
      }])
      .png()
      .toFile(path.join(OUTPUT_DIR, name));
    console.log(`  Created ${name} (maskable)`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
