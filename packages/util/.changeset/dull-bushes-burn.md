---
"@g-1/util": patch
---

**feat(crypto):** Add Cloudflare Workers-safe crypto utilities

- Add new `workers-safe.ts` module with Workers-compatible crypto functions
- Includes `createWorkerSafeCuid2()` and other ID generation utilities
- Avoids global scope violations by deferring crypto operations until runtime
- Export via `@g-1/util/crypto/workers-safe` for easy import
- Fully tested with comprehensive test suite
- Drop-in replacement for problematic `@paralleldrive/cuid2` package

This resolves issues where CUID2 generation fails in Cloudflare Workers due to
global scope restrictions on crypto operations.
