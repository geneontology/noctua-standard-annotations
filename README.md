# Noctua Standard Annotations

A Noctua workbench for creating and editing standard GO annotations — gene product,
relation, GO term, evidence, extensions and comments — on a GO-CAM model.

React 19 + TypeScript, built with Vite, Redux Toolkit, Mantine and Tailwind (the same
stack as the Noctua Visual Pathway Editor).

## Development

```bash
npm install
npm run dev        # http://localhost:4203/workbench/noctua-standard-annotations/?model_id=<gomodel id>
```

The app reads Barista, Minerva and GOlr locations from globals that the Noctua host injects.
Locally it falls back to a Barista at `http://localhost:3400` (see
`src/@noctua.core/data/constants.ts`). Log in through Barista, or open the app with
`?barista_token=<token>`.

## Tests

```bash
npm run test       # unit and component tests (Vitest)
npm run test:e2e   # browser tests with Barista and GOlr mocked (Playwright)
npm run lint && npm run type-check
```

## Build

```bash
npm run build            # → workbenches/noctua-standard-annotations/public (inject.tmpl)
npm run build:beta-test  # → workbenches/noctua-standard-annotations-beta/public
```
