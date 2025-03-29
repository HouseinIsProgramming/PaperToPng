const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");

// Start with a value like 150 and adjust based on your scanned images.
const BLACK_THRESHOLD = 450;

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: node main.js <path/to/your/image.ext>");
  console.error("Example: node main.js ./mypaper.png");
  process.exit(1);
}
const inputImagePath = args[0];

if (!fs.existsSync(inputImagePath)) {
  console.error(`Error: Input file not found at "${inputImagePath}"`);
  process.exit(1);
}
if (!fs.lstatSync(inputImagePath).isFile()) {
  console.error(`Error: Input path is not a file: "${inputImagePath}"`);
  process.exit(1);
}

const parsedPath = path.parse(inputImagePath);
const outputDir = parsedPath.dir || ".";
const outputFilename = `${parsedPath.name}_Scanned.png`;
const outputImagePath = path.join(outputDir, outputFilename);

console.log(`Input image:  ${inputImagePath}`);
console.log(`Output image: ${outputImagePath}`);
console.log(`Black Threshold (R+G+B sum): ${BLACK_THRESHOLD}`);

Jimp.Jimp.read(inputImagePath)
  .then((image) => {
    console.log(`Processing ${image.width}x${image.height} pixels...`);

    image.scan(0, 0, image.width, image.height, function (x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      const colorSum = red + green + blue;

      if (colorSum < BLACK_THRESHOLD && alpha > 0) {
        this.bitmap.data[idx + 0] = 0; // R
        this.bitmap.data[idx + 1] = 0; // G
        this.bitmap.data[idx + 2] = 0; // B
        this.bitmap.data[idx + 3] = 255;
      } else {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    return image.write(outputImagePath);
  })
  .then(() => {
    console.log(`✅ Successfully created scanned image: ${outputImagePath}`);
  })
  .catch((err) => {
    console.error("❌ Error processing image:", err);
    process.exit(1);
  });
