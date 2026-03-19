// RangBarse.ai — Node API Proxy
// Routes /api/generate to local Python GPU server (port 8000)
// Includes rate limiting, concurrency gating, and health checks
// Config loaded from server.config.json (gitignored) or defaults

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// --- Load config ---
const CONFIG_PATH = new URL('../server.config.json', import.meta.url).pathname;
const EXAMPLE_PATH = new URL('../server.config.example.json', import.meta.url).pathname;
let config;
try {
  config = JSON.parse(readFileSync(existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_PATH, 'utf-8'));
} catch {
  config = { rateLimit: { windowMs: 60000, maxRequests: 15 }, concurrency: { maxConcurrentInference: 1, maxQueueLength: 5 }, inference: { url: 'http://localhost:8000' } };
}

const PYTHON_SERVER = process.env.INFERENCE_URL || config.inference?.url || 'http://localhost:8000';

// --- Concurrency Gate ---
class ConcurrencyGate {
  constructor(maxConcurrent, maxQueue) {
    this.active = 0;
    this.queue = [];
    this.maxConcurrent = maxConcurrent;
    this.maxQueue = maxQueue;
  }

  acquire() {
    return new Promise((resolve, reject) => {
      if (this.active < this.maxConcurrent) {
        this.active++;
        resolve();
      } else if (this.queue.length < this.maxQueue) {
        this.queue.push({ resolve, reject });
      } else {
        reject(new Error('Queue full'));
      }
    });
  }

  release() {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.active++;
      next.resolve();
    }
  }
}

const gate = new ConcurrencyGate(
  config.concurrency?.maxConcurrentInference ?? 1,
  config.concurrency?.maxQueueLength ?? 5
);

// --- Rate Limiter (simple in-memory) ---
const rateState = { requests: [], windowMs: config.rateLimit?.windowMs ?? 60000, max: config.rateLimit?.maxRequests ?? 15 };

function checkRateLimit() {
  const now = Date.now();
  rateState.requests = rateState.requests.filter(t => now - t < rateState.windowMs);
  if (rateState.requests.length >= rateState.max) return false;
  rateState.requests.push(now);
  return true;
}

// --- Express App ---
const app = express();
app.use(express.json({ limit: '10mb' }));

async function isLocalAIRunning() {
  try {
    const res = await fetch(`${PYTHON_SERVER}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

app.post('/api/generate', async (req, res) => {
  const { image, style } = req.body;
  if (!image) return res.status(400).json({ error: 'Missing image' });

  // Rate limit
  if (!checkRateLimit()) {
    console.log('[API] Rate limit exceeded');
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  // Check GPU availability
  const available = await isLocalAIRunning();
  if (!available) {
    return res.status(503).json({ error: 'GPU server offline', message: 'CSS fallback active' });
  }

  // Concurrency gate
  try {
    await gate.acquire();
  } catch {
    console.log('[API] Queue full, rejecting');
    return res.status(503).json({ error: 'Server busy. Try again shortly.' });
  }

  try {
    console.log(`[API] Generating (style=${style}, queue=${gate.queue.length}, active=${gate.active})`);
    const response = await fetch(`${PYTHON_SERVER}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, style: style || 'watercolor', strength: config.inference?.strength ?? 0.3 }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[API] Success! ${resultBuffer.length} bytes`);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(resultBuffer);
  } catch (error) {
    console.error(`[API] Error: ${error.message}`);
    return res.status(500).json({ error: 'Generation failed', message: error.message });
  } finally {
    gate.release();
  }
});

app.get('/api/health', async (req, res) => {
  const local = await isLocalAIRunning();
  res.json({
    localGPU: local,
    rateLimit: { remaining: rateState.max - rateState.requests.length, max: rateState.max },
    concurrency: { active: gate.active, queued: gate.queue.length, max: gate.maxConcurrent },
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[API] Dev server at http://localhost:${PORT}`);
  console.log(`[API] GPU server: ${PYTHON_SERVER}`);
  console.log(`[API] Rate limit: ${rateState.max} req/${rateState.windowMs / 1000}s`);
  console.log(`[API] Concurrency: ${gate.maxConcurrent} active, ${gate.maxQueue} queued max`);
  isLocalAIRunning().then(ok => {
    console.log(`[API] GPU: ${ok ? '✓ connected' : '✗ offline (CSS fallback)'}`);
  });

  // When launched with --with-vite, also start the Vite dev server
  if (process.argv.includes('--with-vite')) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const viteBin = resolve(root, 'node_modules', '.bin', 'vite');
    const vite = spawn(process.execPath, [viteBin, '--config', 'client/vite.config.js'], {
      cwd: root,
      stdio: 'inherit',
    });
    vite.on('error', (err) => console.error(`[Vite] Failed to start: ${err.message}`));
    process.on('SIGINT', () => { vite.kill(); process.exit(); });
    process.on('SIGTERM', () => { vite.kill(); process.exit(); });
  }
});
