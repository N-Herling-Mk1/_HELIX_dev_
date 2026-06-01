# HELIX — Week 1 working session  (Mon 6/1 – Fri 6/5)
**Phase:** Planning & setup + P1/P2 bring-up · **Block gate (wk 1–2):** barrel `r(S,NN2) < 0.055`?

You're picking up Project HELIX with me (Steve / Nathan Herling, UA ATLAS group, advisor Prof. Johns).
I've dropped the project zip (`_HELIX_dev_`) into this chat. Before we start, ground yourself from
`HELIX_2026_master_plan_mk2.md` (§2 gates, §4 sprint) and the `overview` / `timeline` panels — use that
framing, don't re-derive it.

## Where we are
Week 1, the start of the 10-week summer PoC sprint. Endcap MaxEnt is already banked (97.1% agreement with
ABCD region A, r(S,NN1) = −0.0009). Two things must resolve this week: the signal-MC branch and the bigram
bin boundaries.

## This week's objective
Stand up the P1 bigram and P2 Round-3 pipelines on real data, and make the two gating decisions that the
rest of the sprint depends on.

## Tasks
- [ ] Confirm mk3 CSVs / `data24VR` flats are current on `atlng01`; resolve signal-MC availability → **set Branch A or B**.
- [ ] Quick-look feature distributions (`nMDT`/`nRPC`/`nTGC`/`nBOL`, `mindR`) → choose `KBinsDiscretizer` bin boundaries.
- [ ] Scaffold the bigram pipeline: `StandardScaler → KBinsDiscretizer → DictVectorizer`, with S1 (object-level) and S3 (cutflow-trajectory) stubs.
- [ ] Implement the S3 cutflow-transition matrix `P(pass c_n | pass c_n-1)`; first `Ψsig/Ψbkg` heatmap draft.
- [ ] Swap barrel MaxEnt priors → Poisson (counts) + Exponential (`mindR`); wire the `r(S,NN2)` readout.
- [ ] Create a week-1 branch in the HELIX repo (`_HELIX_dev_`); commit scaffolds + this plan.

## Inputs / dependencies
- mk3 CSVs and `data24VR` flats on `atlng01`; NN1/NN2 outputs for the barrel region.
- Open design decision: tokenization bin boundaries (analysis choice — decide against the quick-look, not in the abstract).

## Definition of done (week 1)
- Branch A/B is decided and written down.
- Bin boundaries chosen; bigram scaffold runs end-to-end on a real CSV (even if results are rough).
- Barrel Round-3 prior swap is in place and emitting an `r(S,NN2)` number.

## Deliverables
- `assets/py_scripts/` updates for the bigram + barrel-Poisson scripts (CONFIG/COLUMN_MAP header; progress alerting).
- Updated `content/weekly_todos.json` (mark week-1 items done as they land).

## Start here
Begin by asking me the Branch A/B status and what the mk3 columns actually look like, then help me lock the
bin-boundary choice before we write the discretizer. Flag anything in the master plan that this week's setup
would contradict.
