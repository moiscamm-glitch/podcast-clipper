// reframe.js
const { execSync } = require('child_process');
const inputPath = process.argv[2];
const outputPath = process.argv[3];
const captionsPath = process.argv[4];
if (!inputPath || !outputPath) { console.error('Usage: node reframe.js <input.mp4> <output.mp4> [captions.ass]'); process.exit(1); }

const filterComplex =
  '[0:v]split=2[left][right];' +
  '[left]crop=iw/2:ih:0:0,scale=1080:960:force_original_aspect_ratio=decrease,pad=1080:960:(ow-iw)/2:(oh-ih)/2[l];' +
  '[right]crop=iw/2:ih:iw/2:0,scale=1080:960:force_original_aspect_ratio=decrease,pad=1080:960:(ow-iw)/2:(oh-ih)/2[r];' +
  '[l][r]vstack=inputs=2[stacked]';

const finalFilter = captionsPath ? `${filterComplex};[stacked]ass=${captionsPath}[out]` : `${filterComplex};[stacked]copy[out]`;
const cmd = `ffmpeg -y -i "${inputPath}" -filter_complex "${finalFilter}" -map "[out]" -map 0:a -c:v libx264 -preset fast -crf 20 -c:a aac "${outputPath}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log(`Done: ${outputPath}`);
