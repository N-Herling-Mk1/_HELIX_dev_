#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════
#  HELIX · Week 0 spike · BARREL POISSON SNIFF                   mk_1
# --------------------------------------------------------------------
#  Question it kills:  is the Round-2 barrel failure (r(S,NN2)=0.27)
#  really a wrong-prior problem? Round 2 put GAUSSIAN priors on integer
#  COUNT features (nMDT/nRPC/nTGC/nBOL) — the wrong MaxEnt solution for
#  Z>=0 count data. This refits the surprise with POISSON priors on the
#  counts and checks whether r(S,NN2) drops toward independence.
#
#  Metric : Pearson r between MaxEnt surprise S(x) and the NN2 score,
#           under (a) Gaussian-everywhere and (b) Poisson-on-counts.
#  Graph  : side-by-side S vs NN2 scatter (Gaussian | Poisson), each
#           annotated with r; reference line at |r_D| = 0.055.
#  Pass   : r drops off 0.27 toward |r_D| = 0.055.
#
#  Surprise model:  S(x) = sum_features  -log p_feature(x)
#    - COUNT features      : Poisson(mu = mean)        [Round-3]
#                            vs Gaussian(mu, sigma)    [Round-2 baseline]
#    - CONTINUOUS features : Gaussian(mu, sigma) in both models
#  MaxEnt rationale: Poisson is the max-entropy law for a non-negative
#  integer with fixed mean; Gaussian is max-entropy only for fixed
#  variance on the real line — wrong support for counts.
# ════════════════════════════════════════════════════════════════════
import sys, time
import numpy as np
import pandas as pd

# ─────────────────────────────  COLUMN MAP  ─────────────────────────────
CONFIG = {
    "CSV_PATH"      : "data/mk3_barrel.csv",   # barrel rows (or full CSV + REGION filter)
    "REGION_COL"    : None,                     # set to a column name to filter, else None
    "REGION_VALUE"  : "barrel",                 # value selecting barrel rows (if REGION_COL set)
    "NN2_COL"       : "nn2",                     # the NN2 discriminant score
    "COUNT_FEATURES": ["nMDT", "nRPC", "nTGC", "nBOL"],   # integer count features
    "CONT_FEATURES" : ["mindR", "m_vtx"],                  # continuous features
    "R_D"           : 0.055,                     # the ABCD-plane reference correlation |r_D|
    "OUT_PNG"       : "barrel_poisson_sniff.png",
}
# ─────────────────────────────────────────────────────────────────────────

_ANSI = {"cyan": "\033[96m", "orange": "\033[38;5;208m", "ok": "\033[92m",
         "warn": "\033[93m", "err": "\033[91m", "dim": "\033[2m", "x": "\033[0m"}
C_CYAN, C_ORANGE, C_AMBER, C_BG, C_PANEL, C_INK = \
    "#00e5ff", "#ff6a00", "#e0b020", "#020c14", "#0a1622", "#b9cdda"

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
    if CONFIG["REGION_COL"]:
        if CONFIG["REGION_COL"] not in df.columns:
            status("columns present:", "dim"); print("   " + ", ".join(df.columns))
            die(f"REGION_COL '{CONFIG['REGION_COL']}' not found.")
        df = df[df[CONFIG["REGION_COL"]] == CONFIG["REGION_VALUE"]].copy()
    status(f"barrel rows: {len(df):,}")
    need = [CONFIG["NN2_COL"]] + CONFIG["COUNT_FEATURES"] + CONFIG["CONT_FEATURES"]
    missing = [c for c in need if c not in df.columns]
    if missing:
        status("columns present:", "dim"); print("   " + ", ".join(df.columns))
        die(f"missing columns {missing}. Fix the COLUMN MAP.")
    if len(df) < 50:
        die(f"only {len(df)} barrel rows — too few for a meaningful correlation.")
    return df

def gauss_surprise(x):
    x = np.asarray(x, float); mu, sd = np.nanmean(x), np.nanstd(x) + 1e-9
    return 0.5*np.log(2*np.pi*sd*sd) + 0.5*((x-mu)/sd)**2     # -log N(x|mu,sd)

def poisson_surprise(k):
    from scipy.special import gammaln
    k = np.asarray(k, float); lam = max(np.nanmean(k), 1e-9)
    return lam - k*np.log(lam) + gammaln(k+1.0)               # -log Pois(k|lam)

def pearson(a, b):
    a = np.asarray(a, float); b = np.asarray(b, float)
    m = np.isfinite(a) & np.isfinite(b); a, b = a[m], b[m]
    if a.size < 3 or np.std(a) == 0 or np.std(b) == 0: return np.nan
    return float(np.corrcoef(a, b)[0, 1])

def main():
    t0 = time.time()
    status("BARREL POISSON SNIFF · mk_1", "orange")
    df = load_csv()
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    counts, conts = CONFIG["COUNT_FEATURES"], CONFIG["CONT_FEATURES"]
    nn2 = df[CONFIG["NN2_COL"]].to_numpy(float)

    status("computing surprise · Round-2 model (Gaussian everywhere) ...")
    S_gauss = np.zeros(len(df))
    allf = counts + conts
    for i, f in enumerate(allf):
        S_gauss += gauss_surprise(df[f].to_numpy())
        bar(i, len(allf))

    status("computing surprise · Round-3 model (Poisson on counts) ...")
    S_pois = np.zeros(len(df))
    for i, f in enumerate(allf):
        if f in counts: S_pois += poisson_surprise(df[f].to_numpy())
        else:           S_pois += gauss_surprise(df[f].to_numpy())
        bar(i, len(allf))

    r_gauss, r_pois = pearson(S_gauss, nn2), pearson(S_pois, nn2)
    rd = CONFIG["R_D"]

    plt.rcParams.update({
        "figure.facecolor": C_BG, "axes.facecolor": C_PANEL, "savefig.facecolor": C_BG,
        "text.color": C_INK, "axes.labelcolor": C_INK, "xtick.color": C_INK,
        "ytick.color": C_INK, "axes.edgecolor": "#1d3145", "font.family": "monospace",
        "axes.titlecolor": C_CYAN,
    })
    fig, ax = plt.subplots(1, 2, figsize=(13, 5.6), sharey=True)
    fig.suptitle("HELIX · Barrel Poisson Sniff — does the wrong prior cause the r(S,NN2) leak? (mk_1)",
                 color=C_CYAN, fontsize=12)
    for a, S, r, ttl, col in [(ax[0], S_gauss, r_gauss, "Round-2 · Gaussian everywhere", C_ORANGE),
                              (ax[1], S_pois,  r_pois,  "Round-3 · Poisson on counts",  C_CYAN)]:
        a.scatter(S, nn2, s=6, alpha=0.35, color=col, edgecolors="none")
        a.set_title(f"{ttl}\nr(S, NN2) = {r:+.3f}", fontsize=10)
        a.set_xlabel("MaxEnt surprise  S(x) = −log p(x)")
        a.axhline(np.nanmean(nn2), color="#41546b", lw=0.8, ls=":")
        a.text(0.02, 0.96, f"|r_D| ref = {rd:.3f}", transform=a.transAxes,
               fontsize=8, color=C_AMBER, va="top")
    ax[0].set_ylabel(f"{CONFIG['NN2_COL']} (NN2 score)")
    fig.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(CONFIG["OUT_PNG"], dpi=130)
    status(f"figure written → {CONFIG['OUT_PNG']}", "ok")

    print()
    status(f"r(S, NN2)  Gaussian (Round-2 baseline) : {r_gauss:+.4f}", "orange")
    status(f"r(S, NN2)  Poisson  (Round-3 fix)      : {r_pois:+.4f}", "orange")
    status(f"target |r_D|                            : {rd:.4f}", "dim")
    if not np.isfinite(r_gauss) or not np.isfinite(r_pois):
        status("could not compute correlations (check for constant/degenerate columns).", "warn")
    elif abs(r_pois) < abs(r_gauss) - 0.05:
        toward = "below |r_D|" if abs(r_pois) <= rd else "toward |r_D|"
        status(f"PASS: Poisson prior pulls the correlation {toward} "
               f"(|r| {abs(r_gauss):.3f} → {abs(r_pois):.3f}). The wrong-prior story is validated; "
               "Round 3 is worth the two weeks.", "ok")
    else:
        status("NOT VALIDATED: Poisson prior did not meaningfully reduce r(S,NN2). "
               "The barrel leak is not (only) a prior-choice problem — the prior story is incomplete.", "warn")
    status(f"done in {time.time()-t0:.1f}s", "dim")

if __name__ == "__main__":
    main()
