const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");

const BLACK_THRESHOLD = 450;
const PAPER_WHITE_THRESHOLD = 217; // <<< NOTE: Still 100, likely needs increasing

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
const outputScanFilename = `${parsedPath.name}_Scanned.png`;
const outputPaperFilename = `${parsedPath.name}_Paper.png`;
const outputScanImagePath = path.join(
  outputDir,
  "/images/",
  outputScanFilename
);
const outputPaperImagePath = path.join(
  outputDir,
  "/images",
  outputPaperFilename
);

if (
  !fs.existsSync(path.join(outputDir, "/images/")) &&
  !fs.existsSync(path.join(outputDir, "/images"))
) {
  fs.mkdirSync(path.join(outputDir, "/images/"), { recursive: true });
  console.log(`Created output directory: ${path.join(outputDir, "/images/")}`);
}

console.log(`Input image:  ${inputImagePath}`);
console.log(`Output scan image: ${outputScanImagePath}`);
console.log(`Output paper image: ${outputPaperImagePath}`);
console.log(`Black Threshold (R+G+B sum): ${BLACK_THRESHOLD}`);
console.log(`Paper White Threshold (per channel): ${PAPER_WHITE_THRESHOLD}`);

Jimp.Jimp.read(inputImagePath)
  .then((image) => {
    console.log(`Processing ${image.width}x${image.height} pixels...`);

    let minX = image.width;
    let minY = image.height;
    let maxX = 0;
    let maxY = 0;
    let paperDetected = false;

    image.scan(0, 0, image.width, image.height, function (x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      if (alpha > 0) {
        if (
          red > PAPER_WHITE_THRESHOLD &&
          green > PAPER_WHITE_THRESHOLD &&
          blue > PAPER_WHITE_THRESHOLD
        ) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          paperDetected = true;
        }

        const colorSum = red + green + blue;
        if (colorSum < BLACK_THRESHOLD) {
          this.bitmap.data[idx + 0] = 0;
          this.bitmap.data[idx + 1] = 0;
          this.bitmap.data[idx + 2] = 0;
          this.bitmap.data[idx + 3] = 255;
        } else {
          this.bitmap.data[idx + 3] = 0;
        }
      }
    });

    const promises = [];

    promises.push(image.write(outputScanImagePath)); // Use writeAsync
    console.log(
      `Attempting to save full scanned image to ${outputScanImagePath}`
    );

    if (paperDetected && maxX > minX && maxY > minY) {
      const paperX = minX;
      const paperY = minY;
      const paperWidth = maxX - minX + 1;
      const paperHeight = maxY - minY + 1;

      console.log(
        `Detected paper bounds: x=${paperX}, y=${paperY}, w=${paperWidth}, h=${paperHeight}`
      );

      try {
        const paperImage = image.clone();
        paperImage.crop({
          // Use w and h keys
          x: paperX,
          y: paperY,
          w: paperWidth,
          h: paperHeight,
        });
        promises.push(paperImage.write(outputPaperImagePath)); // Use writeAsync
        console.log(
          `Attempting to save cropped paper image to ${outputPaperImagePath}`
        );
      } catch (cropError) {
        console.error(
          "Error during cropping or cloning for paper image:",
          cropError
        );
      }
    } else {
      console.log("Paper bounds not detected or invalid.");
    }

    return Promise.all(promises);
  })
  .then((results) => {
    console.log(`✅ Processing finished.`);
    if (results && results.length > 0)
      console.log(`   Saved: ${outputScanImagePath}`);
    // Check results length carefully in case only one promise was pushed
    if (results && results.length > 1 && fs.existsSync(outputPaperImagePath)) {
      console.log(`   Saved: ${outputPaperImagePath}`);
    } else if (
      results &&
      results.length === 1 &&
      fs.existsSync(outputPaperImagePath)
    ) {
      // This case might happen if the first write failed but the second succeeded, though unlikely with Promise.all
      console.log(`   Saved: ${outputPaperImagePath}`);
    }
  })
  .catch((err) => {
    console.error("❌ Error processing image:", err);
    process.exit(1);
  });
