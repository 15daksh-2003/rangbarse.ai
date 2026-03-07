# AI Inference Server for RangBarse.ai
# Canvas-only img2img: transforms splatters on ambient map, not the person.

import os
import glob
import time
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from app.server_config import MAX_SESSION_LOGS
from app.style_config import (
    NEGATIVE_PROMPT,
    DEFAULT_INFERENCE_STEPS,
    get_style_config,
    resolve_strength,
)
from app.model_manager import ModelManager
from app.image_utils import decode_base64_image, resize_for_inference, encode_image_to_png

# --- Session Logging Setup ---
LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

existing_logs = sorted(glob.glob(os.path.join(LOG_DIR, 'session_*.log')))
for old_log in existing_logs[:-MAX_SESSION_LOGS]:
    try:
        os.remove(old_log)
    except OSError:
        pass

session_log_file = os.path.join(LOG_DIR, f'session_{datetime.now():%Y%m%d_%H%M%S}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(session_log_file),
    ]
)
logger = logging.getLogger("inference")
logger.info(f"Session log: {session_log_file}")

# --- Server State ---
model = ModelManager()
start_time = time.time()
requests_served = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    model.load()
    yield
    logger.info("Shutting down.")


# --- FastAPI App ---

app = FastAPI(title="RangBarse AI Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    image: str        # base64 PNG — scene canvas (splatters on ambient map)
    style: str = "watercolor"
    coverage: int = 50  # splatter coverage %; used for low-coverage strength boost
    prompt: str = ""    # ignored — server prompts are authoritative
    strength: float = 0.0  # 0 = use per-style default


@app.post("/generate")
async def generate(req: GenerateRequest, request: Request):
    global requests_served
    if not model.is_loaded:
        raise HTTPException(503, "Model not loaded yet")

    request_id = request.headers.get("X-Request-ID", f"req_{int(time.time()*1000)}")

    try:
        input_image = decode_base64_image(req.image)
        input_image = resize_for_inference(input_image)

        style_cfg = get_style_config(req.style)
        strength = resolve_strength(req.style, req.strength, req.coverage)
        guidance = style_cfg.guidance_scale

        logger.info(f"[{request_id}] Generating: style={req.style}, strength={strength}, guidance={guidance}, coverage={req.coverage}%")
        t0 = time.time()

        result = model.generate(
            image=input_image,
            prompt=style_cfg.prompt,
            negative_prompt=NEGATIVE_PROMPT,
            strength=strength,
            guidance_scale=guidance,
            num_inference_steps=DEFAULT_INFERENCE_STEPS,
        )

        png_bytes = encode_image_to_png(result)

        elapsed = (time.time() - t0) * 1000
        requests_served += 1
        logger.info(f"[{request_id}] Done in {elapsed:.0f}ms, {len(png_bytes)} bytes, total_served={requests_served}")
        return Response(content=png_bytes, media_type="image/png")

    except Exception as e:
        logger.error(f"[{request_id}] Generation error: {e}")
        raise HTTPException(500, f"Generation failed: {str(e)}")


@app.get("/health")
async def health():
    device = model.device_info()
    return {
        "status": "ok",
        "model_loaded": model.is_loaded,
        "gpu": device["gpu"],
        "vram_allocated": device["vram_allocated"],
        "uptime_seconds": round(time.time() - start_time, 1),
        "requests_served": requests_served,
        "session_log": os.path.basename(session_log_file),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
