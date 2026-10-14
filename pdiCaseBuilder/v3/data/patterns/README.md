# Pattern Packs

Pattern packs contain sanitized/public-safe troubleshooting knowledge. They must not contain real ticket text, real screenshots, employee names, internal IPs, or private case identifiers.

## Add a new pattern

1. Choose the correct pack or add a new pack.
2. Give the pattern a unique `id`.
3. Add generalized match rules and safe next-step guidance.
4. Add `recommended_fields` so Guided Mode knows what evidence to ask for next.
5. Add a synthetic regression test in `../pattern-tests.json`.
6. Run all tests before deployment.

## Supported rule types

- `text_any`
- `symptom_any`
- `choice_any`
- `field_equals`
- `gt_rule`
- `timing_rule`

Weights may be negative when structured evidence weakens a pattern. A match is still only a signal, not a diagnosis.
