# HouseMind Automated Testing Strategy & Verification

HouseMind maintains a rigorous, multi-tiered testing suite covering backend APIs, security boundaries, financial calculation accuracy, multi-tenant isolation, localization formatting, privacy center governance, and error resiliency.

---

## 1. Test Architecture

- **Test Runner**: Node.js test harness / Vitest integration
- **Test File Location**: `tests/`
- **Execution Target**: Node.js runtime with mocked Firebase auth tokens and isolated multi-tenant storage instances.

```
tests/
  ├── backend/
  │   ├── auth.test.ts             # Token verification, 401 handling, malformed headers
  │   ├── security.test.ts         # Zero-trust isolation, path traversal, IDOR checks
  │   ├── profile.test.ts          # Profile CRUD & currency override settings
  │   ├── expenses.test.ts         # Recurring expenses CRUD & status lifecycle
  │   ├── assets.test.ts           # Equipment inventory & warranty management
  │   ├── transactions.test.ts     # Credits, debits, transfers, cash flow formulas
  │   ├── documents.test.ts        # Upload limits, extraction pipelines, draft confirmation
  │   ├── copilot.test.ts          # Grounded AI fallback execution and schema validation
  │   ├── scenarios.test.ts        # What-If simulator formulas, EMI math, affordability logic
  │   ├── error-recovery.test.ts   # Graceful degradation on malformed inputs & quota depletion
  │   └── privacy.test.ts          # Privacy center metrics, surgical demo deletion & account wipe
  └── integration/
      ├── financial.test.ts        # End-to-end ledger calculations & transaction sync
      ├── documents.test.ts        # E2E statement upload to confirmed ledger workflow
      ├── intelligence.test.ts     # Synergy between user data and AI insights
      └── persistence.test.ts      # Multi-tenant state persistence across operations
```

---

## 2. Running Test Suites

```bash
# Run all tests (78 tests, 15 suites)
npm test
```

---

## 3. Key Test Verifications

1. **Privacy-First Architecture & Data Deletion**: Confirms that `/api/household/privacy-center` accurately tallies user records vs demo records, that `/api/household/demo-remove` deletes only `isDemo: true` records without modifying user-authored items, and that unconfirmed `/api/household/reset-data` calls are rejected with `400 Bad Request`.
2. **Security & SSRF Verification**: Confirms that URL manipulation attempts against `/v1/projects/.../documents/` are rejected with `Invalid identifier in path segment` or `Untrusted destination URL rejected`.
3. **Transfer Isolation Verification**: Confirms that transfer transactions (`TRANSFER`) are excluded from net income and net expense totals.
4. **Multi-Tenant Isolation**: Confirms that User B cannot read or modify User A's expenses, documents, or scenarios even when knowing the exact ID.
5. **Deterministic Localization**: Confirms that `formatCurrency` correctly formats values for USD, EUR, GBP, JPY, CAD, AUD, INR, and custom overrides without throwing runtime errors.

