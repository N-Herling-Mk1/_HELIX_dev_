# HELIX — Reading schedule

Papers to read in parallel with the weekly tasks, paired to each two-week block by what you're
building that week. Drawn from the project's 13-paper verified bibliography (`content/references.json`).

Pacing is ~2–3 papers per block, front-loading the partition-function spine. `kuntz2024` spans
blocks 3 and 4 by design — it's the load-bearing citation (the InfoNCE-is-Z bridge and the floor).

**How to read these:** not cover-to-cover. Each entry says the *one thing to extract* for that
week's task. Read for that, note it, move on; deep reads can wait for the write-up.

---

## Block 1 · Weeks 1–2 — P1 bigram + P2 Round-3
Gate: barrel `r(S,NN2) < 0.055`?

- **`jaynes1957` — Jaynes (1957), *Information Theory and Statistical Mechanics*** (Phys. Rev. 106, 620).
  The MaxEnt foundation under the whole project. Extract: *why* the max-entropy distribution for a
  constraint is the right prior — this is the justification for swapping the barrel counts to Poisson
  (max-entropy law for a non-negative integer with fixed mean) over Gaussian.
- **`stone2019` — Stone (2019), *Information Theory: A Tutorial Introduction***.
  Reference, not a front-to-back read. Extract: surprise/self-information `S(x) = −log p(x)` and entropy
  as expected surprise — the exact quantity P2 is built on.
- **`mikolov2013` — Mikolov et al. (2013), *Efficient Estimation of Word Representations*** (word2vec).
  Extract: the skip-gram objective and what an n-gram/co-occurrence baseline does and doesn't capture —
  the conceptual baseline the cutflow bigram is measuring against.

## Block 2 · Weeks 3–4 — P2 validation + bias bridge
Gate: P2 PoC-met (complementary handle, failure mode understood).

- **`abcddisco2021` — Kasieczka, Nachman, Schwartz & Shih (2021), *ABCDisCo*** (Phys. Rev. D 103, 035021).
  Extract: the independence assumption the ABCD method rests on, and how decorrelation is enforced —
  this defines the plane your surprise score `S(x)` has to be orthogonal *to*.
- **`cwola2017` — Metodiev, Nachman & Thaler (2017), *Classification Without Labels (CWoLa)*** (JHEP 10, 174).
  Extract: learning from mixed samples without truth labels — the weak-supervision backdrop for a
  data-driven background handle. Light read; context for why a NN-free handle matters.
- **`caliskan2017` — Caliskan, Bryson & Narayanan (2017), *Semantics … Human-like Biases*** (Science 356, 183).
  The literal source for WEAT/WEFAT. Extract: the test construction (target vs. attribute sets, the
  permutation null) — you're adapting this exact machinery to probe NN1/NN2 activations.

## Block 3 · Weeks 5–6 — Evt2Vec (InfoNCE)
Gate: linear-probe AUC > raw? no collapse?

- **`oord2018` — van den Oord, Li & Vinyals (2018), *Contrastive Predictive Coding*** (InfoNCE).
  Extract: the InfoNCE loss itself and its mutual-information bound — the objective Evt2Vec trains on.
- **`simclr2020` — Chen et al. (2020), *SimCLR*** (ICML, PMLR 119, 1597).
  Extract: positive-pair construction, temperature `τ`, and the role of batch size — directly informs
  the `PhysicsRegionDataset` pairing and your `τ`/`d`/batch sweep.
- **`jetclr2022` — Dillon et al. (2022), *JetCLR*** (SciPost Phys. 12, 188).
  **Read closely — this is your nearest neighbor.** Contrastive self-supervision applied to HEP
  (jets). Extract: how they framed physics augmentations as the contrastive symmetry, and how they
  evaluated the embedding (linear probe) — your evaluation protocol should be comparable.
- **`kuntz2024` — Kuntz et al. (2024), *Partition Function Approach …***.
  Extract: the partition-function formalism. This is where the softmax-denominator = `Z` bridge is
  grounded — the claim that one `Z` spans the embedding objective and the inference downstream.

## Block 4 · Weeks 7–8 — P3 Bayesian (BLL-HMC)
Gate: `R̂ ≈ 1` / healthy ESS?

- **`gal2016` — Gal & Ghahramani (2016), *Dropout as a Bayesian Approximation*** (ICML, PMLR 48, 1050).
  Extract: the epistemic-uncertainty framing and the cheap MC-dropout approximation — useful as a
  baseline sanity check alongside the BLL-HMC σ's.
- **`rospel2025` — Röspel, Schlosser & Schäfer (2025), *… Normalising Flows***.
  Extract: how a normalising flow approximates a non-Gaussian Bayesian partition *without* sampler
  mixing — this is the fallback if HMC repeats the mk2 collapse (ESS=5, R̂=9–189).
- **`kuntz2024` — (revisit).** Now for the floor: extract the entropy/effective-dimension diagnostics
  that define `H(p_k)`, the physics-derived floor the posterior is rendered against.

## Block 5 · Weeks 9–10 — Integration + review

- **`gn2_2026` — ATLAS Collaboration (2026), *Transforming Jet Flavour Tagging (GN2)*** (Nat. Commun. 17, 541).
  Extract: GN2's architecture and what it optimizes — the ATLAS baseline HELIX positions against. Read
  when writing the "vs. GN2" framing for the sprint review, so the distinction (information-theoretic
  grounding, epistemic metrics) is stated against the real thing.

---

### Author-cluster note
Kasieczka appears on both `jetclr2022` and `abcddisco2021`; Nachman on both `abcddisco2021` and
`cwola2017`. The contrastive-HEP and ABCD-decorrelation lines share authorship — worth noting when you
position HELIX relative to that community.
