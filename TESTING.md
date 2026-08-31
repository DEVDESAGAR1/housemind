# HouseMind Automated Testing Strategy & Verification

HouseMind maintains a rigorous, multi-tiered testing suite covering backend APIs, security boundaries, financial calculation accuracy, multi-tenant isolation, localization formatting, and error resiliency.

---

## 1. Test Architecture

- **Test Runner**: Vitest 3.x
- **Test File Location**: `tests/`
- **Execution Target**: Node.js environment with mocked Firebase auth and isolated in-memory multi-tenant storage.

```
tests/
  ├── auth.test.ts             # Token verification, 401 handling, malformed headers
  ├── isolation.test.ts        # Zero-trust cross-tenant isolation and 404 access checks
  ├── transactions.test.ts     # Credits, debits, transfers, cash flow formulas
  ├── scenarios.test.ts        # What-If simulator formulas, EMI math, affordability logic
  ├── localization.test.ts     # Multi-currency formatting, symbols, country config
  ├── documents.test.ts        # Upload limits, extraction pipelines, draft confirmation
  ├── ssrf.test.ts             # Path traversal, protocol injection, regex boundaries
  └── copilot.test.ts          # Grounded AI fallback execution and schema validation
```

---

## 2. Running Test Suites

```bash
# Run all tests
npm test

# Run tests with coverage report
npx vitest run --coverage

# Run specific test suite
npx vitest run tests/localization.test.ts
```

---

## 3. Key Test Verifications

1. **Security & SSRF Verification**: Confirms that URL manipulation attempts against `/v1/projects/.../documents/` are rejected with `Invalid identifier in path segment` or `Untrusted destination URL rejected`.
2. **Transfer Isolation Verification**: Confirms that transfer transactions (`TRANSFER`) are excluded from net income and net expense totals.
3. **Multi-Tenant Isolation**: Confirms that User B cannot read or modify User A's expenses, documents, or scenarios even when knowing the exact ID.
4. **Deterministic Localization**: Confirms that `formatCurrency` correctly formats values for USD, EUR, GBP, JPY, CAD, AUD, INR, and custom overrides without throwing runtime errors.
