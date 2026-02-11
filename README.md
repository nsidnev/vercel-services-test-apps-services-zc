# Vercel Multi-Service Dashboard

A monorepo demonstrating Vercel's apps + services layout: a Next.js frontend with three backend services (FastAPI, Flask, Express) that support service-to-service chaining.

## Structure

```
apps/web/          → Next.js 16 dashboard (React 19, Tailwind 4)
services/
  service-fastapi/ → Python (FastAPI, uv)
  service-flask/   → Python (Flask, pipenv)
  service-express/ → Node.js (Express)
```

## Running locally

```bash
VERCEL_USE_EXPERIMENTAL_SERVICES=1 vercel dev
```

This starts all services and the frontend together. The dashboard is available at `http://localhost:3000`.

## Dashboard

- **Top row** — three panels, one per service. Each sends a `GET` request and displays the JSON response.
- **Bottom row** — chain panel. Select services in order, then fire a single request that cascades through each service and returns a nested response.

## Chain protocol

The frontend POSTs to the first service's `/chain` endpoint with the remaining services in the body. Each service forwards to the next until the list is empty, then responses nest on the way back.

```
POST /_/service-fastapi/chain  { "services": ["flask", "express"] }
  → fastapi calls flask/chain  { "services": ["express"] }
    → flask calls express/chain { "services": [] }
    ← { service: "express", next: null }
  ← { service: "flask", next: { express } }
← { service: "fastapi", next: { flask + express } }
```

## Environment variables

Set automatically by `vercel dev`:

| Variable              | Used by                     |
| --------------------- | --------------------------- |
| `SERVICE_FASTAPI_URL` | services (chain forwarding) |
| `SERVICE_FLASK_URL`   | services (chain forwarding) |
| `SERVICE_EXPRESS_URL` | services (chain forwarding) |
| `NEXT_PUBLIC_*_URL`   | frontend (direct calls)     |

## Deployment protection

When [deployment protection](https://vercel.com/docs/deployment-protection) is enabled, service-to-service chain calls include the `x-vercel-protection-bypass` header automatically.
Enable [protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) to allow deployed services to communicate.

## Dev notes

Flask runs in a single Werkzeug process locally, so the dashboard prevents concurrent Flask requests in dev mode (adding Flask to the chain more than once, or sending a direct request while a chain with Flask is running). These restrictions don't apply in production.
