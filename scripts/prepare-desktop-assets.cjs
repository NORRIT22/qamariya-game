const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const root = path.resolve(__dirname, "..");
const buildDir = path.join(root, "build");
const tessDir = path.join(root, "assets", "tessdata");
const svgPath = path.join(buildDir, "readdy.svg");

function findFile(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, filename);
      if (found) return found;
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(tessDir, { recursive: true });

  const iconPng = path.join(buildDir, "icon.png");
  await sharp(svgPath).resize(256, 256).png().toFile(iconPng);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = [];
  for (const size of sizes) {
    const output = path.join(buildDir, `icon-${size}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(output);
    pngs.push(output);
  }
  fs.writeFileSync(path.join(buildDir, "icon.ico"), await pngToIco(pngs));
  for (const file of pngs) fs.rmSync(file, { force: true });

  for (const lang of ["eng", "fra"]) {
    const packageDir = path.join(root, "node_modules", "@tesseract.js-data", lang);
    const trained = findFile(packageDir, `${lang}.traineddata.gz`);
    if (!trained) throw new Error(`Missing offline Tesseract language data: ${lang}`);
    fs.copyFileSync(trained, path.join(tessDir, `${lang}.traineddata.gz`));
  }

  console.log("Prepared Readdy desktop icon and offline OCR language packs.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
