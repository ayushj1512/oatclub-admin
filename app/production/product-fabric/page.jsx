"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useFabricStore } from "@/store/fabricStore";

const ROLES = ["main", "lining", "contrast", "padding", "other"];
const UNITS = ["meter", "gram"];

const emptyFabric = () => ({
  fabricCode: "",
  role: "main",
  consumption: { value: 0, unit: "meter" },
  notes: "",
});

const asArray = (v, fb = []) => (Array.isArray(v) ? v : fb);

const getAllSkus = (p) => {
  const s = new Set();
  if (p?.sku) s.add(String(p.sku));
  asArray(p?.variants, []).forEach((v) => v?.sku && s.add(String(v.sku)));
  return Array.from(s);
};

const normalizeFromProduct = (p) => {
  const incoming = asArray(p?.fabrics, []);
  if (!incoming.length) return [emptyFabric()];
  return incoming.map((f) => ({
    fabricCode: String(f?.fabricCode || "").trim(),
    role: String(f?.role || "main"),
    consumption: {
      value: Number(f?.consumption?.value ?? 0),
      unit: String(f?.consumption?.unit || "meter"),
    },
    notes: String(f?.notes || ""),
  }));
};

const dedupe = (arr) => {
  const rows = asArray(arr, []);
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const code = String(r?.fabricCode || "").trim();
    const role = String(r?.role || "main").trim();
    if (!code) continue;
    const key = `${code}__${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.length ? out : [emptyFabric()];
};

export default function ProductFabricTablePage() {
  const products = useAdminProductStore((s) => s.products || []);
  const loading = useAdminProductStore((s) => s.loading);
  const saving = useAdminProductStore((s) => s.saving);

  const fabrics = useFabricStore((s) => s.fabrics || []);
  const fabricsLoading = useFabricStore((s) => s.loading);

  const [search, setSearch] = useState("");
  const [fabricSearch, setFabricSearch] = useState("");
  const [local, setLocal] = useState({}); // { [productId]: fabrics[] }
  const [open, setOpen] = useState({}); // { [productId]: boolean }

  useEffect(() => {
    useAdminProductStore.getState().fetchProducts?.({ page: 1, limit: 50 });
    useFabricStore.getState().fetchFabrics?.({ query: "" });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      useAdminProductStore.getState().fetchProducts?.({
        page: 1,
        limit: 50,
        search: search.trim() || undefined,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      useFabricStore.getState().fetchFabrics?.({ query: fabricSearch });
    }, 250);
    return () => clearTimeout(t);
  }, [fabricSearch]);

  useEffect(() => {
    if (!products.length) return;
    setLocal((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (!next[p._id] || !Array.isArray(next[p._id])) next[p._id] = normalizeFromProduct(p);
      });
      return next;
    });
  }, [products]);

  const fabricOptions = useMemo(() => {
    return asArray(fabrics, [])
      .map((f) => ({
        code: f.code || f.fabricCode || f.fabric_code || "",
        name: f.name || f.title || f.label || "",
      }))
      .filter((x) => x.code);
  }, [fabrics]);

  const toggleOpen = (id) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  const updateFabricRow = (productId, idx, patch) => {
    setLocal((prev) => {
      const list = asArray(prev[productId], [emptyFabric()]).slice();
      const curr = list[idx] || emptyFabric();
      list[idx] = { ...curr, ...patch };
      return { ...prev, [productId]: list };
    });
  };

  const updateConsumption = (productId, idx, patch) => {
    setLocal((prev) => {
      const list = asArray(prev[productId], [emptyFabric()]).slice();
      const curr = list[idx] || emptyFabric();
      list[idx] = { ...curr, consumption: { ...(curr.consumption || {}), ...patch } };
      return { ...prev, [productId]: list };
    });
  };

  const addFabric = (productId) => {
    setLocal((prev) => {
      const list = asArray(prev[productId], [emptyFabric()]);
      return { ...prev, [productId]: [...list, emptyFabric()] };
    });
    setOpen((p) => ({ ...p, [productId]: true }));
  };

  const removeFabric = (productId, idx) => {
    setLocal((prev) => {
      const list = asArray(prev[productId], [emptyFabric()]);
      const next = list.filter((_, i) => i !== idx);
      return { ...prev, [productId]: next.length ? next : [emptyFabric()] };
    });
  };

  const validateList = (list) => {
    const rows = asArray(list, []);
    if (!rows.length) return "Add at least 1 fabric";

    const seen = new Set();
    for (const r of rows) {
      const code = String(r?.fabricCode || "").trim();
      if (!code) return "Fabric required";

      const role = String(r?.role || "main");
      if (!ROLES.includes(role)) return "Invalid role";

      const unit = String(r?.consumption?.unit || "meter");
      if (!UNITS.includes(unit)) return "Invalid unit";

      const val = Number(r?.consumption?.value ?? 0);
      if (Number.isNaN(val) || val < 0) return "Consumption must be >= 0";

      const key = `${code}__${role}`;
      if (seen.has(key)) return "Duplicate fabric + role";
      seen.add(key);
    }
    return "";
  };

  const saveProduct = async (p) => {
    try {
      const list = asArray(local[p._id], normalizeFromProduct(p));
      const clean = dedupe(
        list.map((r) => ({
          fabricCode: String(r.fabricCode || "").trim(),
          role: String(r.role || "main"),
          consumption: {
            value: Number(r?.consumption?.value ?? 0),
            unit: String(r?.consumption?.unit || "meter"),
          },
          notes: String(r?.notes || "").trim(),
        }))
      );

      const v = validateList(clean);
      if (v) return toast.error(`${p.productCode}: ${v}`);

      await useAdminProductStore.getState().updateProductFabrics(p._id, clean);
      toast.success(`Saved ${p.productCode}`);
      setOpen((x) => ({ ...x, [p._id]: false }));
    } catch (e) {
      toast.error(e?.message || "Save failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Production</div>
          <div style={styles.hSub}>Product Fabric Assignment</div>
        </div>
        <div style={styles.hRight}>
          <div style={styles.badge}>{loading ? "Loading…" : `${products.length} Products`}</div>
        </div>
      </div>

      <div style={styles.filters}>
        <div style={styles.field}>
          <div style={styles.label}>Search products</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="title / sku / code" style={styles.input} />
        </div>

        <div style={styles.field}>
          <div style={styles.label}>Search fabrics</div>
          <input value={fabricSearch} onChange={(e) => setFabricSearch(e.target.value)} placeholder="code / name" style={styles.input} />
          {fabricsLoading ? <div style={styles.mini}>Loading fabrics…</div> : null}
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 56 }} />
              <th style={{ ...styles.th, width: 110 }}>Code</th>
              <th style={styles.th}>Product</th>
              <th style={{ ...styles.th, width: 240 }}>SKUs</th>

              {/* ✅ NEW COLUMN */}
              <th style={{ ...styles.th, width: 280 }}>Assigned Fabrics</th>

              <th style={{ ...styles.th, width: 220 }}>Edit</th>
              <th style={{ ...styles.th, width: 120 }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const img = p.thumbnail || asArray(p.images, [])[0] || "";
              const skus = getAllSkus(p);
              const rows = asArray(local[p._id], normalizeFromProduct(p));
              const isOpen = !!open[p._id];

              // ✅ assigned fabrics (from product OR local)
              const assigned = rows
                .filter((x) => String(x.fabricCode || "").trim())
                .map((x) => `${x.fabricCode}${x.role ? `(${x.role})` : ""}`);

              const assignedPreview = assigned.slice(0, 4);

              return (
                <React.Fragment key={p._id}>
                  <tr style={styles.tr}>
                    <td style={styles.td}>
                      {img ? <img src={img} alt={p.title} style={styles.img} /> : <div style={styles.noImg}>—</div>}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.code}>{p.productCode}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.title}>{p.title}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.skus}>
                        {skus.slice(0, 4).map((s) => (
                          <span key={s} style={styles.skuChip}>
                            {s}
                          </span>
                        ))}
                        {skus.length > 4 ? <span style={styles.more}>+{skus.length - 4}</span> : null}
                      </div>
                    </td>

                    {/* ✅ NEW COLUMN CONTENT */}
                    <td style={styles.td}>
                      {assignedPreview.length ? (
                        <div style={styles.chips}>
                          {assignedPreview.map((t) => (
                            <span key={t} style={styles.chip}>
                              {t}
                            </span>
                          ))}
                          {assigned.length > 4 ? <span style={styles.more}>+{assigned.length - 4}</span> : null}
                        </div>
                      ) : (
                        <span style={styles.muted}>—</span>
                      )}
                      <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                        {assigned.length ? `${assigned.length} assigned` : "No fabrics"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <button type="button" style={styles.linkBtn} onClick={() => toggleOpen(p._id)}>
                        {isOpen ? "Hide" : "Edit"} ({rows.length})
                      </button>
                    </td>

                    <td style={styles.td}>
                      <button type="button" onClick={() => saveProduct(p)} disabled={saving} style={saving ? styles.btnDisabled : styles.btn}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr>
                      <td colSpan={7} style={{ ...styles.td, paddingTop: 0 }}>
                        <div style={styles.expandCard}>
                          <div style={styles.expandTop}>
                            <div style={styles.expandTitle}>Assign Fabrics</div>
                            <button type="button" style={styles.ghostBtn} onClick={() => addFabric(p._id)}>
                              + Add fabric
                            </button>
                          </div>

                          <div style={styles.grid}>
                            {rows.map((r, idx) => (
                              <div key={`${p._id}_${idx}`} style={styles.fabricCard}>
                                <div style={styles.row2}>
                                  <select
                                    value={r.fabricCode || ""}
                                    onChange={(e) => updateFabricRow(p._id, idx, { fabricCode: e.target.value })}
                                    style={styles.select}
                                  >
                                    <option value="">Select fabric</option>
                                    {fabricOptions.map((f) => (
                                      <option key={f.code} value={f.code}>
                                        {f.code}
                                        {f.name ? ` — ${f.name}` : ""}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={r.role || "main"}
                                    onChange={(e) => updateFabricRow(p._id, idx, { role: e.target.value })}
                                    style={styles.select}
                                  >
                                    {ROLES.map((x) => (
                                      <option key={x} value={x}>
                                        {x}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={styles.row3}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={r?.consumption?.value ?? 0}
                                    onChange={(e) => updateConsumption(p._id, idx, { value: e.target.value })}
                                    style={styles.smallInput}
                                  />

                                  <select
                                    value={r?.consumption?.unit || "meter"}
                                    onChange={(e) => updateConsumption(p._id, idx, { unit: e.target.value })}
                                    style={styles.select}
                                  >
                                    {UNITS.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>

                                  <button type="button" onClick={() => removeFabric(p._id, idx)} style={styles.dangerBtn}>
                                    Remove
                                  </button>
                                </div>

                                <input
                                  value={r.notes || ""}
                                  onChange={(e) => updateFabricRow(p._id, idx, { notes: e.target.value })}
                                  placeholder="Notes (optional)"
                                  style={styles.smallInput}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={styles.expandFooter}>
                            <div style={styles.miniMuted}>Tip: avoid duplicate fabric + role</div>
                            <button type="button" onClick={() => saveProduct(p)} disabled={saving} style={saving ? styles.btnDisabled : styles.btn}>
                              {saving ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}

            {!products.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 22, textAlign: "center", color: "#777" }}>
                  No products found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- compact black/white/grey styles ---------------- */
const styles = {
  page: { padding: 18, maxWidth: 1500, margin: "0 auto", color: "#111" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 10 },
  hTitle: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#666" },
  hSub: { fontSize: 20, fontWeight: 600, marginTop: 2 },
  hRight: { display: "flex", gap: 8, alignItems: "center" },
  badge: { fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid #e6e6e6", background: "#fff", color: "#333" },

  filters: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12, border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff" },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "#666" },
  mini: { fontSize: 12, color: "#777" },
  miniMuted: { fontSize: 12, color: "#777" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #dedede", outline: "none", background: "#fff", color: "#111" },

  tableWrap: { marginTop: 12, border: "1px solid #e6e6e6", borderRadius: 14, overflow: "hidden", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 10px", fontSize: 12, color: "#666", borderBottom: "1px solid #eee", background: "#fafafa", fontWeight: 600 },
  tr: { borderTop: "1px solid #f0f0f0" },
  td: { padding: "10px 10px", verticalAlign: "top", fontSize: 13 },

  img: { width: 40, height: 40, objectFit: "cover", borderRadius: 10, border: "1px solid #eee" },
  noImg: { width: 40, height: 40, borderRadius: 10, border: "1px solid #eee", display: "grid", placeItems: "center", color: "#888", background: "#fafafa" },

  code: { fontWeight: 700, fontSize: 12, letterSpacing: 0.3 },
  title: { fontWeight: 600, lineHeight: 1.25 },

  muted: { color: "#777", fontSize: 12 },
  more: { color: "#777", fontSize: 12 },

  chips: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: { border: "1px solid #e6e6e6", background: "#fff", borderRadius: 999, padding: "3px 8px", fontSize: 12, color: "#222" },

  skus: { display: "flex", flexWrap: "wrap", gap: 6 },
  skuChip: { border: "1px solid #ececec", background: "#fafafa", borderRadius: 999, padding: "3px 8px", fontSize: 12, color: "#333" },

  linkBtn: { padding: 0, background: "transparent", border: "none", color: "#111", textDecoration: "underline", cursor: "pointer", fontSize: 12 },

  btn: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12 },
  btnDisabled: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#f3f3f3", color: "#777", cursor: "not-allowed", fontWeight: 600, fontSize: 12 },

  expandCard: { border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fafafa", marginTop: 10 },
  expandTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  expandTitle: { fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.8 },

  ghostBtn: { padding: "8px 10px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#111", cursor: "pointer", fontSize: 12, fontWeight: 600 },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  fabricCard: { border: "1px solid #eaeaea", borderRadius: 14, padding: 10, background: "#fff", display: "grid", gap: 8 },

  row2: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 8 },

  select: { width: "100%", padding: "9px 10px", borderRadius: 12, border: "1px solid #dedede", background: "#fff", fontSize: 12, color: "#111", outline: "none" },
  smallInput: { width: "100%", padding: "9px 10px", borderRadius: 12, border: "1px solid #dedede", background: "#fff", fontSize: 12, color: "#111", outline: "none" },

  dangerBtn: { padding: "9px 10px", borderRadius: 12, border: "1px solid #e2e2e2", background: "#fff", color: "#111", cursor: "pointer", fontSize: 12, fontWeight: 600 },

  expandFooter: { marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
};
