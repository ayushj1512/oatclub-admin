// store/adminComingSoonStore.js
import { create } from "zustand";

/* ----------------------------------
   ENV
---------------------------------- */
const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
const API = BASE ? `${BASE}/api/coming-soon` : "/api/coming-soon";

/* ----------------------------------
   Helpers
---------------------------------- */
const safeJson = async (res) => {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const byCreatedDesc = (a, b) =>
  new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();

/* ----------------------------------
   Store
---------------------------------- */
export const useAdminComingSoonStore = create((set, get) => ({
  /* state */
  items: [],
  isLoading: false,
  isSaving: false,
  error: "",
  lastFetchedAt: null,

  /* derived */
  getById: (id) => get().items.find((x) => String(x?._id) === String(id)) || null,

  /* ----------- core fetch ----------- */
  fetchAll: async () => {
    set({ isLoading: true, error: "" });
    try {
      const res = await fetch(API, { method: "GET", credentials: "include" });
      const data = await safeJson(res);
      const items = Array.isArray(data) ? data.sort(byCreatedDesc) : [];
      set({ items, isLoading: false, lastFetchedAt: new Date().toISOString() });
      return items;
    } catch (e) {
      set({ error: e.message || "Failed to fetch", isLoading: false });
      return [];
    }
  },

  /* ----------- single fetch by productId (useful in admin edit) ----------- */
  fetchByProductId: async (productId) => {
    if (!productId) return null;
    set({ isLoading: true, error: "" });
    try {
      const res = await fetch(`${API}/${productId}`, { method: "GET", credentials: "include" });
      const doc = await safeJson(res);

      // merge into items list
      const items = [...get().items];
      const idx = items.findIndex((x) => String(x?.productId) === String(productId));
      if (idx >= 0) items[idx] = doc;
      else items.unshift(doc);

      set({ items: items.sort(byCreatedDesc), isLoading: false });
      return doc;
    } catch (e) {
      set({ error: e.message || "Failed", isLoading: false });
      return null;
    }
  },

  /* ----------- admin actions ----------- */

  // PUT /:id/threshold
  updateThreshold: async (id, thresholdScore) => {
    if (!id) return null;

    const prev = get().getById(id);
    // optimistic
    set((st) => ({
      isSaving: true,
      error: "",
      items: st.items.map((x) =>
        String(x._id) === String(id)
          ? {
              ...x,
              launchDecision: {
                ...(x.launchDecision || {}),
                thresholdScore: Number(thresholdScore || 0),
              },
            }
          : x
      ),
    }));

    try {
      const res = await fetch(`${API}/${id}/threshold`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ thresholdScore: Number(thresholdScore || 0) }),
      });

      const updated = await safeJson(res);

      set((st) => ({
        isSaving: false,
        items: st.items.map((x) => (String(x._id) === String(id) ? updated : x)).sort(byCreatedDesc),
      }));

      return updated;
    } catch (e) {
      // rollback
      set((st) => ({
        isSaving: false,
        error: e.message || "Update failed",
        items: prev
          ? st.items.map((x) => (String(x._id) === String(id) ? prev : x)).sort(byCreatedDesc)
          : st.items,
      }));
      return null;
    }
  },

  // POST /:id/manual-launch
  manualLaunch: async (id) => {
    if (!id) return false;

    const prev = get().getById(id);
    set((st) => ({
      isSaving: true,
      error: "",
      items: st.items.map((x) =>
        String(x._id) === String(id)
          ? {
              ...x,
              status: "launched",
              launchDecision: {
                ...(x.launchDecision || {}),
                mode: "manual",
                decided: true,
                decidedAt: new Date().toISOString(),
              },
            }
          : x
      ),
    }));

    try {
      const res = await fetch(`${API}/${id}/manual-launch`, {
        method: "POST",
        credentials: "include",
      });
      await safeJson(res);

      // refresh that doc (optional but safest)
      await get().fetchAll();

      set({ isSaving: false });
      return true;
    } catch (e) {
      set((st) => ({
        isSaving: false,
        error: e.message || "Launch failed",
        items: prev
          ? st.items.map((x) => (String(x._id) === String(id) ? prev : x)).sort(byCreatedDesc)
          : st.items,
      }));
      return false;
    }
  },

  /* ----------- local utilities ----------- */

  // Search / filter helpers for UI (optional)
  filterLocal: ({ q = "", status = "all", active = "all" } = {}) => {
    const query = String(q || "").trim().toLowerCase();
    return get().items.filter((x) => {
      const title = String(x?.snapshot?.title || "").toLowerCase();
      const slug = String(x?.snapshot?.slug || "").toLowerCase();
      const code = String(x?.comingSoonCode || "").toLowerCase();

      const matchesQuery = !query || title.includes(query) || slug.includes(query) || code.includes(query);

      const matchesStatus = status === "all" ? true : String(x?.status) === String(status);
      const matchesActive =
        active === "all" ? true : active === "active" ? !!x?.isActive : !x?.isActive;

      return matchesQuery && matchesStatus && matchesActive;
    });
  },

  resetError: () => set({ error: "" }),
}));
