import sharp from 'sharp';
import path from 'path';

async function buildPureMacIcon() {
  const inputPath = '/Users/saran/.gemini/antigravity-ide/brain/72da9424-3261-43f2-9f90-0461a013d92c/manicule_icon_v2_1788189068872.jpg';
  const outputPath = path.resolve('/Users/saran/Downloads/asterism/src-tauri/icons/rounded_1024.png');

  const canvasSize = 1024;
  const squircleSize = 824;
  const radius = 185;
  const offset = (canvasSize - squircleSize) / 2; // 100px padding

  // 1. Create pure macOS squircle background: warm cream tile on 100% transparent canvas
  const creamColor = '#f6f4ee';
  const squircleSvg = Buffer.from(`
    <svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      <rect x="${offset}" y="${offset}" width="${squircleSize}" height="${squircleSize}" rx="${radius}" ry="${radius}" fill="${creamColor}" />
    </svg>
  `);

  // 2. Extract and threshold the dark charcoal hand from the source image
  // Crop the center region containing the hand (e.g. 500x500 from center)
  const centerHand = await sharp(inputPath)
    .extract({ left: 140, top: 220, width: 740, height: 580 })
    .resize(520, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create clean dark mask of the hand
  const handPng = await sharp(centerHand)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = handPng;
  const handRgba = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * info.channels];
    const g = data[i * info.channels + 1];
    const b = data[i * info.channels + 2];

    // Dark charcoal pixels
    const brightness = (r + g + b) / 3;
    if (brightness < 120) {
      // Solid charcoal color
      handRgba[i * 4] = 30;
      handRgba[i * 4 + 1] = 30;
      handRgba[i * 4 + 2] = 36;
      handRgba[i * 4 + 3] = 255;
    } else {
      // Background is transparent
      handRgba[i * 4 + 3] = 0;
    }
  }

  const handOverlay = await sharp(handRgba, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();

  // 3. Composite everything onto a 100% transparent 1024x1024 canvas
  const squircleBase = await sharp(squircleSvg).png().toBuffer();

  const finalIcon = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: squircleBase, top: 0, left: 0 },
      { input: handOverlay, top: Math.round((canvasSize - info.height) / 2), left: Math.round((canvasSize - info.width) / 2) }
    ])
    .png()
    .toFile(outputPath);

  console.log('Built pure macOS squircle icon with zero white background at:', outputPath);
}

buildPureMacIcon().catch(console.error);
