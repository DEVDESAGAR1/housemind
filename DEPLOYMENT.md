# HouseMind Production Deployment & Operations Guide

HouseMind is designed to run in containerized serverless environments (such as Google Cloud Run) backed by Firebase Authentication, Cloud Firestore, and Google Cloud Secret Manager.

---

## 1. Build & Packaging

HouseMind uses a unified build pipeline that produces:
1. Static client assets via Vite into `dist/`
2. Bundled Node.js backend server via esbuild into `dist/server.cjs`

```bash
# Production Build Command
npm run build

# Starts the compiled full-stack server
node dist/server.cjs
```

---

## 2. Configuration & Secret Inventory

| Configuration Name | Type | Sensitive? | Production Storage / Injection Mechanism |
| :--- | :--- | :--- | :--- |
| `PORT` | Public Runtime | No | Cloud Run standard environment (default: `3000`) |
| `NODE_ENV` | Public Runtime | No | Cloud Run environment (`production`) |
| `ALLOWED_ORIGINS` | Public Runtime | No | Optional comma-separated CORS allowed origins |
| `GEMINI_MODEL` | Server Config | No | Optional model override (default: `gemini-2.5-flash`) |
| `Firebase Web Config` | Public Web Config | No | `firebase-applet-config.json` (Required by Firebase Web SDK) |
| `GEMINI_API_KEY` | **True Server Secret** | **Yes** | **Google Cloud Secret Manager** (`housemind-gemini-api-key`) |
| `Firebase Admin ADC` | Server Identity | **Yes** | Cloud Run Attached Service Account IAM |

---

## 3. Google Cloud Secret Manager Setup

### Step 1: Create the Secret in Secret Manager
```bash
# Set your active Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Create the secret container
gcloud secrets create housemind-gemini-api-key \
  --replication-policy="automatic" \
  --labels=app=housemind,tier=production

# Add the secret version payload (do NOT echo secret in shell history)
gcloud secrets versions add housemind-gemini-api-key --data-file=-
```

### Step 2: Grant Least-Privilege IAM to Cloud Run
Grant `roles/secretmanager.secretAccessor` strictly to the Cloud Run runtime service account:
```bash
gcloud secrets add-iam-policy-binding housemind-gemini-api-key \
  --member="serviceAccount:housemind-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Run Deployment

Deploy HouseMind with native Secret Manager environment variable binding:

```bash
# Build & submit container image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/housemind:latest

# Deploy to Cloud Run with Secret Manager injection
gcloud run deploy housemind \
  --image gcr.io/YOUR_PROJECT_ID/housemind:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account="housemind-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --set-secrets="GEMINI_API_KEY=housemind-gemini-api-key:latest" \
  --set-env-vars="NODE_ENV=production,PORT=3000" \
  --memory=1Gi \
  --cpu=1
```

---

## 5. Secret Rotation Procedure

When rotating the Gemini API key:
1. **Create New Secret Version**:
   ```bash
   gcloud secrets versions add housemind-gemini-api-key --data-file=-
   ```
2. **Deploy Service Revision** (or let `:latest` resolve on next container instance start):
   ```bash
   gcloud run services update housemind \
     --region us-central1 \
     --update-secrets="GEMINI_API_KEY=housemind-gemini-api-key:latest"
   ```
3. **Verify Health & Inference**:
   Verify `/api/health` returns `healthy` and Copilot queries function accurately.
4. **Disable & Destroy Old Version**:
   ```bash
   gcloud secrets versions disable OLD_VERSION_NUMBER --secret=housemind-gemini-api-key
   gcloud secrets versions destroy OLD_VERSION_NUMBER --secret=housemind-gemini-api-key
   ```

---

## 6. Reverse Proxy & Security Settings

- **Port & Host**: Bind to `0.0.0.0:3000`.
- **Trust Proxy**: Configured via `app.set('trust proxy', 1)` to accurately resolve client IP addresses through ingress load balancers.
- **Security Headers**: Managed automatically by Helmet (HSTS, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy).
- **Graceful Shutdown**: SIGTERM and SIGINT listeners flush connections cleanly before container termination.
