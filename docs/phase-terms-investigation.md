# Phase Terms Investigation

## Issue

[geneontology/noctua#1040](https://github.com/geneontology/noctua/issues/1040) — Cannot use phase terms as instructed

## Problem

Biological phase terms (GO:0044848 descendants) are marked `gocheck_do_not_annotate` in GO. The SAE lookup service flags these as `notAnnotatable`, disabling them in autocomplete dropdowns. Curators need these terms for annotation extensions with specific relations.

## Workflow

### 1. Identifying the filtering mechanism

The lookup service (`src/@noctua.form/services/lookup.service.ts`) queries GOLr (Gene Ontology Solr) for term autocomplete. In `_lookupMap()`, each result is checked:

```typescript
notAnnotatable: !item.subset?.includes('gocheck_do_not_annotate')
```

Terms in the `gocheck_do_not_annotate` subset get `notAnnotatable: false`, which disables the `<mat-option>` in the autocomplete template.

### 2. Fix applied

Pass the lookup `categories` through `search()` -> `termLookup()` -> `_lookupMap()`. If the categories include `GoBiologicalPhase.category` (GO:0044848), bypass the `do_not_annotate` filter:

```typescript
const allowNotAnnotatable = categories?.some(cat => cat.category === GoBiologicalPhase.category);
// ...
notAnnotatable: allowNotAnnotatable || !item.subset?.includes('gocheck_do_not_annotate')
```

This works because only the 3 phase-compatible relations produce categories containing GO:0044848:
- `happens_during` (RO:0002092) — for BP extensions
- `existence_overlaps` (RO:0002490) — for CC extensions
- `existence_starts_and_ends_during` (RO:0002491) — for CC extensions

### 3. Verifying phase terms exist

Needed to confirm real phase term IDs/labels for test cases.

**QuickGO API** — used to retrieve descendants of GO:0044848:

```
GET https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0044848/children
GET https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0022403/children
```

#### Phase term examples (GO:0044848 descendants)

| GO ID | Label |
|-------|-------|
| GO:0022403 | cell cycle phase |
| GO:0098763 | mitotic cell cycle phase |
| GO:0098762 | meiotic cell cycle phase |
| GO:0051318 | G1 phase |
| GO:0051320 | S phase |
| GO:0000279 | M phase |
| GO:0051319 | G2 phase |
| GO:0051325 | interphase |
| GO:0044851 | hair cycle phase |
| GO:0060206 | estrous cycle phase |
| GO:0022601 | menstrual cycle phase |

## URL Failures During Investigation

### AmiGO GOLr direct query — 403 Forbidden

```
https://amigo.geneontology.org/amigo/search/ontology?q=*:*&fq=isa_closure:"GO:0044848"&fq=subset:"gocheck_do_not_annotate"&rows=10&wt=json
```

AmiGO blocks direct Solr-style queries from external HTTP clients. The GOLr API is intended to be accessed via JSONP from browser-based applications (which is how the Noctua lookup service uses it). Server-side or CLI-based HTTP requests get rejected.

### AmiGO term page — 403 Forbidden

```
https://amigo.geneontology.org/amigo/term/GO:0044848
```

AmiGO's web pages also returned 403 — likely bot/scraper detection blocking non-browser user agents.

### QuickGO term page — empty content

```
https://www.ebi.ac.uk/QuickGO/term/GO:0044848
```

The QuickGO frontend is a JavaScript SPA. The fetched HTML contains only the shell (nav, scripts) with no term data rendered — the actual content is loaded client-side via API calls.

### QuickGO REST API — worked

```
https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0044848/children
```

The QuickGO REST API returns JSON directly and does not require browser rendering or JSONP. This was the only reliable way to retrieve term hierarchy data programmatically.

## Caveat

We confirmed these are phase terms (descendants of GO:0044848), but could not programmatically verify which ones are specifically in the `gocheck_do_not_annotate` subset — that requires either a live GOLr query from the browser or checking the OBO/OWL source files. Manual testing in the app is needed to confirm the fix works for specific terms.
