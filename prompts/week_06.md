# HELIX — Week 6 working session  (Mon 7/6 – Fri 7/10)
**Phase:** P1 Evt2Vec gate + WEFAT · **Block gate (wk 5–6):** AUC > raw? no collapse?

Continuing HELIX with me (Steve). Zip + prior prompts in chat; ground in the P1 gate and the WEFAT-as-P1-
validation note in the master plan.

## Where we are
The encoder trains (wk 5). This week runs the sweep, the linear-probe gate, and the WEFAT validation.

## This week's objective
Clear the P1 gate: linear-probe AUC beats raw features, and WEFAT shows the embedding encodes physics.

## Tasks
- [ ] `τ` / embedding-dim / batch-size sweep.
- [ ] Linear-probe AUC on the embedding vs raw features. **GATE: AUC gain? no collapse?**
- [ ] WEFAT on the embedding → predicts true `L_xy` / mass point? (P1 validation).

## Inputs / dependencies
- Week-5 trained encoder(s); raw-feature baseline AUC; truth labels (`L_xy`, mass).

## Definition of done (week 6)
- A best-config linear-probe AUC vs raw, with the gate call made.
- A WEFAT correlation between the per-event association score and a physical property.

## Start here
Help me design the linear-probe comparison fairly (same splits, same eval) and set up WEFAT on the embedding.
A WEFAT pass is the cleanest evidence that "the embedding learned physics."
