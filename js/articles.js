/* ════════════════════════════════════════════
   HELIX — CONTENT REGISTRY
   articles.js · articles, notes, goals per sector

   ACRONYM (updated):
     H · HEP                — High Energy Physics
     E · EPISTEMIC          — Epistemic Learning / uncertainty
     L · LEARNING           — Machine Learning
     I · INFORMATION THEORY — entropy · partition functions · variational inference   ← (was "Intelligent AI")
     X · EXPLORATION        — detector topology · autonomous discovery · frontier

   Article kinds:
     • status:"draft"      → internal write-up. file: local PDF path. VIEW opens it in the in-page viewer.
     • status:"reference"  → external published paper/book. Has url (landing page) + pdf (direct file).
                             VIEW  → opens url in a NEW TAB.
                             DOWNLOAD → fetches pdf, shows it in the viewer, offers a browser download.
════════════════════════════════════════════ */

const HELIX_SECTORS = [
  {
    letter: "H",
    word:   "HEP",
    full:   "High Energy Physics",
    color:  "#00e5ff",
    glow:   "rgba(0,229,255,0.55)",
    ghost:  "rgba(0,229,255,0.06)",
    articles: [
      {
        id:       "h-01",
        title:    "Run 3 Long-Lived Particle Search: MSVtx Displaced Vertex Framework",
        authors:  "N. Herling, K. Johns et al. — UA ATLAS Group",
        year:     "2025",
        tags:     ["ATLAS", "LLP", "RUN 3"],
        abstract: "Search for Hidden Sector Scalars via displaced vertices in the ATLAS inner detector using the MSVtx cutflow framework. Barrel and endcap configurations with four dedicated MLP classifiers achieving GOOD Bayesian HMC quality.",
        file:     "docs/hep/llp_msvtx_run3.pdf",
        status:   "draft"
      },
      {
        id:       "h-02",
        title:    "Bayesian HMC Posterior Analysis of MLP Classifiers for Signal–Background Discrimination",
        authors:  "N. Herling — University of Arizona",
        year:     "2025",
        tags:     ["BAYESIAN", "MLP", "HMC"],
        abstract: "Application of Hamiltonian Monte Carlo posterior sampling to neural network classifiers in an LLP search pipeline. Epistemic uncertainty quantification via RRM penalty vector and k-fold cross-validation.",
        file:     "docs/hep/bayesian_hmc_mlp.pdf",
        status:   "draft"
      },
      {
        id:       "h-03",
        title:    "HTmiss Cut Architecture in CutflowRunner: Threshold Logic and VR Channel Behavior",
        authors:  "N. Herling — UA ATLAS Group",
        year:     "2025",
        tags:     ["CUTFLOW", "HTMISS", "DCS"],
        abstract: "Technical documentation of the 40 GeV HTmiss threshold in CutflowRunnerOneVertex, its suppression via --channel 1VtxRoIVR flag, and absence in CutflowRunnerPunchThrough.",
        file:     "docs/hep/htmiss_architecture.pdf",
        status:   "draft"
      },
      {
        id:       "h-r-01",
        title:    "Search for Events with One Displaced Vertex from Long-Lived Neutral Particles in the ATLAS Muon Spectrometer (√s = 13 TeV)",
        authors:  "ATLAS Collaboration",
        venue:    "Phys. Rev. D (2025) · arXiv:2503.20445",
        year:     "2025",
        tags:     ["ATLAS", "MSVtx", "LLP"],
        abstract: "The ATLAS Collaboration searches the full Run 2 dataset (140 fb⁻¹, 13 TeV) for events with a single displaced vertex from neutral long-lived particles decaying to hadronic jets in the muon spectrometer, 3–14 m from the interaction point. A dedicated vertex-reconstruction algorithm infers the LLP decay point; observed yields are consistent with background and limits are set on benchmark signals. This is the direct published precursor to the single-vertex MSVtx framework.",
        url:      "https://journals.aps.org/prd/abstract/10.1103/cmql-s9sq",
        pdf:      "https://journals.aps.org/prd/pdf/10.1103/cmql-s9sq",
        status:   "reference"
      },
      {
        id:       "h-r-02",
        title:    "Search for Neutral Long-Lived Particles Decaying into Displaced Hadronic Jets in the ATLAS Calorimeter",
        authors:  "ATLAS Collaboration",
        venue:    "arXiv:2203.01009 [hep-ex]",
        year:     "2022",
        tags:     ["ATLAS", "LLP", "DISPLACED JETS"],
        abstract: "A search for pair-produced neutral LLPs decaying hadronically in the ATLAS hadronic calorimeter using 139 fb⁻¹ of 13 TeV data, with dedicated displaced-jet reconstruction and two kinematic search regions. Observed yields match the expected background, excluding Higgs branching ratios above 10% for cτ between 20 mm and 10 m. Cross-section limits are set for scalar masses from 60 GeV up to 1 TeV.",
        url:      "https://arxiv.org/abs/2203.01009",
        pdf:      "https://arxiv.org/pdf/2203.01009",
        status:   "reference"
      },
      {
        id:       "h-r-03",
        title:    "Searches for Unusual Signatures from Dark Sectors with the ATLAS Experiment",
        authors:  "ATLAS Collaboration (conference contribution)",
        venue:    "arXiv:2601.13033 [hep-ex]",
        year:     "2026",
        tags:     ["ATLAS", "DARK SECTOR", "LLP"],
        abstract: "A survey of recent ATLAS searches for unusual experimental signatures motivated by dark-sector models, including new long-lived particles that decay far from the collision point. These signatures are difficult to reconstruct and face atypical, challenging backgrounds. The contribution gathers recent pp-collision results across the dark-sector LLP program.",
        url:      "https://arxiv.org/abs/2601.13033",
        pdf:      "https://arxiv.org/pdf/2601.13033",
        status:   "reference"
      },
      {
        id:       "h-r-04",
        title:    "Background Estimation in the Search for Single Production of Vector-Like Quarks (Wb) with a Data-Driven Method",
        authors:  "M. R. Rahman",
        venue:    "arXiv:2106.03961 [hep-ex]",
        year:     "2021",
        tags:     ["ABCD", "QCD", "ATLAS"],
        abstract: "A thesis presenting a data-driven ABCD background estimate for the hadronic T/Y → Wb channel at 13 TeV (139 fb⁻¹) with ATLAS. Because the QCD multijet background is mismodelled in simulation, the ABCD method estimates it directly from the control regions. A worked example of ABCD applied to a messy hadronic final state.",
        url:      "https://arxiv.org/abs/2106.03961",
        pdf:      "https://arxiv.org/pdf/2106.03961",
        status:   "reference"
      },
      {
        id:       "h-r-05",
        title:    "Background Estimation with the ABCD Method (Featuring the TRooFit Toolkit)",
        authors:  "W. Buttinger et al. — CERN",
        venue:    "CERN Indico · ABCD Guide (draft, 18 Oct)",
        year:     "2018",
        tags:     ["ABCD", "TROOFIT", "CLOSURE"],
        abstract: "A practical guide to the ABCD data-driven background estimation method built around the TRooFit toolkit. It explains the requirement that the two ABCD-plane observables be uncorrelated for background, how to handle signal contamination via a likelihood-based fit, and how to propagate statistical uncertainties. A hands-on reference for setting up an ABCD closure test.",
        url:      "https://indico.cern.ch/event/1122790/contributions/4713580/attachments/2381493/4270369/ABCDGuide_draft18Oct18.pdf",
        pdf:      "https://indico.cern.ch/event/1122790/contributions/4713580/attachments/2381493/4270369/ABCDGuide_draft18Oct18.pdf",
        status:   "reference"
      }
    ],
    notes: [
      {
        id:    "h-n-01",
        date:  "2025-03-11",
        text:  "k-fold CV measures data sensitivity (AUC variance across partitions). Bayesian HMC measures parameter uncertainty (AUC variance across posterior weight samples). Stable k-fold + high Bayesian σ = underdetermined weights — epistemic, fixable with more diverse signal MC."
      },
      {
        id:    "h-n-02",
        date:  "2025-02-17",
        text:  "data24VR confirmed entirely HTmiss<40 by construction at ntuple production. CutflowRunnerPunchThrough uses jet-based selection only — HTmiss cut absent by design. mindR_jetcut eliminates all punch-through events, empty snapshots are physically expected."
      }
    ],
    goals: [
      {
        id:       "h-g-01",
        title:    "Complete mS35 and mS55 cutflow runs",
        desc:     "Run both standard and VR channels. Validate snapshot file sizes.",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "h-g-02",
        title:    "Run all CSVs through mk3 focused models",
        desc:     "Generate P(signal) plots for all four barrel/endcap NN1/NN2 configs.",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "h-g-03",
        title:    "ABCD plane closure check",
        desc:     "Validate background estimation using ABCD method on data24VR snapshots.",
        priority: "MED",
        done:     false
      }
    ]
  },
  {
    letter: "E",
    word:   "EPISTEMIC",
    full:   "Epistemic Learning",
    color:  "#00ffcc",
    glow:   "rgba(0,255,204,0.5)",
    ghost:  "rgba(0,255,204,0.05)",
    articles: [
      {
        id:       "e-01",
        title:    "Maximum Entropy as a Self-Supervised Training Signal: Jaynes (1957) Applied to HEP Cutflows",
        authors:  "N. Herling — University of Arizona",
        year:     "2025",
        tags:     ["MAXENT", "SSL", "JAYNES"],
        abstract: "The InfoNCE loss softmax over negatives is identified as the Boltzmann partition function Z, with temperature τ = 1/β. Per-cut-stage entropy values derived from Jaynes' Maximum Entropy principle provide a physics-grounded training signal and stopping criterion.",
        file:     "docs/epistemic/maxent_ssl_helix.pdf",
        status:   "draft"
      },
      {
        id:       "e-02",
        title:    "Quadratic Root Geometry: Unified Exponential Form and Vieta Hyperbola",
        authors:  "N. Herling — Independent",
        year:     "2025",
        tags:     ["POLYNOMIAL", "ROOT THEORY", "GEOMETRY"],
        abstract: "Roots of the general quadratic admit the unified form r₁,₂ = C·e^{±φ}, revealing a circle/hyperbola duality governed by the discriminant. The (a,b)-parameter space Vieta hyperbola unifies trigonometric and hyperbolic substitution regimes.",
        file:     "docs/epistemic/quadratic_root_geometry.pdf",
        status:   "draft"
      },
      {
        id:       "e-03",
        title:    "Cubic Root Geometry: The Fence Method and Root-First Parameterization",
        authors:  "N. Herling — Independent",
        year:     "2025",
        tags:     ["CUBIC", "FENCE METHOD", "ALGEBRA"],
        abstract: "Root-first parameterization r₁=a+b, r₂=a−b, r₃=−2a combined with the Quadratic Fence Bound establishes outer fence inequalities without circularity. Absorption substitution u=t−p/(3t) transforms the polynomial itself.",
        file:     "docs/epistemic/cubic_fence_method.pdf",
        status:   "draft"
      },
      {
        id:       "e-r-01",
        title:    "Aleatoric and Epistemic Uncertainty in Machine Learning: An Introduction to Concepts and Methods",
        authors:  "E. Hüllermeier, W. Waegeman",
        venue:    "Machine Learning (2021) · arXiv:1910.09457",
        year:     "2021",
        tags:     ["UNCERTAINTY", "EPISTEMIC", "ALEATORIC"],
        abstract: "An introduction to uncertainty in machine learning that distinguishes aleatoric (irreducible, data-inherent) from epistemic (reducible, knowledge/model) uncertainty. The authors review formal approaches to representing and quantifying each, motivated by the rise of safety-critical ML applications. The aleatoric/epistemic split underpins the HELIX Bayesian-HMC interpretation of σ.",
        url:      "https://arxiv.org/abs/1910.09457",
        pdf:      "https://arxiv.org/pdf/1910.09457",
        status:   "reference"
      }
    ],
    notes: [
      {
        id:    "e-n-01",
        date:  "2025-03-15",
        text:  "InfoNCE's softmax denominator IS the Boltzmann partition function Z. Temperature τ = 1/β. This is not an analogy — it is the same mathematical object. Kuntz et al. (2024) provides peer-reviewed scaffolding."
      },
      {
        id:    "e-n-02",
        date:  "2025-02-20",
        text:  "Fence Bound Theorem primary statement: |F−Vx| ≥ |Vx−ri|. Corollary is the bracketing chain. Proof needs rigor — intermediate steps before squaring are missing. Sandwich Bound (Theorem 2) for complex roots is complete."
      }
    ],
    goals: [
      {
        id:       "e-g-01",
        title:    "Read Jaynes Phys.Rev. 106 & 108 (1957)",
        desc:     "Primary theoretical grounding for MaxEnt/Boltzmann-Bayesian equivalence.",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "e-g-02",
        title:    "Complete cubic Fence Method proof rigor",
        desc:     "Fill intermediate steps before squaring in Theorem 1 proof.",
        priority: "MED",
        done:     false
      },
      {
        id:       "e-g-03",
        title:    "Submit cubic paper to Mathematical Gazette",
        desc:     "Target journal: Mathematical Gazette or Mathematical Intelligencer.",
        priority: "LOW",
        done:     false
      }
    ]
  },
  {
    letter: "L",
    word:   "LEARNING",
    full:   "Machine Learning",
    color:  "#00ff41",
    glow:   "rgba(0,255,65,0.65)",
    ghost:  "rgba(0,255,65,0.05)",
    articles: [
      {
        id:       "l-01",
        title:    "Evt2Vec: Self-Supervised LLP Event Representations via Skip-Gram Pretraining",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2025",
        tags:     ["EVT2VEC", "SSL", "SKIP-GRAM"],
        abstract: "Treating MSVtx cutflow trajectories as NLP sentences and cut-stage feature vectors as tokens. InfoNCE-based contrastive pretraining with displaced vertex objects as center tokens and jet/track/MET objects as context.",
        file:     "docs/learning/evt2vec_pretraining.pdf",
        status:   "draft"
      },
      {
        id:       "l-02",
        title:    "CutFormer: Transformer Encoder over Ordered Cutflow Sequences",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2025",
        tags:     ["CUTFORMER", "TRANSFORMER", "CUTFLOW"],
        abstract: "A Transformer encoder applied to the ordered sequence of cutflow stages. RRM-4 penalty vector operationalizes the MaxEnt stopping criterion across AUC, variance, boundary uncertainty, and KL divergence.",
        file:     "docs/learning/cutformer_architecture.pdf",
        status:   "draft"
      },
      {
        id:       "l-03",
        title:    "RRM Penalty Vector: Regularized Robustness Metric for HEP ML Pipelines",
        authors:  "N. Herling — University of Arizona",
        year:     "2025",
        tags:     ["RRM", "REGULARIZATION", "PIPELINE"],
        abstract: "v = [1−AUC, σ_overall/σ_max, σ_boundary/H(p_k), D_KL/D_max]. MaxEnt floor values computed once from MSVtxCutflow CSV snapshots serve as static references.",
        file:     "docs/learning/rrm_penalty_vector.pdf",
        status:   "draft"
      },
      {
        id:       "l-r-01",
        title:    "Visualizing the Loss Landscape of Neural Nets",
        authors:  "H. Li, Z. Xu, G. Taylor, C. Studer, T. Goldstein",
        venue:    "NeurIPS 2018 · arXiv:1712.09913",
        year:     "2018",
        tags:     ["LOSS LANDSCAPE", "GENERALIZATION", "VISUALIZATION"],
        abstract: "Introduces a 'filter-normalization' scheme that makes neural-network loss surfaces comparable across architectures, enabling meaningful side-by-side visual comparisons. Using these visualizations the authors connect landscape geometry — sharpness, flatness, convexity — to trainability and generalization, explaining why choices like skip connections help. A foundational reference for interpreting optimization geometry.",
        url:      "https://arxiv.org/abs/1712.09913",
        pdf:      "https://arxiv.org/pdf/1712.09913",
        status:   "reference"
      }
    ],
    notes: [
      {
        id:    "l-n-01",
        date:  "2025-03-11",
        text:  "Three-variant ablation: mk3 MLP (engineered features), GN2-style set transformer (raw continuous objects), Evt2Vec/CutFormer (cutflow sequences). Recommended tokenization execution order: S3→S4→S1→S2."
      },
      {
        id:    "l-n-02",
        date:  "2025-02-28",
        text:  "RRM metric from INFO 510 CNN+Bayesian music genre classifier maps directly to ATLAS setup via penalty vector. Possible 4D extension adding ABCD closure quality as fourth component."
      }
    ],
    goals: [
      {
        id:       "l-g-01",
        title:    "Stage run_inference_mk3_focused.py",
        desc:     "Run all four mk3 models on new MC mass point CSVs.",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "l-g-02",
        title:    "Build Evt2Vec skip-gram proof of concept",
        desc:     "DV = center token, jets/tracks/MET = context. InfoNCE loss.",
        priority: "MED",
        done:     false
      },
      {
        id:       "l-g-03",
        title:    "Implement CutFormer S3 tokenization",
        desc:     "Cutflow-stage tokenization first — simplest and most interpretable.",
        priority: "MED",
        done:     false
      }
    ]
  },
  {
    letter: "I",
    word:   "INFORMATION THEORY",
    full:   "Information Theory",
    color:  "#b044ff",
    glow:   "rgba(176,68,255,0.5)",
    ghost:  "rgba(176,68,255,0.05)",
    articles: [
      {
        id:       "i-r-01",
        title:    "Information Theory and Statistical Mechanics",
        authors:  "E. T. Jaynes",
        venue:    "Phys. Rev. 106, 620 (1957)",
        year:     "1957",
        tags:     ["MAXENT", "ENTROPY", "FOUNDATIONS"],
        abstract: "Jaynes' landmark paper recasts statistical mechanics as a problem of statistical inference, showing the maximum-entropy distribution is the least-biased assignment consistent with the given constraints. The familiar computational machinery — beginning with the partition function — then follows directly from the maximum-entropy principle. This is the foundational MaxEnt text underpinning the InfoNCE-as-Boltzmann argument in HELIX.",
        url:      "https://files.batistalab.com/teaching/attachments/chem584/Jaynes.pdf",
        pdf:      "https://files.batistalab.com/teaching/attachments/chem584/Jaynes.pdf",
        status:   "reference"
      },
      {
        id:       "i-r-02",
        title:    "Partition Function Approach to Non-Gaussian Likelihoods: Information Theory and State Variables for Bayesian Inference",
        authors:  "R. M. Kuntz, H. von Campe, T. Röspel, M. P. Herzog, B. M. Schäfer",
        venue:    "arXiv:2411.13625 [cond-mat.stat-mech]",
        year:     "2024",
        tags:     ["PARTITION FN", "BAYESIAN", "THERMODYNAMICS"],
        abstract: "Develops a partition-function formalism for Bayesian inference with non-Gaussian likelihoods, treating a Bayes update as a transition between thermodynamic ensembles. Building on Jaynes (1957), it imports the vocabulary of energy, work and heat into inference and derives an information-theoretic reading of Jarzynski's equality. This is the peer-reviewed scaffolding for the Boltzmann–InfoNCE equivalence.",
        url:      "https://arxiv.org/abs/2411.13625",
        pdf:      "https://arxiv.org/pdf/2411.13625",
        status:   "reference"
      },
      {
        id:       "i-r-03",
        title:    "Graphical Models, Exponential Families, and Variational Inference",
        authors:  "M. J. Wainwright, M. I. Jordan",
        venue:    "Found. Trends Mach. Learn. 1(1–2), 1–305 (2008)",
        year:     "2008",
        tags:     ["VARIATIONAL", "EXPONENTIAL FAMILY", "ENTROPY"],
        abstract: "A monograph developing variational representations for inference in graphical models by exploiting the conjugate duality between an exponential family's cumulant (log-partition) function and its entropy. From this single duality it derives sum-product, mean-field, expectation-propagation and other algorithms as exact or approximate variational methods. The reference text tying entropy, partition functions and inference together.",
        url:      "https://people.eecs.berkeley.edu/~jordan/papers/wainwright-jordan-fnt.pdf",
        pdf:      "https://people.eecs.berkeley.edu/~jordan/papers/wainwright-jordan-fnt.pdf",
        status:   "reference"
      },
      {
        id:       "i-r-04",
        title:    "Information Theory: A Tutorial Introduction",
        authors:  "J. V. Stone",
        venue:    "arXiv:1802.05968 [cs.IT]",
        year:     "2018",
        tags:     ["SHANNON", "ENTROPY", "TUTORIAL"],
        abstract: "An informal but rigorous introduction to Shannon's theory of information, defining the fundamental limits on communication between the components of any man-made or biological system. It builds up entropy, channel capacity and coding from first principles, with an annotated reading list for going deeper. A clean on-ramp to the information-theoretic vocabulary used throughout HELIX.",
        url:      "https://arxiv.org/abs/1802.05968",
        pdf:      "https://arxiv.org/pdf/1802.05968",
        status:   "reference"
      }
    ],
    notes: [
      {
        id:    "i-n-01",
        date:  "2025-03-15",
        text:  "Sector re-anchored from 'Intelligent AI' to 'Information Theory'. Core thread: Jaynes MaxEnt → partition function Z → InfoNCE softmax denominator. Kuntz et al. (2024) and Wainwright–Jordan (2008) supply the peer-reviewed bridge between entropy, Z, and Bayesian/variational inference."
      }
    ],
    goals: [
      {
        id:       "i-g-01",
        title:    "Formalize InfoNCE = Boltzmann Z mapping with citations",
        desc:     "Tie e-01 MaxEnt SSL write-up to Jaynes (i-r-01) and Kuntz (i-r-02).",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "i-g-02",
        title:    "Extract entropy/cumulant duality from Wainwright–Jordan",
        desc:     "Map conjugate duality (i-r-03) onto the per-cut-stage entropy floor.",
        priority: "MED",
        done:     false
      }
    ]
  },
  {
    letter: "X",
    word:   "EXPLORATION",
    full:   "Detector Topology · Autonomous Discovery",
    color:  "#ff6a00",
    glow:   "rgba(255,106,0,0.5)",
    ghost:  "rgba(255,106,0,0.06)",
    articles: [
      {
        id:       "x-01",
        title:    "ATLAS SRTM Board DCS Monitoring: WinCC OA GUI Architecture",
        authors:  "N. Herling, E. Cheu, K. Johns — UA ATLAS Group",
        year:     "2025",
        tags:     ["SRTM", "DCS", "WINCC"],
        abstract: "SRTM_Monitor_v3 project for ATLAS SRTM board health monitoring. OPC UA driver conflict resolution, X11 forwarding via PuTTY, thermal alert threshold architecture.",
        file:     "docs/exploration/srtm_dcs_gui.pdf",
        status:   "draft"
      },
      {
        id:       "x-02",
        title:    "CERN Detector Data Topology: Graph Representations of ATLAS Inner Detector Events",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2025",
        tags:     ["TOPOLOGY", "GRAPH", "INNER DETECTOR"],
        abstract: "Geometric and topological characterization of particle physics events as graph structures. Node features from track parameters, edge features from angular separations, global features from MET.",
        file:     "docs/exploration/detector_topology_graphs.pdf",
        status:   "draft"
      },
      {
        id:       "x-03",
        title:    "DOE Genesis Phase I: Expedited Discovery from Petabyte-Scale ATLAS Datasets",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2026",
        tags:     ["GENESIS", "DOE", "14C"],
        abstract: "Phase I proposal for DE-FOA-0003612 Topic 14C. HELIX framework positioned as infrastructure for petabyte-scale LLP signal extraction via Evt2Vec/CutFormer with MaxEnt stopping criteria.",
        file:     "docs/exploration/doe_genesis_14c.pdf",
        status:   "draft"
      },
      {
        id:       "x-04",
        title:    "HELIX as an Autonomous HEP Analysis Agent: Architecture and Deployment",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2025",
        tags:     ["AGENT", "AUTOMATION", "HEP"],
        abstract: "System design for autonomous execution of MSVtx cutflow pipelines, Bayesian HMC inference, and adaptive hyperparameter tuning. Agent loop integrates Evt2Vec representations with real-time posterior feedback. (Relocated here from the former 'Intelligent AI' sector.)",
        file:     "docs/exploration/helix_agent_architecture.pdf",
        status:   "draft"
      },
      {
        id:       "x-05",
        title:    "Pelagic Voice Interface: Wake-Word, Whisper ASR, and Piper TTS Pipeline",
        authors:  "N. Herling — Independent",
        year:     "2025",
        tags:     ["VOICE", "ASR", "TTS"],
        abstract: "Local voice assistant pipeline using openWakeWord for detection, Whisper for transcription, and Piper for synthesis. WAV generation confirmed operational; interactive TTS playback and full pipeline merge architecture. (Relocated here from the former 'Intelligent AI' sector.)",
        file:     "docs/exploration/pelagic_voice_pipeline.pdf",
        status:   "draft"
      },
      {
        id:       "x-r-01",
        title:    "Building an AI-Native Research Ecosystem for Experimental Particle Physics: A Community Vision",
        authors:  "AI-Native HEP Community",
        venue:    "arXiv:2602.17582",
        year:     "2026",
        tags:     ["AI-NATIVE", "HL-LHC", "VISION"],
        abstract: "A community whitepaper laying out a vision for an AI-native research ecosystem in experimental particle physics and the grand challenges where AI could accelerate discovery. It argues that facilities under construction — HL-LHC, DUNE, EIC — can both use and stress-test the vision, with FCC-ee, IceCube-Gen2 and a muon collider as longer-term proving grounds. Frames where an agent framework like HELIX fits the field-wide roadmap.",
        url:      "https://arxiv.org/abs/2602.17582",
        pdf:      "https://arxiv.org/pdf/2602.17582",
        status:   "reference"
      },
      {
        id:       "x-r-02",
        title:    "AI Agents Can Already Autonomously Perform Experimental High Energy Physics",
        authors:  "E. A. Moreno, S. Bright-Thonney, A. Novak, D. Garcia, P. Harris",
        venue:    "arXiv:2603.20179 [hep-ex]",
        year:     "2026",
        tags:     ["AGENT", "LLM", "AUTONOMY"],
        abstract: "Shows that LLM-based coding agents (Claude Code) can already autonomously execute most stages of a HEP analysis — event selection, background estimation, uncertainty quantification, inference, and paper drafting — given a dataset, an execution framework, and prior literature. The authors argue the field underestimates current agent capability and that most proposed workflows are too narrowly scaffolded. Their 'Just Furnish Context' (JFC) framework is a direct analogue of the HELIX autonomous-analysis vision.",
        url:      "https://arxiv.org/abs/2603.20179",
        pdf:      "https://arxiv.org/pdf/2603.20179",
        status:   "reference"
      }
    ],
    notes: [
      {
        id:    "x-n-01",
        date:  "2025-02-10",
        text:  "SRTM_Monitor_v3: OPC UA driver must use -num 2 to avoid conflict with WCCILsim. PVSS_II_ROOT=/home/monitor workaround for pvssInst.conf. X11 via PuTTY SSH forwarding, LIBGL_ALWAYS_SOFTWARE=1."
      },
      {
        id:    "x-n-02",
        date:  "2026-03-01",
        text:  "DOE Genesis target: Topic 14C, DE-FOA-0003612, ~$294M program. HELIX differentiator over existing proposals: explicit Jaynes/MaxEnt grounding + Boltzmann-InfoNCE equivalence validated by Kuntz et al. (2024). Deadline: April 28, 2026."
      }
    ],
    goals: [
      {
        id:       "x-g-01",
        title:    "DOE Genesis Phase I submission",
        desc:     "DE-FOA-0003612 Topic 14C. Deadline: April 28, 2026.",
        priority: "HIGH",
        done:     false
      },
      {
        id:       "x-g-02",
        title:    "Contact Dylan Rankin (UPenn) re: SSL collaboration",
        desc:     "Natural collaboration target — SSL for HEP, Genesis deck contributor.",
        priority: "MED",
        done:     false
      }
    ]
  }
];
