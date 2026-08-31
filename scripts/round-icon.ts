import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateRoundedIcon() {
  const inputPath = '/Users/saran/.gemini/antigravity-ide/brain/72da9424-3261-43f2-9f90-0461a013d92c/manicule_icon_v2_1788189068872.jpg';
  const outputPath = path.resolve('/Users/saran/Downloads/asterism/src-tauri/icons/rounded_1024.png');

  // Create an Apple macOS squircle mask (824x824 centered in 1024x1024 with r=185)
  // or 1024x1024 with r=225
  const size = 1024;
  const innerSize = 860;
  const radius = 190;
  const offset = (size - innerSize) / 2;

  // SVG mask for smooth antialiased continuous rounded squircle
  const maskSvg = Buffer.from(`
    <svg width="${size}" height="${size}">
      <rect x="${offset}" y="${offset}" width="${innerSize}" height="${innerSize}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `);

  // Resize input image to innerSize x innerSize, then composite with mask and shadow
  const resizedInput = await sharp(inputPath)
    .resize(innerSize, innerSize, { fit: 'cover' })
    .toBuffer();

  const innerMaskSvg = Buffer.from(`
    <svg width="${innerSize}" height="${innerSize}">
      <rect x="0" y="0" width="${innerSize}" height="${innerSize}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `);

  const roundedTile = await sharp(resizedInput)
    .composite([{ input: innerMaskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Create final 1024x1024 transparent canvas and place the roundedTile in the center
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: roundedTile,
        top: Math.round(offset),
        left: Math.round(offset)
      }
    ])
    .png()
    .toFile(outputPath);

  console.log('Generated rounded icon at:', outputPath);
}

generateRoundedIcon().catch(console.error);
