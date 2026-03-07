// Generate audio assets (WAV) and splatter PNGs for the game
// Run: node scripts/generateAssets.js

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', 'public', 'assets', 'audio');
const IMAGE_DIR = join(__dirname, '..', 'public', 'assets', 'images');

mkdirSync(AUDIO_DIR, { recursive: true });
mkdirSync(IMAGE_DIR, { recursive: true });

// ---- WAV file helpers ----
function createWav(sampleRate, channels, samples) {
  const bytesPerSample = 2; // 16-bit
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  return buffer;
}

// ---- Sound generators ----

function generateDholBeat(sampleRate = 44100) {
  // 8-second loopable dhol beat at ~120 BPM
  const duration = 8;
  const bpm = 120;
  const beatInterval = 60 / bpm;
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beatPhase = (t % beatInterval) / beatInterval;

    // Main dhol hit (low thump)
    if (beatPhase < 0.15) {
      const env = Math.exp(-beatPhase * 25);
      samples[i] += Math.sin(2 * Math.PI * 80 * t) * env * 0.6;
      samples[i] += Math.sin(2 * Math.PI * 120 * t) * env * 0.3;
      // Add some noise for attack
      samples[i] += (Math.random() * 2 - 1) * env * env * 0.3;
    }

    // Off-beat higher hit (tiki)
    const offBeatPhase = ((t + beatInterval * 0.5) % beatInterval) / beatInterval;
    if (offBeatPhase < 0.08) {
      const env = Math.exp(-offBeatPhase * 40);
      samples[i] += Math.sin(2 * Math.PI * 200 * t) * env * 0.25;
      samples[i] += Math.sin(2 * Math.PI * 350 * t) * env * 0.15;
      samples[i] += (Math.random() * 2 - 1) * env * env * 0.15;
    }

    // Syncopated accent every other beat
    const accentPhase = ((t + beatInterval * 0.75) % (beatInterval * 2)) / beatInterval;
    if (accentPhase < 0.1) {
      const env = Math.exp(-accentPhase * 30);
      samples[i] += Math.sin(2 * Math.PI * 160 * t) * env * 0.35;
      samples[i] += (Math.random() * 2 - 1) * env * env * 0.2;
    }

    // Subtle 16th note ghost hits
    const sixteenthPhase = (t % (beatInterval / 4)) / (beatInterval / 4);
    if (sixteenthPhase < 0.05) {
      const env = Math.exp(-sixteenthPhase * 60);
      samples[i] += Math.sin(2 * Math.PI * 280 * t) * env * 0.08;
    }
  }

  return createWav(sampleRate, 1, samples);
}

function generateSplat(sampleRate = 44100) {
  // Wet splat sound — noise burst with low-pass envelope
  const duration = 0.3;
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 12) * (1 - Math.exp(-t * 200));
    const noise = Math.random() * 2 - 1;

    // Low-pass filtered noise (simple 1-pole)
    const cutoff = 800 + 2000 * Math.exp(-t * 15);
    const rc = 1 / (2 * Math.PI * cutoff);
    const alpha = 1 / (1 + sampleRate * rc);

    if (i > 0) {
      samples[i] = samples[i - 1] + alpha * (noise * env - samples[i - 1]);
    } else {
      samples[i] = noise * env;
    }

    // Add low thump for impact
    samples[i] += Math.sin(2 * Math.PI * 100 * t) * Math.exp(-t * 20) * 0.4;

    samples[i] *= 0.8;
  }

  return createWav(sampleRate, 1, samples);
}

function generatePop(sampleRate = 44100) {
  // Quick balloon pop — sharp attack, fast decay
  const duration = 0.12;
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 40) * (1 - Math.exp(-t * 2000));

    // Noise burst
    samples[i] = (Math.random() * 2 - 1) * env * 0.7;

    // Tonal component (descending pitch)
    const freq = 600 * Math.exp(-t * 15);
    samples[i] += Math.sin(2 * Math.PI * freq * t) * env * 0.4;
  }

  return createWav(sampleRate, 1, samples);
}

function generateWhoosh(sampleRate = 44100) {
  // Swoosh/throw sound — filtered noise sweep
  const duration = 0.25;
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  let filtered = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.sin(Math.PI * t / duration) * 0.6; // Smooth bell curve
    const noise = Math.random() * 2 - 1;

    // Sweeping bandpass (rising pitch)
    const freq = 300 + 3000 * (t / duration);
    const rc = 1 / (2 * Math.PI * freq);
    const alpha = 1 / (1 + sampleRate * rc);

    filtered = filtered + alpha * (noise * env - filtered);
    samples[i] = filtered;

    // Add whistle component
    samples[i] += Math.sin(2 * Math.PI * (400 + 2000 * t / duration) * t) * env * 0.15;
  }

  return createWav(sampleRate, 1, samples);
}

function generateCheer(sampleRate = 44100) {
  // Celebration cheer — layered noise with tonal elements
  const duration = 1.5;
  const length = sampleRate * duration;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attack = 1 - Math.exp(-t * 10);
    const release = t > 1.0 ? Math.exp(-(t - 1.0) * 4) : 1;
    const env = attack * release;

    // Crowd noise (filtered noise)
    const noise = Math.random() * 2 - 1;
    samples[i] = noise * env * 0.25;

    // Bright tonal "aaah" harmonics
    for (const freq of [400, 800, 1200]) {
      samples[i] += Math.sin(2 * Math.PI * freq * t + Math.sin(t * 5) * 0.3) * env * 0.08;
    }

    // Rising tone for excitement
    const riseFreq = 300 + 200 * (t / duration);
    samples[i] += Math.sin(2 * Math.PI * riseFreq * t) * env * 0.1;

    // Shimmer
    samples[i] += Math.sin(2 * Math.PI * 2000 * t) * env * Math.sin(t * 12) * 0.05;
  }

  return createWav(sampleRate, 1, samples);
}

// ---- Splatter PNG generator (using raw PNG) ----

function createSplatterSVG(variant) {
  // Generate SVG splatter and return as data that can be converted
  const colors = ['#FF1493', '#00FFFF', '#FFD700', '#FF6600', '#00FF00'];
  const w = 200, h = 200;
  const cx = w / 2, cy = h / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

  // Central blob with random irregular shape
  const mainR = 30 + variant * 5;
  let points = '';
  const numPoints = 12 + variant * 2;
  for (let i = 0; i < numPoints; i++) {
    const angle = (Math.PI * 2 * i) / numPoints;
    const r = mainR + (seededRandom(variant * 100 + i) - 0.5) * mainR * 0.8;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    points += `${x},${y} `;
  }
  svg += `<polygon points="${points.trim()}" fill="white" opacity="0.9"/>`;

  // Surrounding blobs
  const blobCount = 8 + variant * 2;
  for (let i = 0; i < blobCount; i++) {
    const angle = seededRandom(variant * 200 + i) * Math.PI * 2;
    const dist = 20 + seededRandom(variant * 300 + i) * 50;
    const r = 5 + seededRandom(variant * 400 + i) * 15;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    svg += `<circle cx="${bx}" cy="${by}" r="${r}" fill="white" opacity="${0.5 + seededRandom(variant * 500 + i) * 0.4}"/>`;
  }

  // Small dots radiating out
  const dotCount = 6 + variant * 2;
  for (let i = 0; i < dotCount; i++) {
    const angle = seededRandom(variant * 600 + i) * Math.PI * 2;
    const dist = 50 + seededRandom(variant * 700 + i) * 40;
    const r = 2 + seededRandom(variant * 800 + i) * 4;
    const dx = cx + Math.cos(angle) * dist;
    const dy = cy + Math.sin(angle) * dist;
    svg += `<circle cx="${dx}" cy="${dy}" r="${r}" fill="white" opacity="${0.4 + seededRandom(variant * 900 + i) * 0.4}"/>`;
  }

  svg += '</svg>';
  return svg;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ---- Generate everything ----

console.log('Generating audio assets...');

writeFileSync(join(AUDIO_DIR, 'dhol-beat.wav'), generateDholBeat());
console.log('  ✓ dhol-beat.wav');

writeFileSync(join(AUDIO_DIR, 'splat.wav'), generateSplat());
console.log('  ✓ splat.wav');

writeFileSync(join(AUDIO_DIR, 'pop.wav'), generatePop());
console.log('  ✓ pop.wav');

writeFileSync(join(AUDIO_DIR, 'whoosh.wav'), generateWhoosh());
console.log('  ✓ whoosh.wav');

writeFileSync(join(AUDIO_DIR, 'holi-hai-cheer.wav'), generateCheer());
console.log('  ✓ holi-hai-cheer.wav');

console.log('\nGenerating splatter SVGs...');

for (let i = 1; i <= 5; i++) {
  const svg = createSplatterSVG(i);
  writeFileSync(join(IMAGE_DIR, `splatter-${i}.svg`), svg);
  console.log(`  ✓ splatter-${i}.svg`);
}

console.log('\nAll assets generated!');
