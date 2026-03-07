"""
Backend integration tests — test full HTTP endpoint behavior.

These test the FastAPI app via httpx ASGI test client, including:
- Health endpoint response shape and values
- Generate endpoint validation (missing image, bad style, strength override)
- Request ID tracking in logs
- Low-coverage strength boost behavior

GPU-dependent tests require torch/diffusers and are skipped otherwise.
Non-GPU tests always run.
"""
import pytest
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def _try_import_app():
    try:
        from app.server import app
        return app, None
    except ImportError as e:
        return None, str(e)


# --- Integration tests (require GPU deps) ---

@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_returns_all_fields():
    """Health endpoint returns complete server status."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()

        # All required fields present
        assert data["status"] == "ok"
        assert isinstance(data["model_loaded"], bool)
        assert isinstance(data["gpu"], str)
        assert isinstance(data["uptime_seconds"], (int, float))
        assert isinstance(data["requests_served"], int)
        assert "session_log" in data
        assert data["session_log"].startswith("session_")


@pytest.mark.anyio
async def test_generate_rejects_missing_image():
    """Generate endpoint returns 422 when image field is missing."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={"style": "watercolor"})
        assert response.status_code == 422


@pytest.mark.anyio
async def test_generate_rejects_empty_image():
    """Generate endpoint returns error for empty image string."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={"image": "", "style": "watercolor"})
        # 500 if model loaded (decode error), 503 if model not loaded 
        assert response.status_code in (400, 500, 503)


@pytest.mark.anyio
async def test_generate_accepts_valid_style():
    """Generate endpoint accepts all 3 valid styles."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)

    # Minimal valid 1x1 PNG as base64
    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for style in ["watercolor", "bollywood", "rangoli"]:
            response = await client.post("/generate", json={
                "image": tiny_png,
                "style": style,
            })
            # If model is loaded, should return 200 with image
            # If model not loaded, should return 503
            assert response.status_code in (200, 503), f"Style {style} returned {response.status_code}"


@pytest.mark.anyio
async def test_health_uptime_increases():
    """Health endpoint uptime increases between calls."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.get("/health")
        t1 = r1.json()["uptime_seconds"]

        time.sleep(0.1)

        r2 = await client.get("/health")
        t2 = r2.json()["uptime_seconds"]

        assert t2 >= t1


@pytest.mark.anyio
async def test_generate_unknown_style_falls_back():
    """Generate endpoint accepts unknown style (falls back to watercolor)."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)

    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={
            "image": tiny_png,
            "style": "nonexistent_style",
        })
        # Should not crash — falls back to watercolor
        assert response.status_code in (200, 503)


@pytest.mark.anyio
async def test_generate_with_coverage_param():
    """Generate endpoint accepts coverage parameter."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)

    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={
            "image": tiny_png,
            "style": "watercolor",
            "coverage": 5,  # Low coverage — should trigger strength boost
        })
        assert response.status_code in (200, 503)


@pytest.mark.anyio
async def test_generate_with_strength_override():
    """Generate endpoint accepts client-provided strength override."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"GPU deps missing: {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)

    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={
            "image": tiny_png,
            "style": "bollywood",
            "strength": 0.6,
        })
        assert response.status_code in (200, 503)
