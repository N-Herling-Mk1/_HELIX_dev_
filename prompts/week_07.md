# HELIX — Week 7 working session  (Mon 7/13 – Fri 7/17)
**Phase:** P3 Bayesian bring-up · **Block gate (wk 7–8):** R-hat ≈ 1 / healthy ESS?

Continuing HELIX with me (Steve). Zip + prior prompts in chat; ground in the P3 gate, the mk2 collapse history
(ESS=5, R-hat=9–189), and the Röspel flow fallback note in the master plan.

## Where we are
P1 and P2 are cleared (wk 1–6); FORGE's BLL/HMC technique converged in at wk 5–6. P3 runs on the **already-
trained** four models, so it's not MC-gated.

## This week's objective
Get BLL-HMC mixing healthily on the four models — avoid a repeat of the mk2 collapse.

## Tasks
- [ ] BLL-HMC on the 4 models (NN1/NN2 × barrel/endcap); watch ESS / R-hat live.
- [ ] Laplace (`laplace-torch`, last-layer) lightweight cross-check.
- [ ] If HMC mixing fails → stand up the Röspel normalising-flow fallback (entropy/evidence without mixing).

## Inputs / dependencies
- The four trained models; the FORGE-validated BLL/HMC setup; `laplace-torch`.

## Definition of done (week 7)
- HMC running with diagnosable ESS/R-hat on at least the endcap models, or the flow fallback stood up.

## Start here
Help me set up the BLL-HMC with the FORGE-validated config and instrument ESS/R-hat with progress alerting,
so we catch divergence early rather than after a long run. Decide the flow-fallback trigger up front.
