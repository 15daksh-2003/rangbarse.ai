# RangBarse.ai 🎨

A webcam-based Holi game where you dodge and throw virtual color balloons, get covered in digital gulal, and let AI transform your messy selfie into stunning art.

**30 seconds. Dodge. Throw. Get colorful. Let AI do the magic.**

---

## How to Play

1. **Allow camera** — you'll see yourself on screen
2. **Read the rules** and hit **"Let's Go!"**
3. **Dodge** balloons by moving your body (duck, lean left/right)
4. **Catch & throw** — open your palm near a balloon to catch it, flick to throw it back
5. **Get splattered** — balloons that hit you leave colorful gulal on screen
6. **Take snapshots** — tap 📸 during the game (up to 3 mid-game moments)
7. **Game ends at 30s** — pick your best photo, choose an art style
8. **AI transforms** your colorful mess into a styled portrait
9. **Download** your Holi card!

### Scoring

| Action | Points |
|--------|--------|
| Dodge a balloon | +10 |
| Catch & throw a balloon | +25 |
| Get hit | 0 (but you get more colorful!) |

Your **color coverage %** is tracked too. At the end you get a **Holi personality**
based on your play style (The Dodger, The Color Warrior, The Living Canvas, etc.)

### Art Styles

| Style | Look |
|-------|------|
| 🎨 Watercolor Holi | Dreamy soft watercolor painting |
| 🎬 Bollywood Poster | Cinematic with dramatic lighting |
| 🖼️ Rangoli Art | Geometric patterns with vibrant colors |

---

## Setup Guide

### Supported Platforms

| Platform | Supported | Notes |
|----------|-----------|-------|
| **Linux native** (Ubuntu/Fedora) | ✅ Best | Direct NVIDIA driver + CUDA |
| **WSL2 on Windows** | ✅ | GPU passthrough from Windows host |
| macOS | ❌ | No NVIDIA GPU support |

### Prerequisites

- **NVIDIA GPU** with 4+ GB VRAM (Pascal architecture or newer)
- **Node.js 18+** and npm
- **Python 3.10+** and pip
- **CUDA Toolkit 12.x** (installation differs by platform — see below)
- **Chrome or Edge** browser (best MediaPipe support)
- A **webcam**

---

### Step 1: Install NVIDIA Drivers & CUDA

<details>
<summary><strong>🐧 Linux Native (Ubuntu)</strong></summary>

```bash
# Check your GPU is detected
nvidia-smi

# If nvidia-smi works, you have drivers. Now install CUDA toolkit:
# Option A: From NVIDIA (recommended)
# Go to https://developer.nvidia.com/cuda-downloads
# Select: Linux → x86_64 → Ubuntu → your version → deb (local)
# Follow the commands shown

# Option B: Via apt (Ubuntu)
sudo apt update
sudo apt install nvidia-cuda-toolkit

# Verify
nvcc --version
python3 -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

</details>

<details>
<summary><strong>🪟 WSL2 on Windows</strong></summary>

**Important:** The GPU driver setup for WSL2 is different from native Linux.

#### 1. Install NVIDIA Windows Driver (on Windows host)

Download and install the latest **Windows** NVIDIA driver from
[nvidia.com/Download](https://www.nvidia.com/Download/index.aspx).
This is the **only** driver you need. **Do NOT install any Linux NVIDIA driver
inside WSL2** — the Windows driver is automatically shared with WSL2.

#### 2. Install/Update WSL2 (PowerShell, as admin)

```powershell
wsl --install
wsl --update
```

#### 3. Install CUDA Toolkit **inside WSL2** (WSL-Ubuntu variant)

```bash
# Inside your WSL2 Ubuntu terminal:

# Remove old GPG key if present
sudo apt-key del 7fa2af80 2>/dev/null

# Go to https://developer.nvidia.com/cuda-downloads
# Select: Linux → x86_64 → WSL-Ubuntu → 2.0 → deb (local)
# Follow the commands shown there

# CRITICAL: Install ONLY the toolkit, NOT the driver:
# Use: sudo apt install cuda-toolkit-12-x
# Do NOT use: sudo apt install cuda  (this would try to install a Linux driver)

# Verify GPU access from WSL2
nvidia-smi                    # Should show your Windows GPU
python3 -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

> **Note:** If `nvidia-smi` is not found, try `/usr/lib/wsl/lib/nvidia-smi`
> or add `/usr/lib/wsl/lib/` to your PATH.

For full details, see the [NVIDIA CUDA on WSL User Guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html).

#### Key WSL2 differences from native Linux

| Item | Native Linux | WSL2 |
|------|-------------|------|
| NVIDIA driver | Install Linux driver | Use Windows driver (auto-shared) |
| CUDA toolkit | Standard Linux package | WSL-Ubuntu variant (no driver included) |
| nvidia-smi path | `/usr/bin/nvidia-smi` | `/usr/lib/wsl/lib/nvidia-smi` |
| Performance | Native speed | ~95% of native (minimal overhead) |

</details>

---

### Step 2: Clone & Install (Frontend)

```bash
git clone https://github.com/your-username/rangbarse.ai.git
cd rangbarse.ai
npm install
```

### Step 3: Set Up AI Server (Python + GPU)

```bash
cd server
python3 -m venv venv
source venv/bin/activate

# Install PyTorch with CUDA 12.4
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Install remaining dependencies
pip install -r requirements.txt
```

> **First run** downloads ~5GB of model weights from HuggingFace. These are
> cached in `~/.cache/huggingface/` after the first download.

### Step 4: Run Everything

**Terminal 1 — Start AI server:**
```bash
cd server
source venv/bin/activate
python app/server.py
# Waits for model load (~30-60s first time, ~10s when cached)
# Server ready at http://localhost:8000
```

**Terminal 2 — Start web app:**
```bash
npm run dev
# Frontend at http://localhost:5173
# API proxy at http://localhost:3001 → routes to Python server
```

Open `http://localhost:5173` in Chrome. Play!

### How it works

```
Browser (localhost:5173)
  → Vite serves the web app
  → Game runs client-side (MediaPipe, Canvas, Web Audio)
  → POST /api/generate (after game ends)
      → Node proxy (localhost:3001)
          → Python GPU server (localhost:8000)
              → SD 1.5 img2img inference
          → Returns AI-styled image
  → If GPU server is offline → CSS canvas filters (instant, client-side)
```

### Quick commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Node proxy (3001) + Vite frontend (5173) |
| `npm run dev:client` | Frontend only (CSS fallback, no AI) |
| `npm run dev:api` | API proxy only |
| `npm run build` | Production build to `client/dist/` |
| `npm run test` | Run frontend unit + integration tests (Vitest) |
| `npm run test:e2e` | Run browser E2E tests (Playwright) |
| `npm run test:backend` | Run backend tests (pytest) |
| `npm run test:quality` | Run AI art quality tests (GPU required) |
| `npm run test:all` | Run all tests (unit + E2E + backend) |
| `python server/app/server.py` | Start GPU inference server |

---

## Managing the Server

### Starting

```bash
# Terminal 1: GPU server
cd server && source venv/bin/activate && python app/server.py

# Terminal 2: Frontend + API proxy
npm run dev
```

### Stopping

```bash
# Stop the GPU server: Ctrl+C in Terminal 1

# Stop the frontend: Ctrl+C in Terminal 2

# Or kill all at once:
pkill -f "python app/server.py"
pkill -f "node scripts/devServer"
pkill -f "vite"
```

### Checking Status

```bash
# GPU server health
curl http://localhost:8000/health

# API proxy health (includes GPU status, rate limits, concurrency)
curl http://localhost:3001/api/health

# GPU memory usage
nvidia-smi          # Linux native
# or
/usr/lib/wsl/lib/nvidia-smi   # WSL2
```

### Server Logs

Backend logs are saved per session in `server/logs/`:
```
server/logs/
├── session_20260304_173000.log   # Latest session
├── session_20260304_150000.log   # Previous session
└── ...                            # Configurable retention (default: 5)
```

Retention is configurable in `server/app/server_config.py` (`MAX_SESSION_LOGS`).

---

## Debugging

### Frontend
- Open Chrome DevTools → Console for all logs
- Add `?debug=true` to URL for verbose logs (DEBUG level)
- The GPU status badge (top-right corner) shows:
  - 🟢 "AI Ready" — GPU server is responding
  - 🟡 "AI-Lite" — CSS fallback mode (GPU offline)
- Toast notifications appear when GPU status changes

### Backend
- Logs appear in both terminal AND `server/logs/session_*.log`
- Each request includes a `request_id` for tracing
- Check GPU: `curl localhost:8000/health` shows VRAM usage, uptime, requests served
- Common issues:
  - `CUDA out of memory` → restart server, check no other GPU processes running
  - `Model not loaded yet` → server still starting up (~30s first time)

---

## Rate Limits & Configuration

Machine-specific config is in `server.config.json` (gitignored).
Copy from `server.config.example.json` and adjust for your hardware:

```bash
cp server.config.example.json server.config.json
```

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `rateLimit.maxRequests` | 15 | Max API requests per 60s window |
| `concurrency.maxConcurrentInference` | 1 | Parallel GPU inferences (keep at 1 for 4GB VRAM) |
| `concurrency.maxQueueLength` | 5 | Pending requests before rejection |
| `inference.steps` | 8 | Inference steps (pipeline-level, overridden by server style config) |

### Load Testing

Tune your config by running load tests with [Artillery](https://www.artillery.io/):

```bash
# Install Artillery
npm install -g artillery

# Run load test (3 phases: warm-up → sustained → spike)
artillery run scripts/loadtest/loadtest.yml

# Run against a public tunnel URL
artillery run scripts/loadtest/loadtest.yml --target https://your-tunnel-url

# Save JSON report
artillery run scripts/loadtest/loadtest.yml -o report.json

# Monitor GPU during test
watch nvidia-smi
```

**Test phases:** Warm-up (1 req/s, 10s) → Sustained (2 req/s, 30s) → Spike (5 req/s, 10s)

**Scenarios:** 70% health checks, 30% AI generation with payload.

**Interpret results:**
- p95 response > 10s → reduce `maxRequests` or `maxQueueLength`
- Error rate > 5% → increase rate limit window
- GPU OOM → check `nvidia-smi`, restart server

---

## Testing

### Frontend — Unit + Integration (Vitest)

```bash
npm run test              # Run unit + integration tests
npm run test:watch        # Watch mode
```

Coverage is enforced per-module. If any testable module drops below 90%
statements, the test run **fails**.

Covers: AI client, style prompts, CSS filters, balloon physics, spawner patterns,
collision detection, throw engine, scoring, beat detection, canvas manager,
game loop, logger, health monitor.

### Frontend — E2E (Playwright)

```bash
npm run test:e2e          # Run browser E2E tests
```

Uses Chromium with fake webcam. Tests full UI flow: landing, camera,
rules, style picker, engagement screen, result screen, CSS fallback badge.

### Backend (pytest)

Requires the server venv:

```bash
cd server
source venv/bin/activate
pip install pytest pytest-asyncio httpx anyio   # First time only
python -m pytest tests/ -v
```

Covers: style config, image utilities, model manager, quality framework,
health endpoint, integration tests (all styles, strength override, coverage boost).
GPU-dependent tests auto-skip when torch is not available.

### AI Art Quality Testing

Verify AI image generation quality after changing prompts, strengths, blend modes,
or inference parameters:

```bash
cd server && source venv/bin/activate

# Run all 3 styles (generates images + automated sanity checks)
python scripts/run_quality_tests.py

# Test a single style
python scripts/run_quality_tests.py --style watercolor

# Use a custom scene canvas image
python scripts/run_quality_tests.py --image /path/to/scene.png

# Re-run checks on existing outputs (no GPU needed)
python scripts/run_quality_tests.py --skip-inference

# Or from project root:
npm run test:quality
```

**Two-tier verification:**

| Tier | What it checks |
|------|----------------|
| **Automated** | Not blank, valid dimensions, color diversity, file size, cross-style differentiation (perceptual hash) |
| **Manual** | Dev reviews generated images: person visible, artistic transformation, lighting applied, styles distinct |

Outputs are saved to `server/test-results/quality/run_<timestamp>/` with a `REPORT.md`
containing automated results and a manual inspection checklist. Old runs are
automatically cleaned up (configurable, default: keep last 5).

**When to run:** After changing anything in `server/app/style_config.py`,
`client/src/config.js` (BLEND_MODES), `server/app/image_utils.py`,
or `client/src/render/canvasManager.js`.

### Run Everything

```bash
npm run test:all       # Unit + E2E + Backend
```

### Security Scanning

```bash
npm run scan:secrets   # Gitleaks credential leak scanner
```

### Test Summary

| Layer | Tool | Command |
|-------|------|---------|
| Frontend unit + integration | Vitest | `npm test` |
| Frontend E2E (browser) | Playwright | `npm run test:e2e` |
| Backend unit + integration | pytest | `npm run test:backend` |
| AI art quality | Quality framework | `npm run test:quality` |
| Load testing | Artillery | `artillery run scripts/loadtest/loadtest.yml` |
| Secrets scan | Gitleaks | `npm run scan:secrets` |

---

## Optional: Public Access via Cloudflare Tunnel

Expose your local setup to the internet (free, no port forwarding needed):

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Quick temporary URL (free, no account needed):
cloudflared tunnel --url http://localhost:5173

# This gives you: https://random-slug.trycloudflare.com
# Share the URL — anyone can play while your machine is running
```

For a custom domain, set up a named tunnel in the Cloudflare dashboard.

---

## Docker Setup (Alternative)

Docker provides a one-command setup that eliminates CUDA/PyTorch/Python
version management. The dev workflow (`npm run dev`) still works as before —
Docker is an alternative for reproducible deployments.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (with Docker Compose v2)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
  (for GPU inference)
- NVIDIA GPU with 4+ GB VRAM

**Verify GPU is accessible from Docker:**
```bash
docker run --rm --runtime=nvidia --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

### Quick Start

```bash
# Clone and start everything
git clone https://github.com/your-username/rangbarse.ai.git
cd rangbarse.ai

# First run: use foreground mode to see model download progress (~5GB)
docker compose up --build

# Subsequent runs: start in background (model already cached)
docker compose up -d

# Open http://localhost in your browser
```

> **First run note:** The GPU container downloads the SD 1.5 model (~5GB)
> on first start. Run in foreground (`docker compose up`, without `-d`)
> to see download progress in real time. Subsequent starts are instant.

### With Cloudflare Tunnel (Public Access)

```bash
# Start app + tunnel (gives you a public https://...trycloudflare.com URL)
docker compose --profile tunnel up --build
```

### Container Lifecycle

```bash
# --- Starting ---

# First run: foreground mode to see model download progress (~5GB)
docker compose up --build

# Subsequent runs: background (model cached, instant start)
docker compose up -d --build

# Start with Cloudflare tunnel
docker compose --profile tunnel up -d --build

# Monitor model download on first run (if started in background)
docker compose logs -f python-gpu

# --- Monitoring ---

# Follow all logs (color-coded by service)
docker compose logs -f

# Follow a specific service
docker compose logs -f python-gpu

# Check container health status
docker compose ps

# GPU status from inside container
docker exec rangbarse-python-gpu nvidia-smi

# API health check
curl http://localhost/api/health

# --- Stopping ---

# Stop all services (keeps images, volumes, and cached model)
docker compose down

# Stop including tunnel profile
docker compose --profile tunnel down

# --- Cleanup ---

# Remove containers + named volumes (re-downloads ~5GB model next start)
docker compose down -v

# Remove built images (forces full rebuild next start)
docker compose down --rmi local

# Full cleanup: containers + volumes + images + orphans
docker compose down -v --rmi local --remove-orphans

# Remove only dangling/unused Docker build cache
docker builder prune
```

### Debugging in Docker

| What | Command |
|------|---------|
| All logs (live) | `docker compose logs -f` |
| GPU server logs | `docker compose logs -f python-gpu` |
| Node proxy logs | `docker compose logs -f node-proxy` |
| nginx access logs | `docker compose logs -f nginx` |
| Trace a request ID | `docker compose logs \| grep "request-id"` |
| GPU memory | `docker exec rangbarse-python-gpu nvidia-smi` |
| Session log files | `ls server/logs/session_*.log` (volume-mounted) |
| Container health | `docker compose ps` |
| API health check | `curl http://localhost/api/health` |

### Load Testing (Docker)

Same Artillery config, different target:

```bash
# Against Docker nginx (port 80)
artillery run scripts/loadtest/loadtest.yml --target http://localhost

# Against Cloudflare tunnel
artillery run scripts/loadtest/loadtest.yml --target https://your.trycloudflare.com
```

### Architecture

```
http://localhost:80 (nginx)
  ├── / → Static files (Vite build output)
  └── /api/* → node-proxy:3001
                  ├── Rate limiting (15 req/60s)
                  ├── Concurrency gate (1 active + 5 queue)
                  └── → python-gpu:8000 (SD 1.5 inference)

Optional: cloudflared → nginx:80 (Cloudflare tunnel sidecar)
```

All services communicate via Docker internal network. Only port 80 is
exposed to the host.

### Model Cache

The SD 1.5 model (~5GB) is **not baked into the Docker image**. It's
downloaded on first run and stored in a Docker named volume (`huggingface-cache`).

**Default: Named Docker volume** (clean isolation, recommended for fresh setups)
```bash
# Model downloads into the named volume on first start (~5GB, takes a few minutes)
docker compose up --build

# Volume persists across container restarts
docker compose down && docker compose up     # instant start, model cached

# WARNING: this deletes the volume and requires re-downloading the model
docker compose down -v
```

**Opt-in: Host bind mount** (reuse existing cache from bare-metal setup)
```bash
# If you've already run the server bare-metal, reuse the host cache:
HF_CACHE_DIR=~/.cache/huggingface docker compose up

# Or a custom path:
HF_CACHE_DIR=/fast-ssd/hf-cache docker compose up
```

To use host bind mount permanently, edit `docker-compose.yml`:
```yaml
# Replace:
  - huggingface-cache:/root/.cache/huggingface
# With:
  - ~/.cache/huggingface:/root/.cache/huggingface
```

**When to use which:**

| Scenario | Recommended | Why |
|----------|-------------|-----|
| Fresh setup, no prior ML work | Named volume (default) | Clean isolation, no host path assumptions |
| Already have cached models from bare-metal | Host bind mount | Skip ~5GB download |
| Multiple projects sharing models | Host bind mount | Shared cache saves disk |
| CI/CD or disposable environments | Named volume | Self-contained, no host deps |

### Troubleshooting Docker Setup

<details>
<summary><strong>GPU not accessible from Docker</strong></summary>

**Symptom:** `docker compose up` fails with `could not select device driver "" with capabilities: [[gpu]]`

**Fix:** Install the NVIDIA Container Toolkit:

```bash
# Add NVIDIA apt repo
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install and configure
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

</details>

<details>
<summary><strong>nvidia-smi not found (WSL2)</strong></summary>

On WSL2, `nvidia-smi` is at `/usr/lib/wsl/lib/nvidia-smi`, not on `$PATH`.
The GPU driver comes from the **Windows host** — do NOT install Linux NVIDIA
drivers inside WSL2. Docker GPU passthrough works via the Windows driver.

```bash
/usr/lib/wsl/lib/nvidia-smi    # Run this instead
```

</details>

<details>
<summary><strong>GPU container unhealthy / model download slow</strong></summary>

**Symptom:** `dependency failed to start: container rangbarse-python-gpu is unhealthy`

The SD 1.5 model (~5GB) downloads on first run. The health check has a 600s
(10 min) start period, but slow connections may exceed this.

**Options:**
1. **Increase the health check start period** in `docker-compose.yml`:
   ```yaml
   start_period: 1200s   # 20 minutes
   ```
2. **Use host bind mount** to reuse a pre-cached model:
   ```bash
   HF_CACHE_DIR=~/.cache/huggingface docker compose up
   ```
3. **Pre-download the model** bare-metal, then bind-mount:
   ```bash
   pip install diffusers transformers
   python -c "from diffusers import AutoPipelineForImage2Image; AutoPipelineForImage2Image.from_pretrained('stable-diffusion-v1-5/stable-diffusion-v1-5')"
   HF_CACHE_DIR=~/.cache/huggingface docker compose up
   ```

</details>

<details>
<summary><strong>Python package version conflicts in GPU container</strong></summary>

**Background:** Versions in `server/requirements.txt` are pinned for
compatibility. If you need to update packages, test these constraints:

- `diffusers`, `transformers`, `peft`, and `accelerate` must be version-compatible
- `torch` and `torchvision` must match (installed together via `--index-url`)
- `xformers` is excluded — it tends to pull incompatible torch versions.
  The server falls back to attention slicing automatically.

**If you see import errors after changing versions:**
```bash
# Test imports inside the container:
docker run --rm --gpus all rangbarseai-python-gpu python3 -c "
import torch; print('torch', torch.__version__, 'CUDA:', torch.cuda.is_available())
from diffusers import AutoPipelineForImage2Image; print('diffusers OK')
from transformers import PreTrainedModel; print('transformers OK')
"
```

</details>

<details>
<summary><strong>Hash mismatch errors during docker build</strong></summary>

**Symptom:** `THESE PACKAGES DO NOT MATCH THE HASHES FROM THE REQUIREMENTS FILE`

This is a transient PyPI CDN issue. Simply retry the build:
```bash
docker compose build python-gpu --no-cache
```

</details>

---

## Project Structure

```
rangbarse.ai/
├── client/                    # Frontend (Vite + JS)
│   ├── src/                   # Application source (game, render, audio, AI, UI)
│   ├── tests/                 # Frontend tests (unit, integration, E2E)
│   ├── public/assets/         # Audio + image assets
│   └── vite.config.js
├── server/                    # Backend (Python + GPU)
│   ├── app/
│   │   ├── server.py          # FastAPI server (routes + lifespan)
│   │   ├── style_config.py    # Style prompts, strengths, guidance
│   │   ├── model_manager.py   # SD pipeline lifecycle
│   │   ├── image_utils.py     # Base64 decode, resize, encode
│   │   └── server_config.py   # Retention settings (logs, artifacts)
│   ├── quality/               # AI art quality testing framework
│   ├── tests/                 # Backend tests (pytest)
│   ├── scripts/               # Quality test CLI + legacy verify script
│   ├── logs/                  # Per-session log files (gitignored)
│   └── requirements.txt
├── scripts/
│   ├── devServer.js           # Node.js API proxy (rate limit + concurrency)
│   ├── generateAssets.js      # Procedural audio + SVG generation
│   └── loadtest/              # Load testing configs (Artillery)
├── nginx/
│   └── nginx.conf             # Production reverse proxy config
├── Dockerfile.frontend        # Multi-stage: Vite build → nginx
├── Dockerfile.proxy           # Node.js Express proxy container
├── Dockerfile.gpu             # Python FastAPI + CUDA container
├── docker-compose.yml         # Production orchestration (4 services)
├── .dockerignore              # Build context exclusions
├── server.config.example.json # Machine-specific config template
└── README.md
```

## Tech Stack

- **Stable Diffusion 1.5** — AI art generation on local GPU
- **MediaPipe** — Real-time body pose + hand tracking in the browser
- **HTML5 Canvas** — Balloon rendering, splatter effects, drip physics
- **Web Audio API** — DJ Dhol music playback with beat-synced gameplay
- **Web Speech API** — Voice recognition ("Holi Hai!" trigger)
- **FastAPI + PyTorch** — Python GPU inference server
- **Vite** — Frontend bundler
- **Express** — Node.js API proxy

## Configuration

### Server Retention Settings (`server/app/server_config.py`)

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_SESSION_LOGS` | 5 | Server session logs to keep (older auto-deleted) |
| `MAX_QUALITY_ARTIFACTS` | 5 | Quality test run directories to keep |
