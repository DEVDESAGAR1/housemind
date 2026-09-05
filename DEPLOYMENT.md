# HouseMind Production Deployment & Operations Guide

> **Target Platform:** Google Cloud Run (Serverless Container)  
> **Runtime Security:** Google Cloud Secret Manager (`roles/secretmanager.secretAccessor`)  
> **Container Base:** Node.js 20 Alpine / Debian Slim on Port 3000

---

## 1. Build & Packaging Architecture

HouseMind compiles both the client-side SPA and server-side backend into a production-optimized, self-contained distribution:

```bash
# 1. Single-Command Production Build
npm run build
```

This execution runs:
- `vite build`: Bundles the React 19 client application, stylesheets, and assets into static files in `dist/`.
- `esbuild server.ts`: Bundles the Express TypeScript backend into CommonJS format at `dist/server.cjs` with external package references, eliminating runtime ESM loader resolution overhead.

To launch the compiled server locally or inside a container:
```bash
node dist/server.cjs
```

---

## 2. Configuration & Secret Inventory

| Variable / Resource | Sensitivity | Purpose | Production Injection Mechanism |
| :--- | :--- | :--- | :--- |
| `PORT` | Public | HTTP port for incoming ingress | Cloud Run standard environment (default: `3000`) |
| `NODE_ENV` | Public | Environment indicator | Cloud Run environment variable (`production`) |
| `ALLOWED_ORIGINS` | Public | Comma-separated list of trusted CORS domains | Optional Cloud Run environment variable |
| `GEMINI_MODEL` | Public | Target Gemini model alias | Cloud Run environment variable (default: `gemini-2.5-flash`) |
| `GA4 Measurement ID` | Public | Anonymous client-side telemetry ID | Optional Vite public variable (`VITE_GA4_MEASUREMENT_ID`) |
| `Firebase Web Config` | Public Web | Web client configuration for Firebase Auth | `firebase-applet-config.json` |
| `GEMINI_API_KEY` | **Confidential Secret** | Server-side Gemini API key | **Google Cloud Secret Manager** (`housemind-gemini-api-key`) |
| `Firebase Admin ADC` | IAM Credential | Server-side Firebase token validation | Attached Cloud Run Service Account IAM |

---

## 3. Google Cloud Secret Manager Provisioning

### Step 1: Create the Secret in Secret Manager
```bash
# Set your active Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable run.googleapis.com secretmanager.googleapis.com

# Create the secret container
gcloud secrets create housemind-gemini-api-key \
  --replication-policy="automatic" \
  --labels=app=housemind,tier=production

# Add the secret version payload securely (pipes secret directly from stdin)
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add housemind-gemini-api-key --data-file=-
```

### Step 2: Provision Cloud Run Runtime Service Account
Create a dedicated least-privilege runtime service account:
```bash
gcloud iam service-accounts create housemind-runtime \
  --display-name="HouseMind Cloud Run Runtime Identity"

# Grant ONLY secretAccessor on the specific secret
gcloud secrets add-iam-policy-binding housemind-gemini-api-key \
  --member="serviceAccount:housemind-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Docker Container Build & Local Execution

HouseMind includes a production `Dockerfile`:

```bash
# Build the Docker image locally
docker build -t housemind:latest .

# Run container locally with Secret Manager simulation
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e GEMINI_API_KEY="YOUR_API_KEY" \
  housemind:latest
```

---

## 5. Google Cloud Run Deployment

Deploy the container to Cloud Run with native Secret Manager environment variable binding:

```bash
# 1. Build and submit container image to Google Container Registry / Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/housemind:latest

# 2. Deploy to Cloud Run
gcloud run deploy housemind \
  --image gcr.io/YOUR_PROJECT_ID/housemind:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account="housemind-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --set-secrets="GEMINI_API_KEY=housemind-gemini-api-key:latest" \
  --set-env-vars="NODE_ENV=production,PORT=3000" \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10
```

---

## 6. Post-Deployment Verification & Health Probing

After deployment, verify system readiness:

```bash
# 1. Probe the public health endpoint
curl -sS -i https://housemind-YOUR_HASH-uc.a.run.app/api/health

# Expected HTTP 200 JSON Response:
# {
#   "status": "healthy",
#   "service": "housemind",
#   "timestamp": "...",
#   "secrets": {
#     "geminiKeyConfigured": true
#   }
# }
```

### Checking Cloud Run Application Logs
```bash
# Stream production logs in real time
gcloud run services logs tail housemind --region us-central1
```

---

## 7. Zero-Downtime Secret Rotation

When rotating the Gemini API key:
1. **Add New Secret Version**:
   ```bash
   echo -n "NEW_GEMINI_API_KEY" | gcloud secrets versions add housemind-gemini-api-key --data-file=-
   ```
2. **Update Service Secret Binding**:
   ```bash
   gcloud run services update housemind \
     --region us-central1 \
     --update-secrets="GEMINI_API_KEY=housemind-gemini-api-key:latest"
   ```
3. **Verify Operational Health**:
   Verify `/api/health` reports `"geminiKeyConfigured": true` and test a Copilot query.
4. **Disable Previous Version**:
   ```bash
   gcloud secrets versions disable PREVIOUS_VERSION_NUMBER --secret=housemind-gemini-api-key
   ```
