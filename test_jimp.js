// test_jimp.js
try {
  const Jimp = require("jimp");
  console.log("Jimp imported successfully.");
  console.log("Type of Jimp:", typeof Jimp);
  console.log("Type of Jimp.read:", typeof Jimp.read); // This should output 'function'

  if (typeof Jimp.read === "function") {
    console.log("Jimp.read seems to be available.");
  } else {
    console.error("Error: Jimp.read is not available!");
    console.log("Imported Jimp object:", Jimp); // See what was actually imported
  }
} catch (error) {
  console.error("Failed to require Jimp:", error);
}
