const sharp = require('sharp');
const fs = require('fs');

async function analyze() {
  const { data: rawOil, info: infoOil } = await sharp('assets/raw-hair-oil.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log('Oil info:', infoOil.width, 'x', infoOil.height);

  const xMid = Math.floor(infoOil.width / 2);
  console.log('Sampling vertical line at x =', xMid);
  for (let y = 80; y <= 880; y += 40) {
    const idx = (y * infoOil.width + xMid) * infoOil.channels;
    const r = rawOil[idx], g = rawOil[idx+1], b = rawOil[idx+2];
    console.log(`y=${y}: rgb(${r},${g},${b})`);
  }

  // Horizontal scan across y = 500 for oil
  console.log('\nHorizontal scan across y = 500 (Oil width):');
  let leftBound = -1, rightBound = -1;
  for (let x = 100; x <= 668; x += 5) {
    const idx = (500 * infoOil.width + x) * infoOil.channels;
    const r = rawOil[idx], g = rawOil[idx+1], b = rawOil[idx+2];
    // Background is lavender purple (approx r: 150-180, g: 110-150, b: 200-240)
    // Bottle is dark violet/indigo (r: 30-70, g: 10-30, b: 60-110)
    if (r < 90 && b < 130 && leftBound === -1) leftBound = x;
    if (leftBound !== -1 && (r > 120 || b > 160) && rightBound === -1 && x > 400) rightBound = x;
  }
  console.log('Oil horizontal estimated bounds at y=500:', leftBound, 'to', rightBound);

  // Shampoo
  const { data: rawShamp, info: infoShamp } = await sharp('assets/raw-shampoo.jpg')
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log('\nShampoo info:', infoShamp.width, 'x', infoShamp.height);
  console.log('Sampling shampoo at x =', xMid);
  for (let y = 80; y <= 880; y += 40) {
    const idx = (y * infoShamp.width + xMid) * infoShamp.channels;
    const r = rawShamp[idx], g = rawShamp[idx+1], b = rawShamp[idx+2];
    console.log(`y=${y}: rgb(${r},${g},${b})`);
  }

  // Horizontal scan across y = 500 for shampoo
  // Bottle is crimson red (r: 120-190, g: 10-40, b: 30-60)
  // Background is purple (r: 130-160, g: 90-130, b: 180-220)
  let sLeft = -1, sRight = -1;
  for (let x = 100; x <= 668; x += 5) {
    const idx = (500 * infoShamp.width + x) * infoShamp.channels;
    const r = rawShamp[idx], g = rawShamp[idx+1], b = rawShamp[idx+2];
    // On bottle, R is high and B is low (R > B + 40)
    const isCrimson = (r > b + 40);
    if (isCrimson && sLeft === -1) sLeft = x;
    if (sLeft !== -1 && !isCrimson && sRight === -1 && x > 400) sRight = x;
  }
  console.log('Shampoo horizontal estimated bounds at y=500:', sLeft, 'to', sRight);
}

analyze();
