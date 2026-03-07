"""
Backend tests for RangBarse.ai inference server.

These tests require the GPU server dependencies (torch, diffusers, etc.).
Run from the server venv:
    cd server && source venv/bin/activate && python -m pytest tests/ -v

Without GPU deps, tests will be skipped automatically.
"""
import pytest
import sys
import os

# Add server dir to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def _try_import_app():
    """Try to import the FastAPI app. Returns (app, error_msg)."""
    try:
        from app.server import app
        return app, None
    except ImportError as e:
        return None, str(e)


# --- Tests that always run (no GPU needed) ---

def test_server_file_exists():
    """server.py exists and is readable."""
    path = os.path.join(os.path.dirname(__file__), '..', 'app', 'server.py')
    assert os.path.isfile(path)


def test_requirements_file_exists():
    """requirements.txt exists."""
    path = os.path.join(os.path.dirname(__file__), '..', 'requirements.txt')
    assert os.path.isfile(path)


def test_log_directory_exists():
    """logs/ directory exists."""
    path = os.path.join(os.path.dirname(__file__), '..', 'logs')
    assert os.path.isdir(path)


def test_extracted_modules_exist():
    """Extracted modules exist and are importable (without GPU deps)."""
    modules_dir = os.path.join(os.path.dirname(__file__), '..', 'app')
    for module in ['style_config.py', 'image_utils.py', 'model_manager.py', 'server_config.py']:
        assert os.path.isfile(os.path.join(modules_dir, module)), f"Missing {module}"


def test_quality_module_exists():
    """Quality testing module exists."""
    quality_dir = os.path.join(os.path.dirname(__file__), '..', 'quality')
    assert os.path.isdir(quality_dir)
    for module in ['__init__.py', 'config.py', 'test_data.py', 'compositor.py', 'checklist.py', 'runner.py', 'report.py']:
        assert os.path.isfile(os.path.join(quality_dir, module)), f"Missing quality/{module}"


# --- Tests that require GPU dependencies ---

@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_endpoint_shape():
    """Health endpoint returns expected fields."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"Server import failed (GPU deps missing): {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data
        assert "gpu" in data
        assert "uptime_seconds" in data
        assert "requests_served" in data


@pytest.mark.anyio
async def test_generate_missing_image():
    """Generate endpoint rejects requests without image."""
    app, err = _try_import_app()
    if app is None:
        pytest.skip(f"Server import failed (GPU deps missing): {err}")

    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/generate", json={"style": "watercolor"})
        assert response.status_code == 422  # Pydantic validation error
