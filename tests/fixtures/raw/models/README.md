# Barista / Minerva model fixtures

Real m3Batch `data` payloads, snapshotted read-only from barista-dev
(`minerva_public_dev`, no reasoner, the way SAE reads models). They are
imported by `tests/fixtures/models.ts` and fed through `transformGraphData`.

| File | Model | What it's good for |
| --- | --- | --- |
| `acts-upstream-pair.json` | `gomodel:6a2b236300000482` | Written by SAE: two "acts upstream of or within" annotations (root MF + causal edge to a BP), each with its own individuals and a three-entry with/from. |
| `mf-with-bp-extension.json` | `gomodel:6ab067da00005997` | One MF annotation whose MF is `part of` a BP that is itself `part of` another BP. The first BP is an extension and the nested one is not. Also has an individual comment. |
| `single-mf.json` | `gomodel:6ab067da00002477` | Smallest case: one `MF enabled_by GP` with one evidence. |
| `gocam-mixed.json` | `gomodel:69b432fc00000161` | A GO-CAM edited in VPE: causal edges, chemicals, edges without evidence, multi-evidence facts. Robustness: the reader must not absorb neighbouring activities. |

`tests/fixtures/saeModel.ts` is a synthetic SAE-shaped model with one
annotation per relation kind (NOT enables, involved in, acts upstream of or
within, located in, is active in, contributes to, part of complex,
ComplexPortal located in, MF root with ND). Use it when a test needs a known,
complete set.
