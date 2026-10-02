// pick-highlights.js
const fs = require('fs');
const TARGET_CLIP_LENGTH = 50;
const CLIPS_WANTED = 5;
const HOOK_WORDS = ['crazy','insane','shocking','unbelievable','never','secret','wow','what','why','how','actually','truth','honestly','wrong','mistake','problem','biggest','worst','best','nobody','everyone','always','lied','realized','changed'];
const STOPWORDS = new Set(['the','a','an','and','or','but','is','are','was','were','to','of','in','on','for','with','that','this','it','i','you','he','she','we','they','be','have','has','had','do','does','did','so','just','like','know','yeah','okay','um','uh']);

function scoreSegment(segment) {
  const text = segment.text.toLowerCase();
  let score = 0;
  if (text.includes('?')) score += 2;
  if (text.includes('!')) score += 1;
  for (const word of HOOK_WORDS) if (text.includes(word)) score += 1.5;
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 5 && wordCount <= 40) score += 1;
  return score;
}

function extractHashtags(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => `#${w}`).join(' ');
}

function buildClipAround(segments, centerIndex) {
  let startIdx = centerIndex, endIdx = centerIndex;
  const centerStart = segments[centerIndex].start;
  while (endIdx < segments.length - 1 && segments[endIdx].end - centerStart < TARGET_CLIP_LENGTH * 0.7) endIdx += 1;
  while (startIdx > 0 && centerStart - segments[startIdx].start < TARGET_CLIP_LENGTH * 0.3) startIdx -= 1;
  const clipText = segments.slice(startIdx, endIdx + 1).map((s) => s.text).join(' ');
  return { start: segments[startIdx].start, end: segments[endIdx].end, text: clipText, hashtags: extractHashtags(clipText) };
}

function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) { console.error('Usage: node pick-highlights.js <transcript.json> <highlights.json>'); process.exit(1); }
  const segments = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const scored = segments.map((seg, i) => ({ index: i, score: scoreSegment(seg) }));
  scored.sort((a, b) => b.score - a.score);
  const clips = [];
  for (const { index } of scored) {
    if (clips.length >= CLIPS_WANTED) break;
    const candidate = buildClipAround(segments, index);
    if (!clips.some((c) => overlaps(c, candidate))) clips.push(candidate);
  }
  clips.sort((a, b) => a.start - b.start);
  fs.writeFileSync(outputPath, JSON.stringify(clips, null, 2));
  console.log(`Picked ${clips.length} clips -> ${outputPath}`);
}
main();
