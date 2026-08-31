# HouseMind Production Deployment & Operations Guide

HouseMind is designed to run in containerized serverless environments (such as Google Cloud Run) with Firebase Authentication and Cloud Firestore backends.

---

## 1. Build & Packaging

HouseMind uses a unified build script that generates:
1. Static client assets via Vite into `dist/`
2. Bundled Node.js backend server via esbuild into `dist/server.cjs`

```bash
# Production Build Command
npm run build
```

Production Start Command:
```bash
# Starts the compiled full-stack server
node dist/server.cjs
```

---

## 2. Environment Variables

| Variable | Description | Required | Sensitive |
| :--- | :--- | :--- | :--- |
| `PORT` | Server listening port (default: 3000) | No | No |
| `NODE_ENV` | Environment identifier (`production`, `development`) | No | No |
| `GEMINI_API_KEY` | Google Gemini API Key for Copilot & OCR | Yes | Yes (Server-only) |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | Yes | No |
| `FIREBASE_CONFIG` | Firebase Admin SDK configuration payload | Yes | Yes (Server-only) |

---

## 3. Reverse Proxy & Container Settings

- **Port & Host**: Bind to `0.0.0.0:3000`.
- **Trust Proxy**: Configured via `app.set('trust proxy', 1)` to accurately resolve client IP addresses through ingress load balancers.
- **Security Headers**: Managed automatically by Helmet (HSTS, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy).
- **Graceful Shutdown**: SIGTERM and SIGINT listeners properly flush open connections before termination.
