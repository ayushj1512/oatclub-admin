// store/bestseller.store.js
// ✅ Minimal Bestseller Store (Zustand)
// - Safe BASE handling (supports relative /api)
// - fetchIds() returns ordered ids (backend position order)
// - add() idempotent (works with 200/201)
// - setOrder(ids) persists order (PUT/POST /order)

import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
const API = BASE ? `${BASE}/api/bestseller` : "/api/bestseller";

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

const uniq = (a) => Array.from(new Set((a || []).map(String).filter(Boolean)));

export const useBestsellerStore = create((set, get) => ({
  items: [], // docs
  ids: [], // ordered productIds
  loading: false,
  saving: false,
  error: null,

  fetchAll: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(API);
      const items = Array.isArray(data) ? data : [];
      set({ items });
      return items;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchIds: async () => {
    try {
      set({ loading: true, error: null });
      const data = await request(`${API}/ids`);
      const ids = uniq(Array.isArray(data) ? data : Array.isArray(data?.ids) ? data.ids : []);
      set({ ids });
      return ids;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  add: async (productId) => {
    try {
      const pid = String(productId || "").trim();
      if (!pid) throw new Error("productId is required");

      set({ saving: true, error: null });

      // idempotent controller returns existing doc (200) or new (201)
      const doc = await request(API, { method: "POST", body: JSON.stringify({ productId: pid }) });

      const gotPid = String(doc?.productId || pid);

      // keep local ids ordered: add to END if not present
      set((st) => ({
        items: doc?._id
          ? [doc, ...(st.items || []).filter((x) => String(x?._id) !== String(doc._id))]
          : st.items,
        ids: st.ids?.includes(gotPid) ? st.ids : [...(st.ids || []), gotPid],
      }));

      return doc;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  removeById: async (id) => {
    try {
      const bid = String(id || "").trim();
      if (!bid) throw new Error("id is required");

      set({ saving: true, error: null });

      const data = await request(`${API}/${bid}`, { method: "DELETE" });
      const deleted = data?.deleted;
      const pid = deleted?.productId ? String(deleted.productId) : null;

      set((st) => ({
        items: (st.items || []).filter((x) => String(x?._id) !== String(deleted?._id || bid)),
        ids: pid ? (st.ids || []).filter((x) => x !== pid) : st.ids,
      }));

      return data;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  removeByProductId: async (productId) => {
    try {
      const pid = String(productId || "").trim();
      if (!pid) throw new Error("productId is required");

      set({ saving: true, error: null });

      const data = await request(`${API}/product/${pid}`, { method: "DELETE" });
      const deleted = data?.deleted;

      set((st) => ({
        ids: (st.ids || []).filter((x) => x !== pid),
        items: deleted?._id
          ? (st.items || []).filter((x) => String(x?._id) !== String(deleted._id))
          : st.items,
      }));

      return data;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  // ✅ Persist order
  setOrder: async (ids) => {
    try {
      const ordered = uniq(Array.isArray(ids) ? ids : []);
      set({ saving: true, error: null, ids: ordered });

      const payload = { ids: ordered };
      const tries = [
        () => request(`${API}/order`, { method: "PUT", body: JSON.stringify(payload) }),
        () => request(`${API}/order`, { method: "POST", body: JSON.stringify(payload) }),
        () => request(`${API}/reorder`, { method: "PUT", body: JSON.stringify(payload) }),
      ];

      let lastErr = null;
      for (const fn of tries) {
        try {
          const out = await fn();
          return out;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Order save failed");
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  refresh: async () => {
    await Promise.allSettled([get().fetchIds(), get().fetchAll()]);
  },
}));
