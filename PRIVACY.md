# HouseMind Privacy & Data Governance Architecture

HouseMind is built with a privacy-by-design architecture, ensuring household financial information, home specifications, and extracted documents remain confidential, strictly isolated, and user-controlled.

---

## 1. Core Privacy Commitments

1. **Strict User Data Isolation**: Every transaction, document, asset, and conversation is stored within user-specific namespaces. No shared global datasets or cross-user aggregations occur.
2. **Zero Secondary AI Training**: User financial transactions, bills, and documents sent to the Gemini API are processed in stateless sessions and are never used to train public foundation models.
3. **Mandatory Human-in-the-Loop Review**: No automated extraction silently mutates user financial ledgers. All AI-parsed documents require explicit user confirmation before becoming active records.
4. **Transparent Data Inventory**: Users can inspect their active storage footprint, grounded data elements, and excluded sensitive data via the **Data Sources & Transparency** console at any time.
5. **Right to Purge & Reset**:
   - **Remove Demo Data**: Users can purge sample starter records with a single click, preserving their real user-created data.
   - **Account Reset**: Users can completely delete all stored records associated with their authenticated UID.

---

## 2. Sensitive Data Handling & Grounding Exclusions

Before assembling prompt contexts for Gemini Copilot or Household Investigator, the data pipeline applies strict sanitization rules:

| Data Category | Grounding Status | Handling Rule |
| :--- | :--- | :--- |
| **Transaction Amounts & Categories** | Grounded | Aggregated and categorized for budget insights |
| **Raw Credit Card / Account Numbers** | Excluded | Masked to last 4 digits or stripped entirely |
| **Passwords / Auth Tokens / Secrets** | Excluded | Never included in AI context pipelines |
| **Personal Identity Numbers (SSN/SIN/PAN)** | Excluded | Redacted during document preprocessing |
| **Full Asset Maintenance Logs** | Grounded | Included to provide predictive replacement advice |
| **What-If Simulations** | Grounded | Provided for comparative financial decision support |

---

## 3. Data Retention & Deletion Lifecycle

- **Active Records**: Retained in the user's isolated Firestore database store for the duration of the account lifecycle.
- **Uploaded Document Payloads**: Text and extracted structured items are stored encrypted in the user's document registry.
- **Session Conversations**: Chat history is stored per conversation ID under the user namespace and can be deleted individually by the user.
- **Account Data Purge**: Deletion requests through `/api/household/reset-data` immediately clear all Map and database records for that user identifier.
