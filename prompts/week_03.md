# HELIX — Week 3 working session  (Mon 6/15 – Fri 6/19)
**Phase:** P2 validation + bias bridge · **Block gate (wk 3–4):** P2 PoC-met

Continuing HELIX with me (Steve). Zip + prior prompts are in the chat — ground in the master plan (§2 P2 gate,
the P2 build notes on event-mixing and WEAT/WEFAT) first.

## Where we are
P1 bigram + P2 barrel are characterized (wk 1–2). This block proves the surprise score is a genuine second
handle and sets up the human-bias probe.

## This week's objective
Demonstrate surprise-score complementarity beyond the endcap and prepare WEAT inputs.

## Tasks
- [ ] Event-mixing prototype on one control region.
- [ ] 1D parametric (`n_Seg` / `m_vtx`) cross-check of surprise independence.
- [ ] (Branch A) signal-MC surprise pass: do mS5/16/35/55 sit in the high-`S` tail?
- [ ] Extract NN1/NN2 penultimate-layer activations as event vectors (WEAT input).

## Inputs / dependencies
- Surprise-score code; NN1/NN2 models; control-region data; signal MC **iff Branch A**.

## Definition of done (week 3)
- Event-mixing + 1D cross-check give a coherent read on independence in the test region.
- NN1/NN2 activation vectors extracted and saved for the WEAT run.

## Start here
Help me design the event-mixing granularity (which level to shuffle, what to hold fixed) — per the master
plan this is an advisor-discussion item, so frame the options I should bring to Prof. Johns.
