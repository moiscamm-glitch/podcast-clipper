// generate-captions.js
const fs = require('fs');
const WORDS_PER_GROUP = 2;

function formatAssTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginV
Style: Default,Arial Black,90,&H00FFFFFF,&H00000000,1,1,6,0,2,250

[Events]
Format: Layer, Start, End, Style, Text
`;

function main() {
  const [, , transcriptPath, clipStartStr, clipEndStr, outputPath] = process.argv;
  if (!transcriptPath || !clipStartStr || !clipEndStr || !outputPath) {
    console.error('Usage: node generate-captions.js <transcript.json> <clipStart> <clipEnd> <output.ass>');
    process.exit(1);
  }
  const clipStart = parseFloat(clipStartStr);
  const clipEnd = parseFloat(clipEndStr);
  const segments = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
  const words = [];
  for (const seg of segments) {
    for (const w of seg.words || []) {
      if (w.start >= clipStart && w.end <= clipEnd) words.push(w);
    }
  }
  let events = '';
  for (let i = 0; i < words.length; i += WORDS_PER_GROUP) {
    const group = words.slice(i, i + WORDS_PER_GROUP);
    const text = group.map((w) => w.word).join(' ').toUpperCase();
    const start = group[0].start - clipStart;
    const end = group[group.length - 1].end - clipStart;
    events += `Dialogue: 0,${formatAssTime(start)},${formatAssTime(end)},Default,${text}\n`;
  }
  fs.writeFileSync(outputPath, ASS_HEADER + events);
  console.log(`Wrote ${words.length} words -> ${outputPath}`);
}
main();
