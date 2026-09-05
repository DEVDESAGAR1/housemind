# Contributing to HouseMind

Thank you for your interest in contributing to **HouseMind**! We welcome contributions from developers, security researchers, technical writers, and designers.

---

## 1. Code of Conduct & Development Philosophy

HouseMind is a full-stack household operating system and intelligence platform. We prioritize:
- **Craftsmanship & Non-Slop Design**: Purposeful visual hierarchy, accessibility (WCAG AA), mathematical spacing, and zero generic UI clichés.
- **Truthful & Grounded Architecture**: Deterministic calculations for household facts; generative AI strictly for synthesis with verifiable citations.
- **Defense-in-Depth & Privacy**: Strict tenant isolation (`/users/{userId}/*`), zero secrets in client bundles, and context minimization.

---

## 2. Local Development Setup

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- Git

### Installation & Execution

```bash
# 1. Clone the repository
git clone https://github.com/your-username/housemind.git
cd housemind

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application dev server starts at `http://localhost:3000` with Express backend services and Vite SPA middleware.

---

## 3. Automated Verification & Quality Gates

Before submitting any pull request or pushing changes, ensure all quality gates pass:

```bash
# 1. Static Type Checking (TypeScript 5.8)
npm run lint

# 2. Complete Automated Test Suite (347 tests across 38 suites)
npm test

# 3. Production Build Compilation (Client SPA + Bundled Server)
npm run build
```

All three commands must exit with status `0` and zero errors.

---

## 4. Architectural Rules for Contributors

When writing code for HouseMind:
1. **Never Hardcode Secrets**: Server secrets must be accessed via `process.env.GEMINI_API_KEY` (injected via Secret Manager in production). Never prefix server secrets with `VITE_`.
2. **Deterministic Financial Logic**: Always compute balances, interest, EMIs, burn rates, and health scores through deterministic server functions. Never ask Gemini to calculate financial arithmetic.
3. **Tenant Scoping**: All database operations must enforce `/users/{userId}/*` path boundaries. Never write un-scoped collection queries.
4. **Input Validation**: Validate incoming network payloads using runtime Zod schemas or strict type guards. Use the $O(n)$ linear-time parser (`parseDelimitedLine`) for CSV/statement line processing.
5. **No Hallucinated UI Features**: Keep user interfaces focused, functional, and responsive. Avoid artificial splash screens, unnecessary modals, or unprompted third-party library additions.

---

## 5. Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-enhancement
   ```
2. Make your targeted changes following existing coding conventions.
3. Add or update tests in `tests/` covering your changes.
4. Run the full verification suite (`npm test && npm run lint && npm run build`).
5. Open a Pull Request with a clear description of the problem solved, architectural approach, and verification results.
