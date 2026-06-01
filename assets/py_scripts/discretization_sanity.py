#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════
#  HELIX · Week 0 spike · DISCRETIZATION SANITY                  mk_1
# --------------------------------------------------------------------
#  Question it kills:  does binning continuous detector features into
#  tokens destroy signal/background separation? If KBinsDiscretizer
#  erases the discriminating power, the whole "numbers as tokens"
#  premise needs rethinking BEFORE Week 1 — not after.
#
#  Metric : per-feature 1-D AUC and KS statistic, raw vs. binned.
#  Graph  : overlaid sig/bkg histograms (raw | binned) per feature,
#           AUC + KS annotated, TRON palette.
#  Pass   : binned AUC ~ raw AUC (no collapse).
#
#  Schema : set the COLUMN_MAP below to your real mk3 CSV columns.
#           The script reads the header, prints the columns it sees,
#           and fails LOUDLY (not silently) on a wrong name.
# ════════════════════════════════════════════════════════════════════
import sys, time
import numpy as np
import pandas as pd

# ─────────────────────────────  COLUMN MAP  ─────────────────────────────
# EDIT THESE to match your mk3 CSV. Nothing else below needs changing.
CONFIG = {
    "CSV_PATH"     : "data/mk3.csv",     # <-- path to your flat CSV
    "LABEL_COL"    : "label",            # <-- signal/background column
    "SIGNAL_VALUE" : 1,                  # <-- value of LABEL_COL meaning "signal"
    # features to test (continuous columns you intend to tokenize):
    "FEATURES"     : ["Lxy", "d0", "m_vtx", "nSeg"],
    "N_BINS"       : 16,                 # KBinsDiscretizer bins
    "BIN_STRATEGY" : "quantile",         # 'quantile' | 'uniform' | 'kmeans'
    "OUT_PNG"      : "discretization_sanity.png",
}
# ─────────────────────────────────────────────────────────────────────────

# ── TRON aesthetic + progress UI ──
C_CYAN, C_ORANGE, C_AMBER = "#00e5ff", "#ff6a00", "#e0b020"
C_BG, C_PANEL, C_INK = "#020c14", "#0a1622", "#b9cdda"
_ANSI = {"cyan": "\033[96m", "orange": "\033[38;5;208m", "ok": "\033[92m",
         "warn": "\033[93m", "err": "\033[91m", "dim": "\033[2m", "x": "\033[0m"}

def status(msg, kind="cyan"):
    print(f"{_ANSI.get(kind,'')}[HELIX]{_ANSI['x']} {msg}", flush=True)

def die(msg):
    print(f"{_ANSI['err']}[HELIX:FATAL]{_ANSI['x']} {msg}", flush=True)
    sys.exit(1)

def bar(i, n, w=34):
    f = int(w * (i + 1) / n); pct = 100 * (i + 1) / n
    sys.stdout.write(f"\r{_ANSI['orange']}  [{'█'*f}{'·'*(w-f)}] {pct:5.1f}%{_ANSI['x']}")
    sys.stdout.flush()
    if i + 1 == n: sys.stdout.write("\n")

def load_csv():
    try:
        import os
        if not os.path.exists(CONFIG["CSV_PATH"]):
            die(f"CSV not found: {CONFIG['CSV_PATH']}  (set CONFIG['CSV_PATH'])")
        df = pd.read_csv(CONFIG["CSV_PATH"])
    except Exception as e:
        die(f"could not read CSV: {e}")
    status(f"loaded {len(df):,} rows × {df.shape[1]} cols from {CONFIG['CSV_PATH']}")
    cols = list(df.columns)
    # validate schema loudly
    need = [CONFIG["LABEL_COL"]] + CONFIG["FEATURES"]
    missing = [c for c in need if c not in cols]
    if missing:
        status("columns present in the CSV:", "dim")
        print("   " + ", ".join(cols))
        die(f"missing columns {missing}. Fix the COLUMN MAP at the top of the script.")
    return df

def auc_1d(x, y):
    """Rank-based 1-D AUC (Mann–Whitney), direction-agnostic."""
    from scipy.stats import rankdata
    x = np.asarray(x, float); y = np.asarray(y).astype(bool)
    m = np.isfinite(x)
    x, y = x[m], y[m]
    n_pos, n_neg = int(y.sum()), int((~y).sum())
    if n_pos == 0 or n_neg == 0: return np.nan
    r = rankdata(x)
    auc = (r[y].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)
    return max(auc, 1 - auc)  # report separation, not direction

def ks_stat(x, y):
    from scipy.stats import ks_2samp
    x = np.asarray(x, float); y = np.asarray(y).astype(bool)
    m = np.isfinite(x); x, y = x[m], y[m]
    if y.sum() == 0 or (~y).sum() == 0: return np.nan
    return ks_2samp(x[y], x[~y]).statistic

def main():
    t0 = time.time()
    status("DISCRETIZATION SANITY · mk_1", "orange")
    df = load_csv()

    try:
        from sklearn.preprocessing import KBinsDiscretizer
    except Exception as e:
        die(f"scikit-learn required: {e}")

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    y = (df[CONFIG["LABEL_COL"]] == CONFIG["SIGNAL_VALUE"]).to_numpy()
    status(f"signal rows: {int(y.sum()):,}   background rows: {int((~y).sum()):,}")
    feats = CONFIG["FEATURES"]

    plt.rcParams.update({
        "figure.facecolor": C_BG, "axes.facecolor": C_PANEL, "savefig.facecolor": C_BG,
        "text.color": C_INK, "axes.labelcolor": C_INK, "xtick.color": C_INK,
        "ytick.color": C_INK, "axes.edgecolor": "#1d3145", "font.family": "monospace",
        "axes.titlecolor": C_CYAN,
    })
    fig, axes = plt.subplots(2, len(feats), figsize=(4.0 * len(feats), 7), squeeze=False)
    fig.suptitle("HELIX · Discretization Sanity (mk_1)", color=C_CYAN, fontsize=13, y=0.98)

    summary = []
    status("scanning features ...")
    for j, f in enumerate(feats):
        raw = df[f].to_numpy(dtype=float)
        finite = np.isfinite(raw)
        kb = KBinsDiscretizer(n_bins=CONFIG["N_BINS"], encode="ordinal",
                              strategy=CONFIG["BIN_STRATEGY"])
        binned = np.full_like(raw, np.nan)
        binned[finite] = kb.fit_transform(raw[finite].reshape(-1, 1)).ravel()

        a_raw, a_bin = auc_1d(raw, y), auc_1d(binned, y)
        k_raw, k_bin = ks_stat(raw, y), ks_stat(binned, y)
        summary.append((f, a_raw, a_bin, k_raw, k_bin))

        for r, (vals, lab, ttl) in enumerate([(raw, "raw", f"{f} · raw"),
                                              (binned, "binned", f"{f} · binned")]):
            ax = axes[r][j]
            v = vals[np.isfinite(vals)]; yy = y[np.isfinite(vals)]
            lo, hi = np.percentile(v, [0.5, 99.5]) if v.size else (0, 1)
            bins = np.linspace(lo, hi, 40) if lab == "raw" else np.arange(-0.5, CONFIG["N_BINS"] + 0.5)
            ax.hist(v[yy], bins=bins, color=C_ORANGE, alpha=0.6, density=True, label="signal")
            ax.hist(v[~yy], bins=bins, color=C_CYAN, alpha=0.5, density=True, label="bkg")
            auc = a_raw if lab == "raw" else a_bin
            ks = k_raw if lab == "raw" else k_bin
            ax.set_title(f"{ttl}\nAUC={auc:.3f}  KS={ks:.3f}", fontsize=9)
            if r == 0 and j == 0: ax.legend(fontsize=7, framealpha=0.2)
            ax.tick_params(labelsize=7)
        bar(j, len(feats))

    fig.tight_layout(rect=[0, 0, 1, 0.96])
    fig.savefig(CONFIG["OUT_PNG"], dpi=130)
    status(f"figure written → {CONFIG['OUT_PNG']}", "ok")

    # verdict table
    print()
    status("per-feature separation (raw → binned):", "orange")
    print(f"   {'feature':<12} {'AUC_raw':>8} {'AUC_bin':>8} {'ΔAUC':>7}   {'KS_raw':>7} {'KS_bin':>7}")
    worst = 0.0
    for f, ar, ab, kr, kb_ in summary:
        d = (ab - ar)
        worst = min(worst, d)
        flag = "" if abs(d) < 0.02 else ("  <-- watch" if d < 0 else "")
        print(f"   {f:<12} {ar:8.3f} {ab:8.3f} {d:+7.3f}   {kr:7.3f} {kb_:7.3f}{flag}")
    print()
    if worst < -0.03:
        status(f"WARNING: a feature lost >0.03 AUC under binning (Δ={worst:+.3f}). "
               "Tune N_BINS / strategy before trusting tokenization.", "warn")
    else:
        status("PASS: binning preserves separation across tested features.", "ok")
    status(f"done in {time.time()-t0:.1f}s", "dim")

if __name__ == "__main__":
    main()
