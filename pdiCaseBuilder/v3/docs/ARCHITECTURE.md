# V3 Architecture

```text
Case Evidence
     │
     ├── Intake module
     ├── Troubleshooting module
     ├── GT analysis module
     └── Screenshot module
     │
     ▼
Normalized Case State
     │
     ├──────────────► Local IndexedDB storage
     │
     ▼
Pattern Engine
     │
     ├── data/patterns/store-close.json
     ├── data/patterns/polling.json
     ├── data/patterns/connectivity.json
     ├── data/patterns/locks.json
     ├── data/patterns/totalizers.json
     └── data/patterns/xml.json
     │
     ▼
Pattern Signal + Next Safe Evidence
     │
     ├── Guided UI
     ├── Technician UI
     ├── ChatGPT handoff service
     └── Reporting/export service
```

## Design rule

No UI module is allowed to treat a pattern match as an authorization for an advanced data correction. Pattern matching is an evidence-prioritization system.

## Future scaling

New areas such as printers, RSM, lottery, pricebook, or batch-processing troubleshooting can be added as additional pattern packs and modules without rewriting the Case Builder core.
