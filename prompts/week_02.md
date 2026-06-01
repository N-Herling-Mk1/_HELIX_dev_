# HELIX — Week 2 working session  (Mon 6/8 – Fri 6/12)
**Phase:** P1 + P2 · **Block gate (wk 1–2):** barrel `r(S,NN2) < 0.055`?

Continuing Project HELIX with me (Steve). Zip + week-1 prompt are in this chat; ground yourself in the master
plan and what week 1 produced before adding anything.

## Where we are
Bigram and barrel-Poisson pipelines are scaffolded (week 1). This week turns them into results and runs the
first real gate.

## This week's objective
Produce the bigram AUC + grammar read and clear (or characterize) the barrel orthogonality gate.

## Tasks
- [ ] S1 object-level bigram → AUC vs the mk3 gap; S3 AUC + cut-redundancy read.
- [ ] Finalize the `Ψsig/Ψbkg` heatmap; call it: real grammar vs Markov-trivial.
- [ ] Round-3 barrel run: read `r(S,NN2)`. **GATE: below |r_D| = 0.055?**
- [ ] Log the P1/P2 week 1–2 findings to the experiments repo.

## Inputs / dependencies
- Week-1 bigram scaffold + chosen bin boundaries; barrel Round-3 prior swap.

## Definition of done (week 2)
- A bigram AUC for both S1 and S3, with the grammar-vs-trivial call made.
- A clear yes/no on the barrel gate, with the diagnosis if it fails.

## Deliverables
- AUC + heatmap plots; a short findings note; `gantt.json` / `weekly_todos.json` status updates.

## Start here
Help me read the heatmap honestly — is there transition structure that distinguishes signal from background,
or is the cutflow Markov-trivial? Then we interpret the barrel `r` against 0.055.
