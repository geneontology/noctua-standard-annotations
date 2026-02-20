# CLAUDE.md - Noctua Standard Annotations

## Project Overview
Gene Ontology annotation workbench for creating, editing, and managing Causal Activity Models (CAMs) and standard biological annotations. Part of the Gene Ontology project (geneontology org).

### Directories to Ignore

- `./workbenches/` - Compiled output folder, do not analyze or modify


## Tech Stack
- **Framework:** Angular 17.3 with TypeScript 5.4
- **UI:** Angular Material 16.2, Tailwind CSS 3.4, SCSS
- **State:** RxJS observables, service-based architecture
- **Visualization:** JointJS, ngx-graph, ngx-charts, dagre
- **Backend:** bbop/minerva-requests (Barista REST client), SPARQL queries
- **Build:** Angular CLI 17.3, custom Webpack (ngx-build-plus)
- **Testing:** Karma + Jasmine (unit), Protractor (e2e)
- **Linting:** TSLint

## Key Commands
```bash
npm start                # Dev server on port 4203
npm run build            # Production build (outputs to workbenches/)
npm test                 # Unit tests (Karma/Jasmine, Chrome)
npm run lint             # TSLint
npm run e2e              # End-to-end tests (Protractor)
```

## Project Structure
```
src/
  @noctua/              # Core framework (components, services, pipes, utils)
  @noctua.announcement/ # Announcement/CAM service module
  @noctua.common/       # Common models and data services
  @noctua.curie/        # CURIE handling and GO context
  @noctua.doctor/       # Validation services
  @noctua.editor/       # Inline editors (entity, reference, detail, with)
  @noctua.form/         # Core data models and forms (publicly exported library)
  app/
    main/apps/
      noctua-form/          # Main CAM form editor
      noctua-annotations/   # Standard annotations UI
      noctua-graph/         # Graph visualization
      noctua-search/        # Search and review
      noctua-doctor/        # Validation tool
      noctua-tutorial/      # User guide
      noctua-pathway/       # Pathway workbench
    layout/                 # Toolbar, footer, sidenav, main layout
```

## Code Conventions
- **File naming:** kebab-case (e.g., `activity-form.component.ts`)
- **Classes:** PascalCase; **Members:** camelCase
- **Strings:** Single quotes, semicolons required
- **Max line length:** 140 characters
- **Indentation:** 2 spaces (see .editorconfig)
- **Subscriptions:** Use `_unsubscribeAll` Subject with `takeUntil()` for cleanup in `ngOnDestroy`
- **Component encapsulation:** `ViewEncapsulation.None` is commonly used
- **Module organization:** Feature-based with lazy loading

## Architecture Notes
- Core data models live in `@noctua.form/models/` (Activity, Evidence, Entity, Triple, Predicate)
- Validation rules in `@noctua.form/models/activity/parser/`
- Shape and model definitions in `@noctua.form/data/config/`
- Environment configs in `src/environments/`
- Production builds require ~6GB Node memory (`--max_old_space_size=6144`)
- Bundle budgets: 50MB warning / 150MB error

## Key Services

| Service                 | Location                                  | Purpose                             |
| ----------------------- | ----------------------------------------- | ----------------------------------- |
| **NoctuaGraphService**  | `@noctua.form/services/graph.service.ts`  | CAM graph state, Minerva manager    |
| **CamService**          | `@noctua.form/services/cam.service.ts`    | CAM CRUD, form initialization       |
| **NoctuaLookupService** | `@noctua.form/services/lookup.service.ts` | Ontology term autocomplete (GOLr)   |
| **NoctuaUserService**   | `@noctua.form/services/user.service.ts`   | User auth, Barista token management |
| **CurieService**        | `@noctua.curie/services/curie.service.ts` | CURIE expansion/compression         |

## State Management

Uses **RxJS BehaviorSubject** pattern throughout. Cleanup pattern: `takeUntil()` with `Subject`:

```typescript
private _unsubscribeAll: Subject<any>;
this.observable.pipe(takeUntil(this._unsubscribeAll))
```

## SCSS & Theming

### Structure
- Main styles: `src/@noctua/scss/noctua.scss`
- Partials: `src/@noctua/scss/partials/` (colors, material, typography, buttons, forms, cards, scrollbars)

### Color Palette
```scss
$noc-primary-color: #3b5998        // Noctua blue
$noc-primary-color-accent: #8b9dc3
$noc-secondary-color: #995014
$noc-mf: #7cd488                   // Molecular Function (green)
$noc-bp: #f4c89c                   // Biological Process (tan)
$noc-cc: #d3b5f5                   // Cellular Component (purple)
```

## Git Conventions

### Branch Naming
- Feature: `issue-<number>-<short-description>`
- Bug fix: `fix-<number>-<short-description>`

### Commit Messages
- Keep concise, describe what changed
- Reference issue numbers when applicable
- Do not add "Co-Authored-By" lines

## Reviewers

@pgaudet @vanaukenk @kltm @thomaspd

## PR Template

```markdown
### Issues

- <link to related issue>

### Changes

- <description of changes>

### Tests

- [ ] <manual test steps>

cc @pgaudet @vanaukenk @kltm @thomaspd
```

## Gotchas
- Material design patches and overrides are in `src/@noctua/scss/partials/`
- Global scripts (jQuery, Lodash, Backbone, Dagre, Graphlib) loaded via angular.json scripts array
- Production builds require 6GB memory (`node --max_old_space_size=6144`)
- jQuery/Backbone still used for BBOP library integrations


## Git Commits

- Do NOT include the `Co-Authored-By` line in commit messages.

## Task Plans

- Always create and maintain task plans using the [.plans/template.md](.plans/template.md) system.
- On context resume, check `.plans/` for ACTIVE plans before doing anything else.
