# Tasks

## 1. Browser check (`npm run dev`, port 4203)

- [ ] 1.1 Open a model that holds only standard annotations and their one-hop extensions → the toolbar shows a green "0 Errors Found" chip right after the title; click it → the right drawer opens on the Model Errors panel with nothing listed
- [ ] 1.2 Open a model with one individual no row shows and no fact touching it → the chip is red and reads "1 Error Found"; the panel lists it as a standalone individual
- [ ] 1.3 Open a model with an annotation whose extension term has its own extension → the count includes the nested fact and its term; the panel's "Relations not shown" section lists the fact as "<subject> —— <relation> ——> <object>"
- [ ] 1.4 In any model with evidence, check that evidence individuals are never listed and do not raise the count

## 2. Curator review

- [ ] 2.1 Curators confirm the chip and panel wording — record the answer on #98
- [ ] 2.2 Curators decide whether nested extensions (1.3) count as errors — record the answer on #98; if they should not, revise this change with a MODIFIED delta to `model-errors` before any code change
