# HELIX — Weekly working prompts

One kickoff prompt per sprint week (`week_01.md` … `week_10.md`) for the Summer 2026
10-week PoC sprint (6/1 – 8/7).

## Workflow
1. Start a fresh Claude conversation.
2. Drop in the project zip (`_HELIX_dev_`) **and** the prior weeks' prompt files (continuity).
3. Paste that week's `week_NN.md`.
4. Hash out the week's work. As plans shift, edit the *upcoming* prompts in place — this folder
   is meant to be revised week to week.

Each prompt is written **to Claude** and treats the zip as the source of truth: Claude should
ground itself in `HELIX_2026_master_plan_mk2.md` and the `overview` / `timeline` / `mvp` panels
rather than re-deriving the framing.

## Sprint map (weeks → primary → gate)
| Wk | Dates | Primary | Gate / decision |
|----|-------|---------|-----------------|
| 1–2  | 6/1 – 6/12  | P1 bigram + P2 Round 3       | Barrel r(S,NN2) < 0.055? |
| 3–4  | 6/15 – 6/26 | P2 validation + bias bridge  | P2 PoC-met |
| 5–6  | 6/29 – 7/10 | P1 Evt2Vec Phase 1           | AUC > raw? no collapse? |
| 7–8  | 7/13 – 7/24 | P3 Bayesian (BLL-HMC)        | R-hat ≈ 1 / healthy ESS? |
| 9–10 | 7/27 – 8/7  | Integration + buffer         | PoC sprint review |

## Standing conventions (apply every week)
- **Progress alerting:** any longer-running script gets a progress bar / status prints; any GUI uses
  the TRON Ares aesthetic (cyan/orange on deep black, Orbitron / Share Tech Mono).
- **Script hygiene:** new analysis scripts live in `assets/py_scripts/` with a CONFIG/COLUMN_MAP header
  that reads the CSV, prints columns, and fails loudly on wrong names.
- **Tracking:** update `content/gantt.json` + `content/weekly_todos.json` as work lands; results/plots
  flow back into the hub panels; commit to the HELIX repo.
- **Branch A/B:** the signal-MC question gates only P2's MC-specific steps and P3's *remedy* story —
  never *whether* a gate is cleared.
