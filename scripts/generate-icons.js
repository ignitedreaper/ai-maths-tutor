const fs = require('fs');
const path = require('path');

// A minimal valid 1x1 PNG (blue pixel) encoded in base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buf = Buffer.from(pngBase64, 'base64');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const icons = [
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png',
];

icons.forEach(name => {
  fs.writeFileSync(path.join(iconsDir, name), buf);
  console.log('Created placeholder:', name);
});

