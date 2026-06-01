#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════
#  HELIX · Week 0 spike · CUTFLOW GRAMMAR (BIGRAM)               mk_1
# --------------------------------------------------------------------
#  Question it kills:  does the cutflow carry learnable transition
#  structure — i.e. is there "grammar" for a sequence model to use?
#  If signal and background factorize the same way across cut stages,
#  there is nothing for Evt2Vec/CutFormer to learn from the sequence.
#
#  Metric : cut-stage transition matrices  P(pass c_n | pass c_{n-1})
#           for signal vs. background, plus a divergence summary.
#  Graph  : two transition heatmaps (signal | background) + a signed
#           difference heatmap, TRON palette.
#  Pass   : the two matrices differ structurally → grammar exists.
#
#  Schema : set CUT_STAGES (ordered pass/fail columns) in COLUMN_MAP.
#           Columns may be boolean or 0/1.
# ════════════════════════════════════════════════════════════════════
import sys, time
import numpy as np
import pandas as pd

# ─────────────────────────────  COLUMN MAP  ─────────────────────────────
CONFIG = {
    "CSV_PATH"     : "data/mk3.csv",
    "LABEL_COL"    : "label",
    "SIGNAL_VALUE" : 1,
    # ordered cutflow pass/fail columns, earliest → latest:
    "CUT_STAGES"   : ["cut_trig", "cut_presel", "cut_vtx", "cut_disp", "cut_iso", "cut_final"],
    "TRUE_VALUES"  : [1, True, "1", "pass", "True"],   # values meaning "passed this cut"
    "OUT_PNG"      : "cutflow_bigram.png",
}
# ─────────────────────────────────────────────────────────────────────────

_ANSI = {"cyan": "\033[96m", "orange": "\033[38;5;208m", "ok": "\033[92m",
         "warn": "\033[93m", "err": "\033[91m", "dim": "\033[2m", "x": "\033[0m"}
C_CYAN, C_ORANGE, C_BG, C_PANEL, C_INK = "#00e5ff", "#ff6a00", "#020c14", "#0a1622", "#b9cdda"

def status(m, k="cyan"): print(f"{_ANSI.get(k,'')}[HELIX]{_ANSI['x']} {m}", flush=True)
def die(m): print(f"{_ANSI['err']}[HELIX:FATAL]{_ANSI['x']} {m}", flush=True); sys.exit(1)
def bar(i, n, w=34):
    f = int(w*(i+1)/n)
    sys.stdout.write(f"\r{_ANSI['orange']}  [{'█'*f}{'·'*(w-f)}] {100*(i+1)/n:5.1f}%{_ANSI['x']}")
    sys.stdout.flush()
    if i+1 == n: sys.stdout.write("\n")

def load_csv():
    import os
    if not os.path.exists(CONFIG["CSV_PATH"]):
        die(f"CSV not found: {CONFIG['CSV_PATH']}  (set CONFIG['CSV_PATH'])")
    try:
        df = pd.read_csv(CONFIG["CSV_PATH"])
    except Exception as e:
        die(f"could not read CSV: {e}")
    status(f"loaded {len(df):,} rows × {df.shape[1]} cols")
    need = [CONFIG["LABEL_COL"]] + CONFIG["CUT_STAGES"]
    missing = [c for c in need if c not in df.columns]
    if missing:
        status("columns present:", "dim"); print("   " + ", ".join(df.columns))
        die(f"missing columns {missing}. Fix CUT_STAGES / LABEL_COL in the COLUMN MAP.")
    return df

def as_bool(series):
    tv = set(map(str, CONFIG["TRUE_VALUES"]))
    return series.astype(str).isin(tv).to_numpy()

def transition_matrix(passmat):
    """passmat: (N events × S stages) boolean. Returns S×S where
       T[a,b] = P(pass stage b | pass stage a), columns = next stage."""
    S = passmat.shape[1]
    T = np.full((S, S), np.nan)
    for a in range(S):
        denom = passmat[:, a].sum()
        if denom == 0: continue
        sub = passmat[passmat[:, a]]
        for b in range(S):
            T[a, b] = sub[:, b].mean()
    return T

def main():
    t0 = time.time()
    status("CUTFLOW GRAMMAR (BIGRAM) · mk_1", "orange")
    df = load_csv()
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    y = (df[CONFIG["LABEL_COL"]] == CONFIG["SIGNAL_VALUE"]).to_numpy()
    stages = CONFIG["CUT_STAGES"]
    status("binarizing cut columns ...")
    P = np.column_stack([as_bool(df[c]) for c in stages])
    for i in range(len(stages)): bar(i, len(stages))

    status("building transition matrices ...")
    T_sig = transition_matrix(P[y])
    T_bkg = transition_matrix(P[~y])
    D = T_sig - T_bkg

    # divergence summary (mean abs difference over defined cells)
    finite = np.isfinite(D)
    diverg = float(np.nanmean(np.abs(D[finite]))) if finite.any() else np.nan
    maxcell = np.nanmax(np.abs(D)) if finite.any() else np.nan

    plt.rcParams.update({
        "figure.facecolor": C_BG, "axes.facecolor": C_PANEL, "savefig.facecolor": C_BG,
        "text.color": C_INK, "axes.labelcolor": C_INK, "xtick.color": C_INK,
        "ytick.color": C_INK, "axes.edgecolor": "#1d3145", "font.family": "monospace",
        "axes.titlecolor": C_CYAN,
    })
    fig, ax = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle("HELIX · Cutflow Transition Grammar (mk_1)", color=C_CYAN, fontsize=13)

    def heat(a, M, title, diverging=False):
        cmap = "coolwarm" if diverging else "magma"
        vlim = (np.nanmax(np.abs(M)) if diverging else 1.0)
        im = a.imshow(M, cmap=cmap, vmin=(-vlim if diverging else 0),
                      vmax=vlim if diverging else 1.0, aspect="auto")
        a.set_title(title, fontsize=10)
        a.set_xticks(range(len(stages))); a.set_yticks(range(len(stages)))
        a.set_xticklabels(stages, rotation=45, ha="right", fontsize=7)
        a.set_yticklabels(stages, fontsize=7)
        a.set_xlabel("next stage"); a.set_ylabel("given passed")
        for r in range(M.shape[0]):
            for c in range(M.shape[1]):
                if np.isfinite(M[r, c]):
                    a.text(c, r, f"{M[r,c]:.2f}", ha="center", va="center",
                           fontsize=6, color="#ffffff")
        fig.colorbar(im, ax=a, fraction=0.046, pad=0.04)

    heat(ax[0], T_sig, "P(next | passed) · SIGNAL")
    heat(ax[1], T_bkg, "P(next | passed) · BACKGROUND")
    heat(ax[2], D, "SIGNAL − BACKGROUND", diverging=True)
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(CONFIG["OUT_PNG"], dpi=130)
    status(f"figure written → {CONFIG['OUT_PNG']}", "ok")

    print()
    status(f"mean |ΔP| across cut transitions : {diverg:.4f}", "orange")
    status(f"largest single-cell divergence   : {maxcell:.4f}", "orange")
    if np.isfinite(diverg) and diverg > 0.03:
        status("PASS: signal and background transition grammars differ structurally → "
               "there is grammar for a sequence model to exploit.", "ok")
    else:
        status("INCONCLUSIVE: transition grammars look similar. Either the cutflow is "
               "near-Markov-trivial, or the chosen stages don't separate — revisit CUT_STAGES.", "warn")
    status(f"done in {time.time()-t0:.1f}s", "dim")

if __name__ == "__main__":
    main()
