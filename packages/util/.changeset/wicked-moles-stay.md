---
"@g-1/util": patch
---

**fix(build):** Add workers-safe crypto module to build output

- Add crypto/workers-safe entry point to tsup configuration
- Ensures workers-safe.js is built and available for import
- Fixes module resolution for @g-1/util/crypto/workers-safe imports
