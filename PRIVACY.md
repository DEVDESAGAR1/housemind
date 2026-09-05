# HouseMind Privacy-First Data Architecture & Governance

HouseMind is built with a **privacy-first architecture**, ensuring that household financial ledgers, property asset inventories, and extracted billing documents remain confidential, strictly isolated, and user-controlled.

> **Architecture Stance**: HouseMind does **not** claim that data is "local-only", as it operates as a full-stack platform leveraging Cloud Run containers, user-isolated Firestore databases, and stateless Gemini AI models. Instead, HouseMind strictly implements and adheres to **privacy-first data minimization**, **user-isolated cloud storage**, **explicit user consent**, and **controlled AI processing**.

---

## 1. Core Privacy Principles

1. **Strict Multi-Tenant User Isolation**:
   - Every single record (profile, transaction, expense, asset, document, scenario, conversation) is stored strictly under the authenticated user's Firebase Auth UID (`/users/{userId}/*`).
   - Cross-user querying, sharing, or global table joins are structurally impossible.
   - User A can never query, read, update, or delete any record belonging to User B.

2. **Controlled AI Processing & Context Minimization**:
   - The entire database is **never** transmitted to Gemini.
   - When AI features are engaged (Copilot, What-If decision simulator, or Household Investigator), an ephemeral context compiler selects **only the minimum relevant fields** required for the specific query.
   - Unmasked account numbers, full credit card PANs, passwords, and government IDs (SSN, SIN, PAN) are filtered out on both the client and server before payloads are constructed.

3. **Zero Retention for Foundation Model Training**:
   - All AI interactions with Gemini 2.5 use secure server-to-server API calls.
   - Data transmitted for reasoning is processed statelessly and is never retained, logged for model retraining, or shared with third parties.

4. **Explicit Human-in-the-Loop Review**:
   - Ingested documents (bank statements, utility invoices, receipts) are parsed into temporary candidate drafts.
   - No extracted transaction enters the active financial ledger until the user explicitly inspects, optionally edits, and confirms it.

5. **Granular Source Metadata Tracking**:
   - Every record in the system carries source tracking metadata:
     - `sourceType`: `'manual_entry' | 'manual_upload' | 'google_drive' | 'gmail' | 'demo_seed'`
     - `isDemo`: Boolean flag differentiating starter demo datasets from real user-authored data.
     - `ingestionDate`: ISO timestamp of ingestion.
     - `sourceReference`: Optional originating document identifier.

6. **User-Controlled Data Deletion & Reset Rights**:
   - **Surgical Demo Purge (`POST /api/household/demo-remove`)**: Deletes only records marked `isDemo: true`, instantly cleaning the workspace while preserving all user-created expenses, assets, and transactions.
   - **Full Account Wipe (`POST /api/household/reset-data`)**: Securely deletes 100% of user data upon receiving explicit confirmation (`{ confirmPhrase: "DELETE MY DATA" }`).

---

## 2. Privacy Boundary & Grounding Matrix

| Data Category | AI Context Status | Redaction & Minimization Rule |
| :--- | :--- | :--- |
| **Aggregated Monthly Spending** | Minimally Shared | Summarized category totals only (e.g. `$450 Groceries`) |
| **Account Numbers / Card PANs** | **Strictly Redacted** | Stripped or masked to last 4 digits (`*9921`) before compilation |
| **Auth Credentials & Passwords** | **Strictly Excluded** | Never included in any AI prompt context |
| **National IDs (SSN/SIN/PAN)** | **Strictly Redacted** | Filtered during document preprocessing and prompt assembly |
| **Raw Binary Documents** | **Strictly Excluded** | Only verified text extracts are used; raw binaries are never sent to chat |
| **Asset Age & Warranty Dates** | Minimally Shared | Used solely for maintenance forecasting and replacement timing |
| **What-If Scenario Inputs** | Shared for Query | User-configured simulation variables used for financial modeling |
| **Other Household Tenants** | **Strictly Isolated** | Zero cross-tenant data visibility |

---

## 3. Data Sources & Ingestion Control Console

Users can inspect their data footprint, ingestion connectors, and privacy boundaries at any time in the **Privacy Center & Data Transparency** console:

- **Manual Document Ingestion**: Ingests user-uploaded statements and receipts with mandatory review.
- **Manual Entry & Verification**: Direct user input with zero automated inferences.
- **Google Drive Connector (Architecture Ready)**: Restricted to user-designated folders with read-only scopes.
- **Gmail Financial Search (Architecture Ready)**: Restricted to narrow financial queries with explicit OAuth consent.
- **Sample Household Starter Dataset**: Cleanable demo dataset tagged with `isDemo: true`.

---

## 4. API Endpoints for Privacy & Governance

- `GET /api/household/privacy-center` — Returns real-time user vs demo record inventory, connected source statuses, and AI privacy boundaries.
- `POST /api/household/demo-remove` — Surgically purges all `isDemo: true` records.
- `POST /api/household/reset-data` — Purges all tenant records when supplied with `{ confirmPhrase: "DELETE MY DATA" }`.

---

## 5. Privacy-Safe Product Telemetry & Aggregate Analytics

HouseMind incorporates privacy-conscious, non-blocking product telemetry via Google Analytics 4 (GA4) / Firebase Analytics to measure macro application usage:

1. **Strict Parameter Allowlisting**:
   - Only bounded categorical event parameters are accepted (e.g., `file_type: 'pdf'`, `domain: 'assets'`, `result: 'success'`, `export_type: 'json'`).
   - A centralized sanitization layer (`src/lib/analytics.ts`) structurally forbids and strips all personal data, financial values, document content, filenames, Copilot prompts/responses, and raw search query strings.
2. **Anonymous Aggregation**:
   - Firebase UIDs, email addresses, and tenant IDs are never transmitted as GA4 `User-ID` or event parameters.
3. **Graceful Degradation**:
   - If analytics is disabled or the measurement ID is absent, HouseMind operates with 100% functionality without any degradation or errors.


