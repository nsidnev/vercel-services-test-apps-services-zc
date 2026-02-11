import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(root_path=os.getenv("VERCEL_SERVICE_BASE_PATH") or "/_/service-fastapi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_ENV_MAP = {
    "fastapi": "SERVICE_FASTAPI_URL",
    "flask": "SERVICE_FLASK_URL",
    "express": "SERVICE_EXPRESS_URL",
}

router = APIRouter()


@router.get("/")
def root():
    return {
        "service": "fastapi",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "Hello from FastAPI!",
    }


@router.post("/chain")
async def chain(request: Request):
    body = await request.json()
    services = body.get("services", [])
    next_result = None

    if services:
        next_service = services[0]
        remaining = services[1:]
        env_var = SERVICE_ENV_MAP.get(next_service)
        url = os.environ.get(env_var or "")

        if url:
            try:
                headers = {}
                bypass = os.environ.get("VERCEL_AUTOMATION_BYPASS_SECRET")
                if bypass:
                    headers["x-vercel-protection-bypass"] = bypass
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        f"{url}/chain",
                        json={"services": remaining},
                        headers=headers,
                        timeout=10.0,
                    )
                    resp.raise_for_status()
                    next_result = resp.json()
            except Exception as e:
                next_result = {"error": str(e), "service": next_service}
        else:
            next_result = {
                "error": f"No URL configured for {next_service}",
                "service": next_service,
            }

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "fastapi",
        "next": next_result,
    }


app.include_router(router)
