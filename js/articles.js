/* ════════════════════════════════════════════
   HELIX — CONTENT REGISTRY  ·  articles.js
   Per-sector reference collection (external papers / textbooks).
   Each reference: url (home page) + pdf (direct file) + status:"reference".
   docKey links an entry to its content/references.json id (documentation
   bibliography). INVARIANT: every references.json id appears here as a docKey,
   so the HELIX database is a superset of the documentation references.
════════════════════════════════════════════ */

const HELIX_SECTORS = [
  {
    "letter": "H",
    "word": "HEP",
    "full": "High Energy Physics",
    "color": "#00e5ff",
    "glow": "rgba(0,229,255,0.55)",
    "ghost": "rgba(0,229,255,0.06)",
    "articles": [
      {
        "id": "h-r-01",
        "title": "Search for Events with One Displaced Vertex from Long-Lived Neutral Particles in the ATLAS Muon Spectrometer (√s = 13 TeV)",
        "authors": "ATLAS Collaboration",
        "year": "2025",
        "tags": [
          "ATLAS",
          "MSVtx",
          "LLP"
        ],
        "abstract": "The ATLAS Collaboration searches the full Run 2 dataset (140 fb⁻¹, 13 TeV) for events with a single displaced vertex from neutral long-lived particles decaying to hadronic jets in the muon spectrometer, 3–14 m from the interaction point. A dedicated vertex-reconstruction algorithm infers the LLP decay point; observed yields are consistent with background and limits are set on benchmark signals. This is the direct published precursor to the single-vertex MSVtx framework.",
        "venue": "Phys. Rev. D (2025) · arXiv:2503.20445",
        "url": "https://journals.aps.org/prd/abstract/10.1103/cmql-s9sq",
        "pdf": "https://journals.aps.org/prd/pdf/10.1103/cmql-s9sq",
        "status": "reference"
      },
      {
        "id": "h-r-02",
        "title": "Search for Neutral Long-Lived Particles Decaying into Displaced Hadronic Jets in the ATLAS Calorimeter",
        "authors": "ATLAS Collaboration",
        "year": "2022",
        "tags": [
          "ATLAS",
          "LLP",
          "DISPLACED JETS"
        ],
        "abstract": "A search for pair-produced neutral LLPs decaying hadronically in the ATLAS hadronic calorimeter using 139 fb⁻¹ of 13 TeV data, with dedicated displaced-jet reconstruction and two kinematic search regions. Observed yields match the expected background, excluding Higgs branching ratios above 10% for cτ between 20 mm and 10 m. Cross-section limits are set for scalar masses from 60 GeV up to 1 TeV.",
        "venue": "arXiv:2203.01009 [hep-ex]",
        "url": "https://arxiv.org/abs/2203.01009",
        "pdf": "https://arxiv.org/pdf/2203.01009",
        "status": "reference"
      },
      {
        "id": "h-r-03",
        "title": "Searches for Unusual Signatures from Dark Sectors with the ATLAS Experiment",
        "authors": "ATLAS Collaboration (conference contribution)",
        "year": "2026",
        "tags": [
          "ATLAS",
          "DARK SECTOR",
          "LLP"
        ],
        "abstract": "A survey of recent ATLAS searches for unusual experimental signatures motivated by dark-sector models, including new long-lived particles that decay far from the collision point. These signatures are difficult to reconstruct and face atypical, challenging backgrounds. The contribution gathers recent pp-collision results across the dark-sector LLP program.",
        "venue": "arXiv:2601.13033 [hep-ex]",
        "url": "https://arxiv.org/abs/2601.13033",
        "pdf": "https://arxiv.org/pdf/2601.13033",
        "status": "reference"
      },
      {
        "id": "h-r-04",
        "title": "Background Estimation in the Search for Single Production of Vector-Like Quarks (Wb) with a Data-Driven Method",
        "authors": "M. R. Rahman",
        "year": "2021",
        "tags": [
          "ABCD",
          "QCD",
          "ATLAS"
        ],
        "abstract": "A thesis presenting a data-driven ABCD background estimate for the hadronic T/Y → Wb channel at 13 TeV (139 fb⁻¹) with ATLAS. Because the QCD multijet background is mismodelled in simulation, the ABCD method estimates it directly from the control regions. A worked example of ABCD applied to a messy hadronic final state.",
        "venue": "arXiv:2106.03961 [hep-ex]",
        "url": "https://arxiv.org/abs/2106.03961",
        "pdf": "https://arxiv.org/pdf/2106.03961",
        "status": "reference"
      },
      {
        "id": "h-r-05",
        "title": "Background Estimation with the ABCD Method (Featuring the TRooFit Toolkit)",
        "authors": "W. Buttinger et al. — CERN",
        "year": "2018",
        "tags": [
          "ABCD",
          "TROOFIT",
          "CLOSURE"
        ],
        "abstract": "A practical guide to the ABCD data-driven background estimation method built around the TRooFit toolkit. It explains the requirement that the two ABCD-plane observables be uncorrelated for background, how to handle signal contamination via a likelihood-based fit, and how to propagate statistical uncertainties. A hands-on reference for setting up an ABCD closure test.",
        "venue": "CERN Indico · ABCD Guide (draft, 18 Oct)",
        "url": "https://indico.cern.ch/event/1122790/contributions/4713580/",
        "pdf": "https://indico.cern.ch/event/1122790/contributions/4713580/attachments/2381493/4270369/ABCDGuide_draft18Oct18.pdf",
        "status": "reference"
      },
      {
        "status": "reference",
        "id": "h-r-06",
        "docKey": "gn2_2026",
        "title": "Transforming Jet Flavour Tagging at ATLAS (GN2)",
        "authors": "ATLAS Collaboration",
        "year": 2026,
        "tags": [
          "GN2",
          "FLAVOUR TAGGING",
          "ATLAS"
        ],
        "venue": "Nature Commun. 17, 541 · arXiv:2505.19689",
        "abstract": "Presents GN2, ATLASs transformer-based flavour-tagging algorithm and the current state of the art for b/c-jet identification at the LHC. HELIX positions against GN2 — differentiating not on raw tagging power but on quantified epistemic error.",
        "url": "https://doi.org/10.1038/s41467-025-65059-6",
        "pdf": "https://arxiv.org/pdf/2505.19689"
      },
      {
        "status": "reference",
        "id": "h-r-07",
        "docKey": "abcddisco2021",
        "title": "ABCDisCo: Automating the ABCD Method with Machine Learning",
        "authors": "G. Kasieczka, B. Nachman, M. D. Schwartz & D. Shih",
        "year": 2021,
        "tags": [
          "ABCD",
          "DISCO",
          "BACKGROUND"
        ],
        "venue": "Phys. Rev. D 103, 035021 · arXiv:2007.14400",
        "abstract": "Automates the data-driven ABCD background-estimation method by training two discriminators decorrelated with a distance-correlation (DisCo) penalty. It shows the methods accuracy hinges on low signal contamination in the control regions, underpinning HELIXs ABCD-orthogonality checks.",
        "url": "https://doi.org/10.1103/PhysRevD.103.035021",
        "pdf": "https://arxiv.org/pdf/2007.14400"
      },
      {
        "status": "reference",
        "id": "h-r-08",
        "docKey": "cwola2017",
        "title": "Classification Without Labels: Learning from Mixed Samples in High Energy Physics (CWoLa)",
        "authors": "E. M. Metodiev, B. Nachman & J. Thaler",
        "year": 2017,
        "tags": [
          "CWOLA",
          "WEAK SUPERVISION",
          "HEP-ML"
        ],
        "venue": "JHEP 10, 174 · arXiv:1708.02949",
        "abstract": "CWoLa trains classifiers to separate two mixed samples of unknown signal/background proportion, requiring no per-event labels. It enables training on real data and avoids learning simulation artifacts — exactly the concern HELIXs MaxEnt and WEAT cross-checks are built to address.",
        "url": "https://doi.org/10.1007/JHEP10(2017)174",
        "pdf": "https://arxiv.org/pdf/1708.02949"
      }
    ],
    "notes": [
      {
        "id": "h-n-01",
        "date": "2025-03-11",
        "text": "k-fold CV measures data sensitivity (AUC variance across partitions). Bayesian HMC measures parameter uncertainty (AUC variance across posterior weight samples). Stable k-fold + high Bayesian σ = underdetermined weights — epistemic, fixable with more diverse signal MC."
      },
      {
        "id": "h-n-02",
        "date": "2025-02-17",
        "text": "data24VR confirmed entirely HTmiss<40 by construction at ntuple production. CutflowRunnerPunchThrough uses jet-based selection only — HTmiss cut absent by design. mindR_jetcut eliminates all punch-through events, empty snapshots are physically expected."
      }
    ],
    "goals": [
      {
        "id": "h-g-01",
        "title": "Complete mS35 and mS55 cutflow runs",
        "desc": "Run both standard and VR channels. Validate snapshot file sizes.",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "h-g-02",
        "title": "Run all CSVs through mk3 focused models",
        "desc": "Generate P(signal) plots for all four barrel/endcap NN1/NN2 configs.",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "h-g-03",
        "title": "ABCD plane closure check",
        "desc": "Validate background estimation using ABCD method on data24VR snapshots.",
        "priority": "MED",
        "done": false
      }
    ]
  },
  {
    "letter": "E",
    "word": "EPISTEMIC",
    "full": "Epistemic Learning",
    "color": "#00ffcc",
    "glow": "rgba(0,255,204,0.5)",
    "ghost": "rgba(0,255,204,0.05)",
    "articles": [
      {
        "id": "e-r-01",
        "title": "Aleatoric and Epistemic Uncertainty in Machine Learning: An Introduction to Concepts and Methods",
        "authors": "E. Hüllermeier, W. Waegeman",
        "year": "2021",
        "tags": [
          "UNCERTAINTY",
          "EPISTEMIC",
          "ALEATORIC"
        ],
        "abstract": "An introduction to uncertainty in machine learning that distinguishes aleatoric (irreducible, data-inherent) from epistemic (reducible, knowledge/model) uncertainty. The authors review formal approaches to representing and quantifying each, motivated by the rise of safety-critical ML applications. The aleatoric/epistemic split underpins the HELIX Bayesian-HMC interpretation of σ.",
        "venue": "Machine Learning (2021) · arXiv:1910.09457",
        "url": "https://arxiv.org/abs/1910.09457",
        "pdf": "https://arxiv.org/pdf/1910.09457",
        "status": "reference"
      },
      {
        "status": "reference",
        "id": "e-r-02",
        "docKey": "gal2016",
        "title": "Dropout as a Bayesian Approximation: Representing Model Uncertainty in Deep Learning",
        "authors": "Y. Gal & Z. Ghahramani",
        "year": 2016,
        "tags": [
          "MC-DROPOUT",
          "BAYESIAN",
          "EPISTEMIC"
        ],
        "venue": "ICML · PMLR 48, 1050 · arXiv:1506.02142",
        "abstract": "Shows that dropout training approximates Bayesian inference in deep Gaussian processes, so epistemic uncertainty can be extracted cheaply from networks already in use (MC-dropout). It legitimized practical Bayesian deep learning and sits in the lineage behind HELIXs Bayesian last layer.",
        "url": "https://arxiv.org/abs/1506.02142",
        "pdf": "https://arxiv.org/pdf/1506.02142"
      },
      {
        "status": "reference",
        "id": "e-r-03",
        "docKey": "caliskan2017",
        "title": "Semantics Derived Automatically from Language Corpora Contain Human-like Biases",
        "authors": "A. Caliskan, J. J. Bryson & A. Narayanan",
        "year": 2017,
        "tags": [
          "WEAT",
          "BIAS",
          "EMBEDDINGS"
        ],
        "venue": "Science 356(6334), 183 · arXiv:1608.07187",
        "abstract": "Introduces the Word-Embedding Association Test (WEAT), showing that embeddings trained on ordinary text reproduce documented human biases. It establishes that a training corpuss statistical regularities — biases included — are necessarily absorbed by learned representations; HELIX adapts WEAT/WEFAT to probe whether a discriminant has learned simulation artifacts rather than physics.",
        "url": "https://doi.org/10.1126/science.aal4230",
        "pdf": "https://arxiv.org/pdf/1608.07187"
      }
    ],
    "notes": [
      {
        "id": "e-n-01",
        "date": "2025-03-15",
        "text": "InfoNCE's softmax denominator IS the Boltzmann partition function Z. Temperature τ = 1/β. This is not an analogy — it is the same mathematical object. Kuntz et al. (2024) provides peer-reviewed scaffolding."
      },
      {
        "id": "e-n-02",
        "date": "2025-02-20",
        "text": "Fence Bound Theorem primary statement: |F−Vx| ≥ |Vx−ri|. Corollary is the bracketing chain. Proof needs rigor — intermediate steps before squaring are missing. Sandwich Bound (Theorem 2) for complex roots is complete."
      }
    ],
    "goals": [
      {
        "id": "e-g-01",
        "title": "Read Jaynes Phys.Rev. 106 & 108 (1957)",
        "desc": "Primary theoretical grounding for MaxEnt/Boltzmann-Bayesian equivalence.",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "e-g-02",
        "title": "Complete cubic Fence Method proof rigor",
        "desc": "Fill intermediate steps before squaring in Theorem 1 proof.",
        "priority": "MED",
        "done": false
      },
      {
        "id": "e-g-03",
        "title": "Submit cubic paper to Mathematical Gazette",
        "desc": "Target journal: Mathematical Gazette or Mathematical Intelligencer.",
        "priority": "LOW",
        "done": false
      }
    ]
  },
  {
    "letter": "L",
    "word": "LEARNING",
    "full": "Machine Learning",
    "color": "#00ff41",
    "glow": "rgba(0,255,65,0.65)",
    "ghost": "rgba(0,255,65,0.05)",
    "articles": [
      {
        "id": "l-r-01",
        "title": "Visualizing the Loss Landscape of Neural Nets",
        "authors": "H. Li, Z. Xu, G. Taylor, C. Studer, T. Goldstein",
        "year": "2018",
        "tags": [
          "LOSS LANDSCAPE",
          "GENERALIZATION",
          "VISUALIZATION"
        ],
        "abstract": "Introduces a 'filter-normalization' scheme that makes neural-network loss surfaces comparable across architectures, enabling meaningful side-by-side visual comparisons. Using these visualizations the authors connect landscape geometry — sharpness, flatness, convexity — to trainability and generalization, explaining why choices like skip connections help. A foundational reference for interpreting optimization geometry.",
        "venue": "NeurIPS 2018 · arXiv:1712.09913",
        "url": "https://arxiv.org/abs/1712.09913",
        "pdf": "https://arxiv.org/pdf/1712.09913",
        "status": "reference"
      },
      {
        "status": "reference",
        "id": "l-r-02",
        "docKey": "mikolov2013",
        "title": "Efficient Estimation of Word Representations in Vector Space",
        "authors": "T. Mikolov, K. Chen, G. Corrado & J. Dean",
        "year": 2013,
        "tags": [
          "WORD2VEC",
          "SKIP-GRAM",
          "EMBEDDINGS"
        ],
        "venue": "ICLR Workshop · arXiv:1301.3781",
        "abstract": "Introduces the skip-gram and CBOW architectures (word2vec) for learning dense word vectors cheaply from large corpora via the distributional hypothesis. The resulting embeddings capture syntactic and semantic regularities through co-occurrence alone; HELIXs Evt2Vec is the word2vec analogue for detector events.",
        "url": "https://arxiv.org/abs/1301.3781",
        "pdf": "https://arxiv.org/pdf/1301.3781"
      },
      {
        "status": "reference",
        "id": "l-r-03",
        "docKey": "oord2018",
        "title": "Representation Learning with Contrastive Predictive Coding",
        "authors": "A. van den Oord, Y. Li & O. Vinyals",
        "year": 2018,
        "tags": [
          "CPC",
          "INFONCE",
          "CONTRASTIVE"
        ],
        "venue": "arXiv:1807.03748 [cs.LG]",
        "abstract": "Introduces Contrastive Predictive Coding and the InfoNCE loss, learning representations by predicting future latents in a shared embedding space with a contrastive objective. The InfoNCE softmax is precisely the object HELIX reads as a Boltzmann partition function — its denominator is Z and the temperature τ plays the role of 1/β.",
        "url": "https://arxiv.org/abs/1807.03748",
        "pdf": "https://arxiv.org/pdf/1807.03748"
      },
      {
        "status": "reference",
        "id": "l-r-04",
        "docKey": "simclr2020",
        "title": "A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)",
        "authors": "T. Chen, S. Kornblith, M. Norouzi & G. Hinton",
        "year": 2020,
        "tags": [
          "SIMCLR",
          "NT-XENT",
          "SSL"
        ],
        "venue": "ICML · PMLR 119, 1597 · arXiv:2002.05709",
        "abstract": "A simple contrastive framework for visual representation learning using heavy augmentation, a projection head, and the temperature-scaled NT-Xent (InfoNCE) loss with large negative batches. Established contrastive self-supervision as competitive with supervised pretraining and sharpened the temperature/negatives recipe HELIX inherits.",
        "url": "https://arxiv.org/abs/2002.05709",
        "pdf": "https://arxiv.org/pdf/2002.05709"
      },
      {
        "status": "reference",
        "id": "l-r-05",
        "docKey": "jetclr2022",
        "title": "Symmetries, Safety, and Self-Supervision (JetCLR)",
        "authors": "B. M. Dillon, G. Kasieczka, H. Olischläger, T. Plehn, P. Sorrenson & L. Vogel",
        "year": 2022,
        "tags": [
          "JETCLR",
          "CONTRASTIVE",
          "HEP-ML"
        ],
        "venue": "SciPost Phys. 12, 188 · arXiv:2108.04253",
        "abstract": "Applies contrastive self-supervision to jet physics, learning permutation-invariant representations of jet constituents with a transformer and physically-motivated augmentations, evaluated by linear probe. It is the existence proof that event-level contrastive representations transfer to detector data, setting the yardstick for HELIXs Evt2Vec → CutFormer.",
        "url": "https://doi.org/10.21468/SciPostPhys.12.6.188",
        "pdf": "https://arxiv.org/pdf/2108.04253"
      }
    ],
    "notes": [
      {
        "id": "l-n-01",
        "date": "2025-03-11",
        "text": "Three-variant ablation: mk3 MLP (engineered features), GN2-style set transformer (raw continuous objects), Evt2Vec/CutFormer (cutflow sequences). Recommended tokenization execution order: S3→S4→S1→S2."
      },
      {
        "id": "l-n-02",
        "date": "2025-02-28",
        "text": "RRM metric from INFO 510 CNN+Bayesian music genre classifier maps directly to ATLAS setup via penalty vector. Possible 4D extension adding ABCD closure quality as fourth component."
      }
    ],
    "goals": [
      {
        "id": "l-g-01",
        "title": "Stage run_inference_mk3_focused.py",
        "desc": "Run all four mk3 models on new MC mass point CSVs.",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "l-g-02",
        "title": "Build Evt2Vec skip-gram proof of concept",
        "desc": "DV = center token, jets/tracks/MET = context. InfoNCE loss.",
        "priority": "MED",
        "done": false
      },
      {
        "id": "l-g-03",
        "title": "Implement CutFormer S3 tokenization",
        "desc": "Cutflow-stage tokenization first — simplest and most interpretable.",
        "priority": "MED",
        "done": false
      }
    ]
  },
  {
    "letter": "I",
    "word": "INFORMATION THEORY",
    "full": "Information Theory",
    "color": "#b044ff",
    "glow": "rgba(176,68,255,0.5)",
    "ghost": "rgba(176,68,255,0.05)",
    "articles": [
      {
        "id": "i-r-01",
        "title": "Information Theory and Statistical Mechanics",
        "authors": "E. T. Jaynes",
        "year": "1957",
        "tags": [
          "MAXENT",
          "ENTROPY",
          "FOUNDATIONS"
        ],
        "abstract": "Jaynes' landmark paper recasts statistical mechanics as a problem of statistical inference, showing the maximum-entropy distribution is the least-biased assignment consistent with the given constraints. The familiar computational machinery — beginning with the partition function — then follows directly from the maximum-entropy principle. This is the foundational MaxEnt text underpinning the InfoNCE-as-Boltzmann argument in HELIX.",
        "venue": "Phys. Rev. 106, 620 (1957)",
        "url": "https://doi.org/10.1103/PhysRev.106.620",
        "pdf": "https://files.batistalab.com/teaching/attachments/chem584/Jaynes.pdf",
        "status": "reference",
        "docKey": "jaynes1957"
      },
      {
        "id": "i-r-02",
        "title": "Partition Function Approach to Non-Gaussian Likelihoods: Information Theory and State Variables for Bayesian Inference",
        "authors": "R. M. Kuntz, H. von Campe, T. Röspel, M. P. Herzog, B. M. Schäfer",
        "year": "2024",
        "tags": [
          "PARTITION FN",
          "BAYESIAN",
          "THERMODYNAMICS"
        ],
        "abstract": "Develops a partition-function formalism for Bayesian inference with non-Gaussian likelihoods, treating a Bayes update as a transition between thermodynamic ensembles. Building on Jaynes (1957), it imports the vocabulary of energy, work and heat into inference and derives an information-theoretic reading of Jarzynski's equality. This is the peer-reviewed scaffolding for the Boltzmann–InfoNCE equivalence.",
        "venue": "arXiv:2411.13625 [cond-mat.stat-mech]",
        "url": "https://arxiv.org/abs/2411.13625",
        "pdf": "https://arxiv.org/pdf/2411.13625",
        "status": "reference",
        "docKey": "kuntz2024"
      },
      {
        "id": "i-r-03",
        "title": "Graphical Models, Exponential Families, and Variational Inference",
        "authors": "M. J. Wainwright, M. I. Jordan",
        "year": "2008",
        "tags": [
          "VARIATIONAL",
          "EXPONENTIAL FAMILY",
          "ENTROPY"
        ],
        "abstract": "A monograph developing variational representations for inference in graphical models by exploiting the conjugate duality between an exponential family's cumulant (log-partition) function and its entropy. From this single duality it derives sum-product, mean-field, expectation-propagation and other algorithms as exact or approximate variational methods. The reference text tying entropy, partition functions and inference together.",
        "venue": "Found. Trends Mach. Learn. 1(1–2), 1–305 (2008)",
        "url": "https://doi.org/10.1561/2200000001",
        "pdf": "https://people.eecs.berkeley.edu/~jordan/papers/wainwright-jordan-fnt.pdf",
        "status": "reference"
      },
      {
        "id": "i-r-04",
        "title": "Information Theory: A Tutorial Introduction",
        "authors": "J. V. Stone",
        "year": "2018",
        "tags": [
          "SHANNON",
          "ENTROPY",
          "TUTORIAL"
        ],
        "abstract": "An informal but rigorous introduction to Shannon's theory of information, defining the fundamental limits on communication between the components of any man-made or biological system. It builds up entropy, channel capacity and coding from first principles, with an annotated reading list for going deeper. A clean on-ramp to the information-theoretic vocabulary used throughout HELIX.",
        "venue": "arXiv:1802.05968 [cs.IT]",
        "url": "https://arxiv.org/abs/1802.05968",
        "pdf": "https://arxiv.org/pdf/1802.05968",
        "status": "reference",
        "docKey": "stone2019"
      },
      {
        "status": "reference",
        "id": "i-r-05",
        "docKey": "rospel2025",
        "title": "Approximating Non-Gaussian Bayesian Partitions with Normalising Flows",
        "authors": "T. Röspel, A. Schlosser & B. M. Schäfer",
        "year": 2025,
        "tags": [
          "NORMALIZING FLOWS",
          "PARTITION FN",
          "INFERENCE"
        ],
        "venue": "arXiv:2501.04791 [astro-ph.CO]",
        "abstract": "Extends the partition-function view of Bayesian inference by using normalising flows to approximate non-Gaussian Bayesian partitions, giving a sampler-free route to the information entropy and related state variables. Demonstrated on cosmological inference, it is the convergence-proof fallback to HMC for HELIXs epistemic-bound program — Röspel cross-validating Kuntz.",
        "url": "https://arxiv.org/abs/2501.04791",
        "pdf": "https://arxiv.org/pdf/2501.04791"
      }
    ],
    "notes": [
      {
        "id": "i-n-01",
        "date": "2025-03-15",
        "text": "Sector re-anchored from 'Intelligent AI' to 'Information Theory'. Core thread: Jaynes MaxEnt → partition function Z → InfoNCE softmax denominator. Kuntz et al. (2024) and Wainwright–Jordan (2008) supply the peer-reviewed bridge between entropy, Z, and Bayesian/variational inference."
      }
    ],
    "goals": [
      {
        "id": "i-g-01",
        "title": "Formalize InfoNCE = Boltzmann Z mapping with citations",
        "desc": "Tie e-01 MaxEnt SSL write-up to Jaynes (i-r-01) and Kuntz (i-r-02).",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "i-g-02",
        "title": "Extract entropy/cumulant duality from Wainwright–Jordan",
        "desc": "Map conjugate duality (i-r-03) onto the per-cut-stage entropy floor.",
        "priority": "MED",
        "done": false
      }
    ]
  },
  {
    "letter": "X",
    "word": "EXPLORATION",
    "full": "Detector Topology · Autonomous Discovery",
    "color": "#ff6a00",
    "glow": "rgba(255,106,0,0.5)",
    "ghost": "rgba(255,106,0,0.06)",
    "articles": [
      {
        "id": "x-r-01",
        "title": "Building an AI-Native Research Ecosystem for Experimental Particle Physics: A Community Vision",
        "authors": "AI-Native HEP Community",
        "year": "2026",
        "tags": [
          "AI-NATIVE",
          "HL-LHC",
          "VISION"
        ],
        "abstract": "A community whitepaper laying out a vision for an AI-native research ecosystem in experimental particle physics and the grand challenges where AI could accelerate discovery. It argues that facilities under construction — HL-LHC, DUNE, EIC — can both use and stress-test the vision, with FCC-ee, IceCube-Gen2 and a muon collider as longer-term proving grounds. Frames where an agent framework like HELIX fits the field-wide roadmap.",
        "venue": "arXiv:2602.17582",
        "url": "https://arxiv.org/abs/2602.17582",
        "pdf": "https://arxiv.org/pdf/2602.17582",
        "status": "reference"
      },
      {
        "id": "x-r-02",
        "title": "AI Agents Can Already Autonomously Perform Experimental High Energy Physics",
        "authors": "E. A. Moreno, S. Bright-Thonney, A. Novak, D. Garcia, P. Harris",
        "year": "2026",
        "tags": [
          "AGENT",
          "LLM",
          "AUTONOMY"
        ],
        "abstract": "Shows that LLM-based coding agents (Claude Code) can already autonomously execute most stages of a HEP analysis — event selection, background estimation, uncertainty quantification, inference, and paper drafting — given a dataset, an execution framework, and prior literature. The authors argue the field underestimates current agent capability and that most proposed workflows are too narrowly scaffolded. Their 'Just Furnish Context' (JFC) framework is a direct analogue of the HELIX autonomous-analysis vision.",
        "venue": "arXiv:2603.20179 [hep-ex]",
        "url": "https://arxiv.org/abs/2603.20179",
        "pdf": "https://arxiv.org/pdf/2603.20179",
        "status": "reference"
      }
    ],
    "notes": [
      {
        "id": "x-n-01",
        "date": "2025-02-10",
        "text": "SRTM_Monitor_v3: OPC UA driver must use -num 2 to avoid conflict with WCCILsim. PVSS_II_ROOT=/home/monitor workaround for pvssInst.conf. X11 via PuTTY SSH forwarding, LIBGL_ALWAYS_SOFTWARE=1."
      },
      {
        "id": "x-n-02",
        "date": "2026-03-01",
        "text": "DOE Genesis target: Topic 14C, DE-FOA-0003612, ~$294M program. HELIX differentiator over existing proposals: explicit Jaynes/MaxEnt grounding + Boltzmann-InfoNCE equivalence validated by Kuntz et al. (2024). Deadline: April 28, 2026."
      }
    ],
    "goals": [
      {
        "id": "x-g-01",
        "title": "DOE Genesis Phase I submission",
        "desc": "DE-FOA-0003612 Topic 14C. Deadline: April 28, 2026.",
        "priority": "HIGH",
        "done": false
      },
      {
        "id": "x-g-02",
        "title": "Contact Dylan Rankin (UPenn) re: SSL collaboration",
        "desc": "Natural collaboration target — SSL for HEP, Genesis deck contributor.",
        "priority": "MED",
        "done": false
      }
    ]
  }
];
