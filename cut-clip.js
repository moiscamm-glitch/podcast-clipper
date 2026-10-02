// cut-clip.js
// Extracts a time range [start, end] from the source video as its own file,
// re-encoding (not just -c copy) so the cut point is frame-accurate.
// Usage: node cut-clip.js source.mp4 start end output.mp4
const { execSync } = require('child_process');
const [, , source, start, end, output] = process.argv;
if (!source || !start || !end || !output) {
  console.error('Usage: node cut-clip.js <source.mp4> <start> <end> <output.mp4>');
  process.exit(1);
}
const duration = parseFloat(end) - parseFloat(start);
const cmd = `ffmpeg -y -ss ${start} -i "${source}" -t ${duration} -c:v libx264 -preset fast -crf 18 -c:a aac "${output}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log(`Cut clip -> ${output}`);
