# Model lifecycle management for RangBarse.ai inference server.
# Encapsulates Stable Diffusion pipeline loading, warm-up, and inference.

import logging

from PIL import Image

logger = logging.getLogger("inference")


class ModelManager:
    """Manages the Stable Diffusion img2img pipeline."""

    def __init__(self):
        self.pipe = None

    @property
    def is_loaded(self) -> bool:
        return self.pipe is not None

    def load(self):
        """Load SD 1.5 pipeline and warm up GPU."""
        import torch
        from diffusers import AutoPipelineForImage2Image, DPMSolverMultistepScheduler
        from huggingface_hub import scan_cache_dir

        model_id = "stable-diffusion-v1-5/stable-diffusion-v1-5"

        # Check if model is already cached
        try:
            cache_info = scan_cache_dir()
            cached = any(r.repo_id == model_id for r in cache_info.repos)
        except Exception:
            cached = False

        if cached:
            logger.info("Model found in cache. Loading from disk...")
        else:
            logger.info("Model NOT cached. Downloading ~5GB from HuggingFace (this may take several minutes)...")

        logger.info("Loading SD 1.5 pipeline (canvas-only mode)...")

        self.pipe = AutoPipelineForImage2Image.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            safety_checker=None,
        )

        logger.info("Model downloaded and loaded successfully.")

        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.pipe.scheduler.config
        )
        logger.info(f"Scheduler: {self.pipe.scheduler.__class__.__name__}")

        self.pipe.to("cuda")

        try:
            self.pipe.enable_xformers_memory_efficient_attention()
            logger.info("Using xformers memory-efficient attention")
        except Exception:
            self.pipe.enable_attention_slicing()
            logger.info("Using sliced attention (xformers not available)")

        self._warmup()
        logger.info("Model ready! GPU warm.")

    def _warmup(self):
        """Run a dummy inference to warm GPU caches."""
        logger.info("Warming up GPU...")
        dummy = Image.new("RGB", (512, 512), (128, 128, 128))
        self.pipe(
            prompt="watercolor painting, vibrant, masterpiece",
            negative_prompt="",
            image=dummy,
            num_inference_steps=40,
            strength=0.45,
            guidance_scale=6.5,
        )

    def generate(
        self,
        image: Image.Image,
        prompt: str,
        negative_prompt: str,
        strength: float,
        guidance_scale: float,
        num_inference_steps: int = 40,
    ) -> Image.Image:
        """Run img2img inference. Returns the generated PIL Image."""
        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image,
            num_inference_steps=num_inference_steps,
            strength=strength,
            guidance_scale=guidance_scale,
        ).images[0]
        return result

    def device_info(self) -> dict:
        """Return GPU device info."""
        try:
            import torch
            if torch.cuda.is_available():
                return {
                    "gpu": torch.cuda.get_device_name(0),
                    "vram_allocated": f"{torch.cuda.memory_allocated(0) / 1024**2:.0f} MB",
                }
        except ImportError:
            pass
        return {"gpu": "none", "vram_allocated": "0"}

    @property
    def scheduler_name(self) -> str:
        if self.pipe is not None:
            return self.pipe.scheduler.__class__.__name__
        return "none"
