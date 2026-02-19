// store/bestseller.store.js
// ✅ Minimal Bestseller Store (Zustand)
// ✅ UPDATED:
// - credentials: "include" for cookie auth
// - cache: "no-store"
// - safer JSON parsing for empty responses
// - keep canonical order by re-fetching ids after add/remove/setOrder

import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
const API = BASE ? `${BASE}/api/bestseller` : "/api/bestseller";

const uniq = (a) => Array.from(new Set((a || []).map(String).filter(Boolean)));

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  // handle empty body safely
  const text = await res.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

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
      const doc = await request(API, {
        method: "POST",
        body: JSON.stringify({ productId: pid }),
      });

      // optimistic local update (keep ids unique)
      set((st) => ({
        items: doc?._id
          ? [doc, ...(st.items || []).filter((x) => String(x?._id) !== String(doc._id))]
          : st.items,
        ids: st.ids?.includes(pid) ? st.ids : [...(st.ids || []), pid],
      }));

      // ✅ canonical order from server (position-based)
      await get().fetchIds();

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

      // ✅ canonical refresh
      await get().fetchIds();

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

      // ✅ canonical refresh
      await get().fetchIds();

      return data;
    } catch (e) {
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  // ✅ Persist order (primary: { ids })
  setOrder: async (ids) => {
    try {
      const ordered = uniq(Array.isArray(ids) ? ids : []);
      if (!ordered.length) throw new Error("ids[] is required");

      set({ saving: true, error: null, ids: ordered });

      const endpoints = [`${API}/order`, `${API}/reorder`, `${API}/ids/order`];
      const methods = ["PUT", "POST", "PATCH"];

      const payloads = [
        { ids: ordered }, // ✅ your backend expects this
        { productIds: ordered },
        { bestsellerIds: ordered },
        { order: ordered.map((productId, index) => ({ productId, index })) },
      ];

      let lastErr = null;

      for (const url of endpoints) {
        for (const method of methods) {
          for (const payload of payloads) {
            try {
              const out = await request(url, {
                method,
                body: JSON.stringify(payload),
              });

              // ✅ after saving, fetch canonical ids (server position)
              await get().fetchIds();

              return out;
            } catch (e) {
              lastErr = e;
            }
          }
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
