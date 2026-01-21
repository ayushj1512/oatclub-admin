// app/products/bestseller/page.jsx
// ✅ Single Admin Page: Add/Remove Bestsellers + ONE SAVE button (compact, clean UI)
// Updates:
// - Better search bar
// - Show Product Code instead of Mongo _id
// - Search by Name OR Product Code
// - Selected does NOT jump to top immediately
// - Light UI (no heavy borders), white/black/grey

"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BESTSELLER_API = `${BASE_URL}/api/bestseller`;

// ---- helpers ----
const safeJson = async (res) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

const getImg = (p) =>
  p?.images?.[0] ||
  p?.image ||
  p?.thumbnail ||
  p?.featuredImage ||
  p?.media?.[0]?.url ||
  "";

// ✅ choose your product code field priority here
const getProductCode = (p) =>
  String(
    p?.productCode ||
      p?.code ||
      p?.sku ||
      p?.patternNumber || // many teams use this as code
      ""
  ).trim();

export default function BestsellerManagerPage() {
  const { products, loading, fetchAllProducts } = useAdminProductStore();

  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  // server ids (current bestsellers)
  const [serverIds, setServerIds] = useState([]);
  // draft ids (checkboxes)
  const [draftIds, setDraftIds] = useState([]);

  const serverSet = useMemo(() => new Set(serverIds.map(String)), [serverIds]);
  const draftSet = useMemo(() => new Set(draftIds.map(String)), [draftIds]);

  // ---- load ----
  const loadAll = async () => {
    try {
      await fetchAllProducts?.({});

      const res = await fetch(`${BESTSELLER_API}/ids`, { cache: "no-store" });
      const ids = await safeJson(res);

      const normalized = Array.isArray(ids) ? ids.map(String) : [];
      setServerIds(normalized);
      setDraftIds(normalized);
    } catch (e) {
      toast.error(e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- toggle (no reorder) ----
  const toggle = (id) => {
    const pid = String(id);
    setDraftIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  // ---- diff ----
  const { toAdd, toRemove, hasChanges } = useMemo(() => {
    const add = [];
    const remove = [];
    for (const id of draftSet) if (!serverSet.has(id)) add.push(id);
    for (const id of serverSet) if (!draftSet.has(id)) remove.push(id);
    return { toAdd: add, toRemove: remove, hasChanges: add.length > 0 || remove.length > 0 };
  }, [draftSet, serverSet]);

  // ---- save ----
  const onSave = async () => {
    try {
      if (!hasChanges) return toast("No changes to save");
      setSaving(true);

      for (const productId of toAdd) {
        const res = await fetch(BESTSELLER_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        await safeJson(res);
      }

      for (const productId of toRemove) {
        const res = await fetch(`${BESTSELLER_API}/product/${productId}`, { method: "DELETE" });
        await safeJson(res);
      }

      toast.success("Saved ✅");
      setServerIds(draftIds.map(String)); // ✅ sorting updates only after save
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setDraftIds(serverIds);
    toast("Reset done");
  };

  // ---- filter + sort ----
  const list = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    const arr = Array.isArray(products) ? products : [];

    const filtered = !term
      ? arr
      : arr.filter((p) => {
          const name = String(p?.title || p?.name || "").toLowerCase();
          const code = getProductCode(p).toLowerCase();
          return name.includes(term) || code.includes(term);
        });

    // ✅ group ONLY server bestsellers on top (draft doesn't reorder)
    return [...filtered].sort((a, b) => {
      const aSel = serverSet.has(String(a?._id));
      const bSel = serverSet.has(String(b?._id));
      if (aSel === bSel) return 0;
      return aSel ? -1 : 1;
    });
  }, [products, q, serverSet]);

  return (
    <div style={page}>
      {/* Header */}
      <div style={top}>
        <div>
          <div style={h1}>Bestseller Manager</div>
          <div style={sub}>Search by name / product code • tick and Save</div>
        </div>

        <div style={actions}>
          <button onClick={onReset} disabled={saving} style={btnGhost}>
            Reset
          </button>
          <button onClick={loadAll} disabled={saving} style={btnGhost}>
            Refresh
          </button>
          <button onClick={onSave} disabled={saving || !hasChanges} style={btnPrimary}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Search + stats */}
      <div style={bar}>
        <div style={searchWrap}>
          <span style={searchIcon}>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products by name or code..."
            style={searchInput}
          />
          {q ? (
            <button onClick={() => setQ("")} style={clearBtn} type="button">
              ✕
            </button>
          ) : null}
        </div>

        <div style={chips}>
          <span style={chipMuted}>{loading ? "Loading..." : `Products: ${products?.length || 0}`}</span>
          <span style={chipDark}>Selected: {draftIds.length}</span>
          <span style={chipMuted}>{hasChanges ? "Unsaved changes" : "Saved"}</span>
        </div>
      </div>

      {/* List (clean rows) */}
      <div style={listWrap}>
        {list.map((p) => {
          const id = String(p?._id || "");
          const img = getImg(p);
          const checked = draftSet.has(id);

          const name = p?.title || p?.name || "Untitled";
          const code = getProductCode(p) || "—";

          return (
            <div key={id} style={row}>
              <div style={thumbWrap}>
                {img ? (
                  <img src={img} alt={name} style={thumb} loading="lazy" />
                ) : (
                  <div style={thumbEmpty}>—</div>
                )}
              </div>

              <div style={rowBody}>
                <div style={rowTop}>
                  <div style={nameText} title={name}>
                    {name}
                  </div>

                  <label style={checkWrap} title="Mark as bestseller">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(id)}
                      disabled={saving}
                      style={{ transform: "scale(1.05)" }}
                    />
                  </label>
                </div>

                <div style={metaRow}>
                  <span style={codePill}>Code: {code}</span>
                  {serverSet.has(id) ? <span style={tag}>Bestseller</span> : <span style={tagMuted}>Normal</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && list.length === 0 ? <div style={empty}>No products found.</div> : null}
    </div>
  );
}

/* ---------------- clean white/black/grey UI (light borders) ---------------- */
const page = { padding: 14, margin: "0 auto", background: "#fff", color: "#111" };

const top = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const h1 = { fontSize: 18, fontWeight: 900, letterSpacing: "-0.2px" };
const sub = { marginTop: 2, fontSize: 12, opacity: 0.7 };

const actions = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

const btnGhost = {
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
};

const btnPrimary = {
  ...btnGhost,
  background: "#111",
  color: "#fff",
  border: "1px solid #111",
};

const bar = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const searchWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 10px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#fafafa",
  minWidth: 320,
  flex: "1 1 360px",
};

const searchIcon = { opacity: 0.6, fontSize: 12 };

const searchInput = {
  border: "none",
  outline: "none",
  background: "transparent",
  width: "100%",
  fontSize: 13,
  color: "#111",
};

const clearBtn = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  opacity: 0.6,
  fontSize: 12,
};

const chips = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

const chipMuted = {
  fontSize: 11,
  padding: "6px 9px",
  borderRadius: 999,
  background: "#f3f3f3",
  color: "#111",
  fontWeight: 800,
};

const chipDark = {
  fontSize: 11,
  padding: "6px 9px",
  borderRadius: 999,
  background: "#111",
  color: "#fff",
  fontWeight: 900,
};

const listWrap = {
  marginTop: 10,
  borderRadius: 14,
  overflow: "hidden",
  background: "#fff",
};

const row = {
  display: "flex",
  gap: 10,
  padding: 10,
  alignItems: "center",
  background: "#fff",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
};

const thumbWrap = {
  width: 46,
  height: 46,
  borderRadius: 12,
  overflow: "hidden",
  background: "#f3f3f3",
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const thumb = { width: "100%", height: "100%", objectFit: "cover" };
const thumbEmpty = { fontSize: 12, opacity: 0.6, fontWeight: 900 };

const rowBody = { flex: 1, minWidth: 0 };

const rowTop = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };

const nameText = {
  fontWeight: 900,
  fontSize: 13,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const checkWrap = {
  width: 34,
  height: 34,
  borderRadius: 12,
  background: "#fafafa",
  border: "1px solid rgba(0,0,0,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const metaRow = { marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

const codePill = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f3f3f3",
  fontWeight: 900,
};

const tag = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#111",
  color: "#fff",
  fontWeight: 900,
};

const tagMuted = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#eaeaea",
  color: "#111",
  fontWeight: 900,
};

const empty = {
  marginTop: 10,
  padding: 12,
  borderRadius: 14,
  background: "#fafafa",
  border: "1px solid rgba(0,0,0,0.08)",
  fontWeight: 900,
};
