# HouseMind Security Architecture & Threat Model

This document outlines the security architecture, threat model, defense-in-depth principles, and compliance controls implemented across the HouseMind platform.

---

## 1. Security Principles

1. **Strict User Isolation (Zero-Trust Multitenancy)**: Every data object (profile, expense, asset, transaction, document, scenario, insight, conversation) is strictly scoped to the authenticated user's unique identifier (`userId`). Cross-tenant access is structurally impossible.
2. **Defense in Depth**: Security controls are enforced at multiple layers:
   - **Network & Perimeter**: Helmet security headers, CSP, reverse proxy headers, IP rate limiting.
   - **Authentication Middleware**: Cryptographic verification of Firebase ID tokens on every request.
   - **Input Validation**: Strict runtime Zod schema parsing and identifier regex sanitization.
   - **Domain Logic**: Ownership assertions before any read, write, update, or delete operation.
   - **Database Security Rules**: Granular Firestore security rules denying unauthorized access.
   - **AI Prompt Boundaries**: Grounded contextual injection defense with data sanitization.
3. **No Credential Exposure**: Client applications never receive server secrets (Gemini API keys, service account credentials).

---

## 2. Threat Model & Mitigation Matrix

| Threat Category | Potential Attack Vector | HouseMind Mitigation Strategy |
| :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | Malicious document IDs or path traversal characters manipulating outbound Firestore REST calls. | Strict `buildFirestoreUrl` URL builder enforcing `https://firestore.googleapis.com` origin and regex-validating all path identifiers (`/^[a-zA-Z0-9_-]{1,128}$/`). Second-layer assertion in `safeFirestoreFetch`. |
| **Insecure Direct Object References (IDOR)** | User A attempts to access or modify User B's transactions or scenarios by guessing IDs. | Middleware-extracted `req.userId` is unconditionally bound to all database queries. Operations on non-owned IDs return `404 Not Found`. |
| **Broken Authentication** | Forged, revoked, or expired tokens accessing protected API endpoints. | `requireAuth` middleware verifies ID tokens via `firebase-admin/auth`. Unauthenticated or invalid tokens receive `401 Unauthorized`. |
| **Denial of Service (DoS / Resource Exhaustion)** | Rapid requests overloading AI endpoints or uploading oversized files. | Tiered rate limiting (`apiLimiter`: 600 req/15min, `uploadLimiter`: 50 req/15min, `aiLimiter`: 120 req/15min). 10MB payload size caps on JSON and multipart uploads. |
| **Prompt Injection & AI Poisoning** | Malicious text in uploaded files or user chats attempting to override AI system instructions. | System prompts enforce strict JSON output schemas, explicitly prohibit instruction overriding, and treat user documents as untrusted data. Deterministic fallback engines guarantee uptime even when Gemini API quota is depleted. |
| **Sensitive Data Leakage** | Leaking access tokens, PANs, SSNs, or system internals in error traces and log files. | Structured logging without format string injection. Safe global error handler stripping stack traces before returning standard error envelopes to clients. Raw card numbers and SSNs filtered prior to AI ingestion. |
| **Cross-Site Scripting (XSS)** | Malicious scripts injected into document names or notes. | Strict Content Security Policy (CSP) via Helmet, React JSX automatic HTML entity encoding, and Zod text trimming/sanitization. |

---

## 3. Authentication & Authorization Flow

```
+---------------+     Authorization: Bearer <ID_TOKEN>     +------------------------+
| Client (React)| ---------------------------------------> | Express API Gateway    |
+---------------+                                          +------------------------+
                                                                       |
                                                                       v
                                                           +------------------------+
                                                           | `requireAuth` Middleware
                                                           | Decodes & Verifies UID |
                                                           +------------------------+
                                                                       |
                                             +-------------------------+-------------------------+
                                             | Valid UID                                         | Invalid / Expired
                                             v                                                   v
                                 +-----------------------+                           +-----------------------+
                                 | Route Handler         |                           | 401 Unauthorized Res  |
                                 | Attaches `req.userId` |                           +-----------------------+
                                 +-----------------------+
                                             |
                                             v
                                 +-----------------------+
                                 | DatabaseService /     |
                                 | Strict Isolation Store|
                                 | /users/{userId}/*     |
                                 +-----------------------+
```

---

## 4. SSRF Defense Implementation

All outbound Firestore REST requests are passed through a validated URL builder:

```typescript
// 1. Strict regex validation for all URL segments
private static readonly SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

// 2. Strict URL constructor enforcing protocol and hostname
private static buildFirestoreUrl(pathSegments: string[], queryParams?: Record<string, string>): string {
  for (const segment of pathSegments) {
    if (!this.SAFE_ID_REGEX.test(segment)) {
      throw new Error(`Invalid identifier in path segment: "${segment}"`);
    }
  }
  const encodedSegments = pathSegments.map((s) => encodeURIComponent(s)).join('/');
  const basePath = `/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodedSegments}`;
  const url = new URL(basePath, 'https://firestore.googleapis.com');
  
  if (url.protocol !== 'https:' || url.hostname !== 'firestore.googleapis.com') {
    throw new Error('Untrusted destination URL rejected.');
  }
  return url.toString();
}
```

---

## 5. Rate Limiting & Proxy Configuration

HouseMind runs in containerized environments (Cloud Run / reverse proxy). Express is configured with:

```typescript
app.set('trust proxy', 1);
```

Client IPs are safely extracted using `getSafeClientIp` to prevent proxy spoofing:
- **General API**: 600 requests / 15 minutes.
- **Document Ingestion**: 50 uploads / 15 minutes.
- **AI / Gemini Services**: 120 invocations / 15 minutes.

---

## 6. Secret Management

- **Client Configuration (`firebase-applet-config.json`)**: Contains public Firebase Web API keys and project IDs designed for client browser initialization. Firestore rules and App Check safeguard these resources.
- **Server Configuration (`.env`)**: `GEMINI_API_KEY` and private service keys remain strictly on the backend and are never sent to or bundled in client scripts.
