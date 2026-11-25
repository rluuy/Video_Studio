// Carving engine: the removal is the planner's own model, a sum of footprint stamps scaled by dwell.
// Each dwell point keeps the dwell already applied; moving to a new time adds (target - applied) x kernel at
// the point's anchor, so frames can be rendered in any order and the sum stays exact (float64 buffer).
export class Carver {
  constructor({ nx, ny, K, kRows, kCols, i0, j0 }) {
    Object.assign(this, { nx, ny, K, kRows, kCols, i0, j0 });
    this.buf = new Float64Array(nx * ny);
  }
  stamp(ra, ca, amount) {
    if (amount === 0) return;
    const { nx, ny, K, kRows, kCols } = this;
    const r0 = ra + this.i0, c0 = ca + this.j0;
    const rs = Math.max(0, -r0), re = Math.min(kRows, ny - r0), cs = Math.max(0, -c0), ce = Math.min(kCols, nx - c0);
    for (let i = rs; i < re; i++) {
      const bo = (r0 + i) * nx + c0, ko = i * kCols;
      for (let j = cs; j < ce; j++) this.buf[bo + j] += amount * K[ko + j];
    }
  }
  clear() { this.buf.fill(0); }
}

/** dwell points with anchors and a record of the dwell already applied */
export class PointSet {
  constructor(carver, anchorsR, anchorsC, total) {
    this.carver = carver; this.r = anchorsR; this.c = anchorsC; this.total = total;
    this.applied = new Float64Array(total.length);
  }
  set(p, dwell) {
    const d = dwell - this.applied[p];
    if (Math.abs(d) > 1e-15) { this.carver.stamp(this.r[p], this.c[p], d); this.applied[p] = dwell; }
  }
}

/** cubic Hermite position and velocity on one PVT segment */
export function hermite(pa, va, pb, vb, dt, s) {
  const s2 = s * s, s3 = s2 * s;
  const x = (2 * s3 - 3 * s2 + 1) * pa + (s3 - 2 * s2 + s) * dt * va + (-2 * s3 + 3 * s2) * pb + (s3 - s2) * dt * vb;
  const v = ((6 * s2 - 6 * s) * pa + (3 * s2 - 4 * s + 1) * dt * va + (-6 * s2 + 6 * s) * pb + (3 * s2 - 2 * s) * dt * vb) / dt;
  return [x, v];
}

/**
 * Schedule of one correction: n passes of the recorded one-pass motion program.
 * rows[r] = {p, v, t, forward, y_mm}; cells k = 0..ncol-1 run between PVT points k+2 and k+3.
 * Dwell clock D counts beam time over cells only (run-in and run-out are skipped).
 */
export class Schedule {
  constructor(rows, ncol, nPass) {
    this.rows = rows; this.ncol = ncol; this.nPass = nPass;
    this.rowStart = []; let acc = 0;
    for (const r of rows) { this.rowStart.push(acc); acc += r.t[ncol + 2] - r.t[2]; }
    this.passDur = acc; this.total = acc * nPass;
  }
  /** state at dwell clock D: pass, row, cell, fraction within the cell, beam x (plan mm), y, speed */
  at(D) {
    const { rows, ncol, nPass, passDur } = this;
    if (D >= this.total) {
      const r = rows.length - 1, row = rows[r];
      return { pass: nPass, inPass: passDur, row: r, cell: ncol - 1, frac: 1, x: row.p[ncol + 2], y: row.y_mm, v: 0, done: true, order: rows.length * ncol };
    }
    D = Math.max(0, D);
    const pass = Math.floor(D / passDur), d = D - pass * passDur;
    let r = 0; while (r + 1 < rows.length && this.rowStart[r + 1] <= d) r++;
    const row = rows[r], tau = row.t[2] + (d - this.rowStart[r]);
    let lo = 2, hi = ncol + 2;                    // find segment m: t[m] <= tau < t[m+1]
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (row.t[mid] <= tau) lo = mid; else hi = mid; }
    const m = lo, dt = row.t[m + 1] - row.t[m], s = (tau - row.t[m]) / dt;
    const [x, v] = hermite(row.p[m], row.v[m], row.p[m + 1], row.v[m + 1], dt, s);
    const cell = m - 2;
    return { pass, inPass: d, row: r, cell, frac: s, x, y: row.y_mm, v, done: false, order: r * ncol + cell };
  }
  /** dwell column of cell k in row r */
  col(r, k) { return this.rows[r].forward ? k : this.ncol - 1 - k; }
}
