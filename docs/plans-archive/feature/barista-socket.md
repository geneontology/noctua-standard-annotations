# Task: Keep the model fresh through the Barista socket (socket.io v4)

**Status:** COMPLETE (uncommitted)
**Issue:** geneontology/noctua#1077 (keep models fresh), geneontology/noctua#1115 (C2: socket.io 4.x clients)
**Branch:** `upgrade-to-react`

## Goal

SAE listens to Barista's socket.io 4.x `relay` broadcasts for the open model. When another tab or
user changes the model, a "Model Updated" dialog asks for a refresh; SAE's own writes don't trigger
it. Same behaviour as VPE (noctua-visual-pathway-editor#238, socket.io-client v4 in 7f79a0c).

## Context

- Barista (`noctua/barista.js`, socket.io 4.8.3) emits `relay` with `class` (`merge`/`rebuild`),
  `model_id`, `packet_id` and `data` for every m3Batch response with `intention=action`. Queries
  (reads, store-only saves, reset) are not broadcast.
- Every client gets the relay, the writer included; the writer knows its own `packet-id` from the
  m3Batch response. A relay that arrives before that response waits 500 ms before counting as
  external (VPE's dedup).
- The old Angular SAE had `bbop-client-barista` (socket.io-client 1.7.4) but never connected;
  the Angular form (`noctua-form`) did.

## Steps

- [x] `socket.io-client` ^4.8.4 (installed with `--before=2026-10-01`)
- [x] `features/gocam/services/baristaSocketService.ts` (port of VPE's)
- [x] `features/gocam/hooks/useBaristaModelWatch.ts`
- [x] `camApiSlice.updateGraphModel` records the response's `packet-id` (actions only)
- [x] `StandardAnnotations` shows the "Model Updated" dialog (`SimpleDialog`; closing it refreshes
      too) → Refresh refetches
- [x] Tests: service (dedup, filtering, acknowledge), packet recording, page dialog;
      global socket.io-client stub in `tests/setup.ts`
- [x] e2e: mocked runs abort `/socket.io/` (`routeMinerva`)
- [x] Docs: CLAUDE.md API layer + testing; `.plans/refactor/angular-to-react.md`

## Summary

- Verified: 227 unit tests, 27 mocked e2e, lint, both type-checks, production build (temp dir).
- Live: the installed v4 client handshakes with the local Barista (:3400, socket.io 4.8.3) and gets
  its `initialization`. Not run: the `LOCAL=1` suite (needs a Barista token) — it would show the
  dialog never appears for SAE's own writes against a real Barista.
- Node changed to v24.22.0 during the session: undici 7's `Request` rejects jsdom's AbortSignal,
  which failed 27 existing tests. `tests/setup.ts` now builds test `Request`s without the signal.

## Notes

- Against a socket.io 2.x Barista (the bare-metal hosts, per #1115) the v4 client can't connect;
  SAE works as before, just without the dialog.
