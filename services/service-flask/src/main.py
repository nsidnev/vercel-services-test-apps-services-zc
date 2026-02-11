import os
from datetime import datetime, timezone

import httpx
from flask import Blueprint, Flask, request, jsonify

app = Flask(__name__)
bp = Blueprint(
    "bp",
    __name__,
    url_prefix=os.getenv("VERCEL_SERVICE_BASE_PATH") or "/_/service-flask",
)

SERVICE_ENV_MAP = {
    "fastapi": "SERVICE_FASTAPI_URL",
    "flask": "SERVICE_FLASK_URL",
    "express": "SERVICE_EXPRESS_URL",
}


@bp.route("/")
def read_root():
    return jsonify(
        {
            "service": "flask",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Hello from Flask!",
        }
    )


@bp.route("/chain", methods=["POST"])
def chain():
    body = request.get_json(force=True)
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
                resp = httpx.post(
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

    return jsonify(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "flask",
            "next": next_result,
        }
    )


app.register_blueprint(bp)
