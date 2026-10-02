// process-episode.js
// THE ORCHESTRATOR. Picks the next pending episode and runs the ENTIRE
// pipeline for it in one go, in one workflow run: download -> transcribe ->
// pick highlights -> cut/reframe/caption/post all 5 clips.
//
// Why "all in one run" instead of spreading across multiple 2-hour runs:
// the downloaded video and transcript only exist on this run's temporary
// disk — they are NOT saved back to GitHub between runs (videos are too
// big/slow to commit to git every cycle). So one episode must finish
// start-to-finish in a single run, or it has to start over from scratch.
// GitHub gives each run up to 6 hours, which is enough for one episode.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EPISODES_FILE = path.join(__dirname, 'episodes.json');
const WORK_DIR = path.join(__dirname, 'work');

function loadJson(file, fallback) {
  if (fs.existsSync(file)) { try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; } }
  return fallback;
}
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function run(cmd) { console.log('>', cmd); execSync(cmd, { stdio: 'inherit' }); }

async function postEverywhere(clipPath, caption, title) {
  const results = {};
  try { run(`node post.js "${clipPath}" "${caption.replace(/"/g, '\\"')}"`); results.tiktok = 'posted'; }
  catch (err) { console.error('TikTok post failed:', err.message); results.tiktok = 'failed'; }

  try { const { postToInstagram } = require('./post-instagram.js'); await postToInstagram(clipPath, caption); results.instagram = 'posted'; }
  catch (err) { console.error('Instagram post failed:', err.message); results.instagram = 'failed'; }

  try { const { postToYouTube } = require('./post-youtube.js'); await postToYouTube(clipPath, title, caption); results.youtube = 'posted'; }
  catch (err) { console.error('YouTube post failed:', err.message); results.youtube = 'failed'; }

  return results;
}

async function main() {
  const episodes = loadJson(EPISODES_FILE, { queue: [] });
  const episode = episodes.queue.find((e) => e.status !== 'done');

  if (!episode) {
    console.log('No pending episodes. Nothing to do this run.');
    return;
  }

  if (fs.existsSync(WORK_DIR)) fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR);

  const sourcePath = path.join(WORK_DIR, 'source.mp4');
  const transcriptPath = path.join(WORK_DIR, 'transcript.json');
  const highlightsPath = path.join(WORK_DIR, 'highlights.json');

  console.log(`Processing episode: ${episode.url}`);

  console.log('\n=== Stage 1: Download ===');
  run(`node download.js "${episode.url}" "${sourcePath}"`);

  console.log('\n=== Stage 2: Transcribe ===');
  run(`python3 transcribe.py "${sourcePath}" "${transcriptPath}"`);

  console.log('\n=== Stage 3: Pick highlights ===');
  run(`node pick-highlights.js "${transcriptPath}" "${highlightsPath}"`);

  const highlights = loadJson(highlightsPath, []);
  const clipResults = [];

  for (let i = 0; i < highlights.length; i++) {
    const clip = highlights[i];
    const cutPath = path.join(WORK_DIR, `clip-${i}.mp4`);
    const assPath = path.join(WORK_DIR, `clip-${i}.ass`);
    const finalPath = path.join(WORK_DIR, `clip-${i}-final.mp4`);

    console.log(`\n=== Stage 4: Clip ${i + 1}/${highlights.length} ===`);
    run(`node cut-clip.js "${sourcePath}" ${clip.start} ${clip.end} "${cutPath}"`);
    run(`node generate-captions.js "${transcriptPath}" ${clip.start} ${clip.end} "${assPath}"`);
    run(`node reframe.js "${cutPath}" "${finalPath}" "${assPath}"`);

    const caption = clip.hashtags;
    const title = clip.text.slice(0, 80);
    const results = await postEverywhere(finalPath, caption, title);
    console.log(`Clip ${i + 1} results:`, results);
    clipResults.push(results);
  }

  episode.status = 'done';
  episode.clipResults = clipResults;
  saveJson(EPISODES_FILE, episodes);

  // Clean up — the actual video files never need to leave this run's disk.
  fs.rmSync(WORK_DIR, { recursive: true, force: true });

  console.log('\nEpisode fully processed.');
}

main().catch((err) => {
  console.error('process-episode.js failed:', err.message);
  process.exit(1);
});
