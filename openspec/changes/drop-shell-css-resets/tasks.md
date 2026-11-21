# Tasks

## 1. Deployed check

- [ ] 1.1 On the deployed workbench inside the Noctua shell, open DevTools → the shell's `bootstrap.min.css`, `jquery-ui-1.10.3.custom.min.css`, `bbop.css` and `amigo.css` links are present but disabled
- [ ] 1.2 In DevTools, temporarily remove `html { font-size: 16px }` and the `:where(#root)` rules → fonts, filled buttons (background kept), link hover and box sizing look unchanged on the table, the create form and the toolbar dialogs

## 2. Remove what isn't needed

- [ ] 2.1 Delete the rules 1.2 showed are unneeded from `src/index.css` — verify with `npm run lint`, `npm run type-check`, `npm run test`, and repeat the 1.2 look-over on `npm run dev`
- [ ] 2.2 Only if the shell's styles are confirmed disabled everywhere SAE runs: drop Tailwind `important` and update the CLAUDE.md Conventions line — verify row hover and hidden elements still behave on the deployed workbench
