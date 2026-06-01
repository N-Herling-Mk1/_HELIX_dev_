# HELIX — Week 5 working session  (Mon 6/29 – Fri 7/3)
**Phase:** P1 Evt2Vec Phase 1 · **Block gate (wk 5–6):** AUC > raw? no collapse?
**FORGE convergence point** — the validated BLL/HMC technique arrives this week.

Continuing HELIX with me (Steve). Zip + prior prompts in chat; ground in the P1 gate and the Evt2Vec/Phase-1
description (EventEncoder, InfoNCE, PhysicsRegionDataset) in the master plan.

## Where we are
P1 bigram and P2 are done (wk 1–4). This block builds the self-supervised embedding — the load-bearing P1
deliverable.

## This week's objective
Get the Evt2Vec InfoNCE encoder training without collapse on real CSVs.

## Tasks
- [ ] EventEncoder + InfoNCE loop on mk3 CSVs (`PhysicsRegionDataset` positive/negative pairs).
- [ ] Collapse diagnostics (embedding rank, alignment/uniformity); first `τ`/`d`/batch points.
- [ ] FORGE convergence: pull the validated BLL/HMC technique into the P3 plan (so wk 7–8 isn't from scratch).

## Inputs / dependencies
- mk3 CSVs; the chosen S1 tokenization from wk 1–2; FORGE's Bayesian-testing output (now available).

## Definition of done (week 5)
- The encoder trains stably (loss decreasing, no embedding collapse) on at least one config.

## Start here
Help me build the `PhysicsRegionDataset` pairing logic and the InfoNCE loss, and decide the collapse metrics
we'll watch. Remember InfoNCE-is-Z: the softmax denominator is the partition function, τ = 1/β.
