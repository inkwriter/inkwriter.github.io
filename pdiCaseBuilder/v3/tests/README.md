# V3 Tests

Run from the v3 root folder:

```bash
node tests/smoke-check.mjs
node tests/run-pattern-tests.mjs
node tests/privacy-scan.mjs
```

The pattern suite is synthetic/public-safe. The separate private historical replay remains a manual/internal QA step and should not be committed to the public repository.
