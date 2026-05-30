/* ════════════════════════════════════════════
   HELIX — CONTENT REGISTRY
   articles.js · articles, notes, goals per sector
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
    word:   "INTELLIGENT AI",
    full:   "AI Agents",
    color:  "#b044ff",
    glow:   "rgba(176,68,255,0.5)",
    ghost:  "rgba(176,68,255,0.05)",
    articles: [
      {
        id:       "i-01",
        title:    "HELIX as an Autonomous HEP Analysis Agent: Architecture and Deployment",
        authors:  "N. Herling — UA ATLAS / HELIX",
        year:     "2025",
        tags:     ["AGENT", "AUTOMATION", "HEP"],
        abstract: "System design for autonomous execution of MSVtx cutflow pipelines, Bayesian HMC inference, and adaptive hyperparameter tuning. Agent loop integrates Evt2Vec representations with real-time posterior feedback.",
        file:     "docs/intelligent/helix_agent_architecture.pdf",
        status:   "draft"
      },
      {
        id:       "i-02",
        title:    "Pelagic Voice Interface: Wake-Word, Whisper ASR, and Piper TTS Pipeline",
        authors:  "N. Herling — Independent",
        year:     "2025",
        tags:     ["VOICE", "ASR", "TTS"],
        abstract: "Local voice assistant pipeline using openWakeWord for detection, Whisper for transcription, and Piper for synthesis. WAV generation confirmed operational; interactive TTS playback and full pipeline merge architecture.",
        file:     "docs/intelligent/pelagic_voice_pipeline.pdf",
        status:   "draft"
      }
    ],
    notes: [
      {
        id:    "i-n-01",
        date:  "2025-03-01",
        text:  "Pelagic pipeline: openWakeWord → Whisper → Piper TTS. Wake word hey_jarvis as prototype. Custom Pelagic instantiate wake word planned via Google Colab training. WAV generation confirmed operational."
      }
    ],
    goals: [
      {
        id:       "i-g-01",
        title:    "Merge Pelagic interactive TTS + full pipeline",
        desc:     "Combine WAV playback with complete wake→transcribe→respond loop.",
        priority: "MED",
        done:     false
      },
      {
        id:       "i-g-02",
        title:    "Train custom Pelagic wake word",
        desc:     "Use Google Colab openWakeWord training pipeline.",
        priority: "LOW",
        done:     false
      }
    ]
  },
  {
    letter: "X",
    word:   "EXPLORATION",
    full:   "Detector Topology & Exploration",
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
