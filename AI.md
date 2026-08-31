# HouseMind AI Architecture & Safety Protocols

HouseMind integrates the Google Gen AI SDK (`@google/genai`) and Gemini 2.5 models to power intelligent household financial analysis, equipment diagnostic investigation, and what-if simulation guidance.

---

## 1. AI Integration Architecture & Context Minimization

```
+-------------------------------------------------------------------------+
|                        HouseMind Express Backend                        |
|                                                                         |
|  +--------------------+   Context Minimizer & Stripper  +---------------+ |
|  | User Grounded Data | ----------------------------> | Ephemeral     | |
|  | - Verified Profile |  • Strips Account Numbers/PAN | Payload       | |
|  | - Expenses Summary |  • Filters Passwords & SSNs   | Assembler     | |
|  | - Aggregated Totals|  • Only sends minimal context | +---------------+ |
|  +--------------------+                                       |         |
|                                                               v         |
|                                                       +---------------+ |
|                                                       | Gemini 2.5    | |
|                                                       | Flash Client  | |
|                                                       +---------------+ |
+---------------------------------------------------------------|---------+
                                                                |
                                             Google Gen AI API  v
                                                       +---------------+
                                                       | Structured    |
                                                       | JSON Response |
                                                       +---------------+
                                                                |
+---------------------------------------------------------------|---------+
|                                                               v         |
|                                                       +---------------+ |
|                                                       | Runtime Zod   | |
|                                                       | Parser &      | |
|                                                       | Sanitizer     | |
|                                                       +---------------+ |
|                                                               |         |
|                                                       +---------------+ |
|                                                       | Verified Data | |
|                                                       | to Client UI  | |
|                                                       +---------------+ |
+-------------------------------------------------------------------------+
```

---

## 2. Gemini Models & Features

| Capability | Model | Configuration | Fallback Protocol |
| :--- | :--- | :--- | :--- |
| **Copilot Interactive Chat** | `gemini-2.5-flash` | System grounding with minimal household context | Deterministic rule-based household advisor |
| **Household Investigator** | `gemini-2.5-flash` | `responseMimeType: "application/json"`, strict schema | Rule-based diagnostic evaluator |
| **Document Extraction** | `gemini-2.5-flash` | Multimodal text/image parsing, structured JSON schema | Deterministic regex statement parser |
| **What-If Explanations** | `gemini-2.5-flash` | Financial impact analysis & opportunity cost analysis | Algorithmic baseline comparison engine |

---

## 3. Privacy & Safety Guarantees

1. **Context Minimization Boundary**: The entire database is **never** sent to Gemini. Context builders extract only the minimum relevant summary fields needed for the prompt.
2. **Server-Side Key Isolation**: All Gemini API calls originate strictly from backend services (`server/services/geminiService.ts`). The `GEMINI_API_KEY` is never transmitted to or visible in client code.
3. **Stateless & Ephemeral Processing**: Interactions are processed in stateless requests. No user financial data or chat prompts are used to train foundational AI models.
4. **Schema Enforcement**: All structured extraction and analysis requests utilize `responseSchema` or explicit JSON structural contracts. Responses are validated against runtime TypeScript/Zod schemas before returning to the frontend.
5. **Untrusted Data Containment**: Uploaded documents are treated as untrusted text payloads and processed within demarcated boundaries.
6. **Deterministic Fallbacks**: Every AI-powered endpoint contains a robust, non-AI fallback algorithm. If the Gemini API is unreachable, quota is exceeded, or responses fail validation, the system seamlessly serves valid financial computations without crashing or hanging.

