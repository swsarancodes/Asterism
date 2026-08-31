import sharp from 'sharp';
import path from 'path';

async function fixIconTransparency() {
  const inputPath = '/Users/saran/.gemini/antigravity-ide/brain/72da9424-3261-43f2-9f90-0461a013d92c/manicule_icon_v2_1788189068872.jpg';
  const outputPath = path.resolve('/Users/saran/Downloads/asterism/src-tauri/icons/rounded_1024.png');

  // Load raw image buffer
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Create RGBA buffer
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const outIdx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      rgbaBuffer[outIdx] = r;
      rgbaBuffer[outIdx + 1] = g;
      rgbaBuffer[outIdx + 2] = b;

      // The outer white border is near 255 (e.g. > 248) and corners
      // Check if pixel is in corner region and near white
      const isCorner = 
        (x < width * 0.2 || x > width * 0.8) &&
        (y < height * 0.2 || y > height * 0.8);

      if (isCorner && r > 240 && g > 240 && b > 240) {
        rgbaBuffer[outIdx + 3] = 0; // Transparent!
      } else {
        rgbaBuffer[outIdx + 3] = 255;
      }
    }
  }

  // Now apply an exact Apple macOS squircle mask
  const size = 1024;
  const squircleRadius = 224;

  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${squircleRadius}" ry="${squircleRadius}" fill="#ffffff" />
    </svg>
  `);

  const masked = await sharp(rgbaBuffer, {
    raw: { width, height, channels: 4 }
  })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log('Fixed icon generated at:', outputPath);
}

fixIconTransparency().catch(console.error);
