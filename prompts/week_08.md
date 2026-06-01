# HELIX — Week 8 working session  (Mon 7/20 – Fri 7/24)
**Phase:** P3 σ's vs the floor · **Block gate (wk 7–8):** R-hat ≈ 1 / healthy ESS?

Continuing HELIX with me (Steve). Zip + prior prompts in chat; ground in the P3 gate and the Kuntz floor
`H(p_k)` derivation.

## Where we are
HMC (or the flow fallback) is converging (wk 7). This week extracts the uncertainties and renders them
against the theoretical floor.

## This week's objective
Produce `σ_overall` and `σ_boundary` and the posterior-vs-floor visualization — the P3 deliverable.

## Tasks
- [ ] Extract `σ_overall`, `σ_boundary` from the converged posterior. **GATE: R-hat ≈ 1 / healthy ESS?**
- [ ] Render the posterior with the MaxEnt floor `H(p_k)` drawn as a reference line.
- [ ] Cross-check flow entropy vs HMC entropy (if the flow route was used).

## Inputs / dependencies
- Week-7 converged sampler; the `H(p_k)` floor computation from the Kuntz partition-function diagnostics.

## Definition of done (week 8)
- Stable σ's across reruns; a posterior figure with the floor line; the gate call made.

## Start here
Help me compute `H(p_k)` consistently with the embedding objective (same Z), and design the posterior-vs-floor
figure. Flag if the posterior sits *below* the floor — that's the ambiguous case (model good vs floor wrong)
and needs an independent check.
