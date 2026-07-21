# Implementation Log

## Automated Done
TDD `cursor-agents-runtime-discovery.test.mjs` — 4/4 green (2026-07-21T21:42:51Z).

## Delivered
- G1: packaged Cursor bridge + overlay leaf
- G2: hybrid discover + A1/A2 probe seams
- G3: `--agents-fallback` + dual-write copy helper
- G4: reload messaging on cursor install/update
- G5: green + sampled regression

## Product Done (manual)
After `maister install/update --target cursor` (+ optional `--agents-fallback`), **reload Cursor**, then confirm Task lists/invokes `maister-explore` / `maister-code-reviewer`.
