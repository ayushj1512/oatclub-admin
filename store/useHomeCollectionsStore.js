"use client";

import { create } from "zustand";
import { toast } from "react-hot-toast";

/**
 * API base
 * - If you already proxy /api in Next, keep API_ROOT as "/api"
 * - Otherwise set NEXT_PUBLIC_BACKEND_URL="https://your-backend.com"
 */
const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const API_ROOT = BASE_URL ? `${BASE_URL}/api` : "/api";
const ENDPOINT = `${API_ROOT}/home-collections`;

/* ---------- helpers ---------- */
const safe = (v) => (v == null ? "" : String(v));
const stripUndefinedDeep = (obj) => {
  if (Array.isArray(obj)) return obj.map(stripUndefinedDeep);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return obj;
};

const buildQS = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg =
      data?.message ||
      `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Item shape used in UI:
 * {
 *   _id, imageUrl, name, slug, isActive, position, createdAt, updatedAt
 * }
 */

export const useHomeCollectionsStore = create((set, get) => ({
  /* ---------------- state ---------------- */
  items: [],
  activeItems: [],

  selected: null,

  // admin list query controls
  q: "",
  isActiveFilter: "", // "", "true", "false"
  sort: "position", // position | newest | oldest | name

  loading: false,
  saving: false,
  deleting: false,
  reordering: false,

  error: "",

  /* ---------------- setters ---------------- */
  setQ: (q) => set({ q: safe(q).trim() }),
  setIsActiveFilter: (v) => set({ isActiveFilter: safe(v) }),
  setSort: (v) => set({ sort: safe(v) || "position" }),
  clearError: () => set({ error: "" }),
  clearSelected: () => set({ selected: null }),

  /* ---------------- getters ---------------- */
  getByIdLocal: (id) => get().items.find((x) => String(x?._id) === String(id)) || null,
  getBySlugLocal: (slug) =>
    get().items.find((x) => String(x?.slug) === String(slug)) || null,

  /* ---------------- ADMIN: LIST ---------------- */
  fetchAll: async (opts = {}) => {
    const { q, isActiveFilter, sort } = get();
    const params = {
      q: opts.q ?? q,
      isActive: opts.isActive ?? isActiveFilter,
      sort: opts.sort ?? sort,
    };

    set({ loading: true, error: "" });
    try {
      const data = await apiFetch(`${ENDPOINT}${buildQS(params)}`);
      set({ items: data?.items || [], loading: false });
      return data?.items || [];
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to load collections" });
      toast.error(e?.message || "Failed to load collections");
      return [];
    }
  },

  /* ---------------- PUBLIC: ACTIVE LIST ---------------- */
  fetchActivePublic: async () => {
    set({ loading: true, error: "" });
    try {
      const data = await apiFetch(`${ENDPOINT}/public`);
      set({ activeItems: data?.items || [], loading: false });
      return data?.items || [];
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to load active collections" });
      toast.error(e?.message || "Failed to load active collections");
      return [];
    }
  },

  /* ---------------- GET ONE ---------------- */
  fetchById: async (id) => {
    const cached = get().getByIdLocal(id);
    if (cached) {
      set({ selected: cached });
      return cached;
    }

    set({ loading: true, error: "" });
    try {
      const data = await apiFetch(`${ENDPOINT}/${id}`);
      const item = data?.item || null;

      if (item) {
        // merge into items
        const items = get().items || [];
        const idx = items.findIndex((x) => String(x._id) === String(item._id));
        const next = idx >= 0 ? items.map((x, i) => (i === idx ? item : x)) : [item, ...items];
        set({ items: next, selected: item, loading: false });
      } else {
        set({ selected: null, loading: false });
      }

      return item;
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to fetch collection" });
      toast.error(e?.message || "Failed to fetch collection");
      return null;
    }
  },

  fetchBySlug: async (slug) => {
    const cached = get().getBySlugLocal(slug);
    if (cached) {
      set({ selected: cached });
      return cached;
    }

    set({ loading: true, error: "" });
    try {
      const data = await apiFetch(`${ENDPOINT}/public/slug/${encodeURIComponent(slug)}`);
      const item = data?.item || null;
      set({ selected: item, loading: false });
      return item;
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to fetch collection" });
      toast.error(e?.message || "Failed to fetch collection");
      return null;
    }
  },

  /* ---------------- CREATE ---------------- */
  createOne: async (payload) => {
    set({ saving: true, error: "" });
    try {
      const body = stripUndefinedDeep({
        imageUrl: safe(payload?.imageUrl).trim(),
        name: safe(payload?.name).trim(),
        slug: safe(payload?.slug).trim(),
        isActive: typeof payload?.isActive === "boolean" ? payload.isActive : undefined,
        position:
          payload?.position === "" || payload?.position == null
            ? undefined
            : Number(payload.position),
      });

      const data = await apiFetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const item = data?.item;
      if (item) {
        // insert & keep list sorted (position default)
        const items = [item, ...(get().items || [])];
        set({ items, saving: false, selected: item });
      } else {
        set({ saving: false });
      }

      toast.success("Collection created");
      return item;
    } catch (e) {
      set({ saving: false, error: e?.message || "Create failed" });
      toast.error(e?.message || "Create failed");
      return null;
    }
  },

  /* ---------------- UPDATE ---------------- */
  updateOne: async (id, patch) => {
    set({ saving: true, error: "" });
    try {
      const body = stripUndefinedDeep({
        ...(patch?.imageUrl !== undefined ? { imageUrl: safe(patch.imageUrl).trim() } : {}),
        ...(patch?.name !== undefined ? { name: safe(patch.name).trim() } : {}),
        ...(patch?.slug !== undefined ? { slug: safe(patch.slug).trim() } : {}),
        ...(typeof patch?.isActive === "boolean" ? { isActive: patch.isActive } : {}),
        ...(patch?.position !== undefined && patch?.position !== ""
          ? { position: Number(patch.position) }
          : {}),
      });

      const data = await apiFetch(`${ENDPOINT}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const item = data?.item || null;

      if (item) {
        const items = (get().items || []).map((x) =>
          String(x._id) === String(item._id) ? item : x
        );
        const selected =
          get().selected && String(get().selected?._id) === String(item._id)
            ? item
            : get().selected;

        set({ items, selected, saving: false });
      } else {
        set({ saving: false });
      }

      toast.success("Collection updated");
      return item;
    } catch (e) {
      set({ saving: false, error: e?.message || "Update failed" });
      toast.error(e?.message || "Update failed");
      return null;
    }
  },

  /* ---------------- TOGGLE ACTIVE ---------------- */
  toggleActive: async (id) => {
    // optimistic
    const prevItems = get().items || [];
    const prevSelected = get().selected;

    const optimistic = prevItems.map((x) => {
      if (String(x._id) !== String(id)) return x;
      return { ...x, isActive: !x.isActive };
    });

    set({ items: optimistic });

    try {
      const data = await apiFetch(`${ENDPOINT}/${id}/toggle`, { method: "PATCH" });
      const item = data?.item || null;

      if (item) {
        const items = (get().items || []).map((x) =>
          String(x._id) === String(item._id) ? item : x
        );
        const selected =
          prevSelected && String(prevSelected?._id) === String(item._id) ? item : prevSelected;

        set({ items, selected });
      }

      toast.success("Updated");
      return item;
    } catch (e) {
      // rollback
      set({ items: prevItems, selected: prevSelected, error: e?.message || "Toggle failed" });
      toast.error(e?.message || "Toggle failed");
      return null;
    }
  },

  /* ---------------- DELETE ---------------- */
  deleteOne: async (id) => {
    set({ deleting: true, error: "" });
    try {
      await apiFetch(`${ENDPOINT}/${id}`, { method: "DELETE" });

      const items = (get().items || []).filter((x) => String(x._id) !== String(id));
      const selected =
        get().selected && String(get().selected?._id) === String(id) ? null : get().selected;

      set({ items, selected, deleting: false });
      toast.success("Deleted");
      return true;
    } catch (e) {
      set({ deleting: false, error: e?.message || "Delete failed" });
      toast.error(e?.message || "Delete failed");
      return false;
    }
  },

  /* ---------------- REORDER (drag/drop) ----------------
   * input: array of items in desired order OR array [{id, position}]
   * It will send [{id, position}] to backend.
   */
  reorder: async (ordered) => {
    const prev = get().items || [];
    set({ reordering: true, error: "" });

    try {
      // If user passes array of items, compute positions sequentially
      const itemsArr = Array.isArray(ordered) ? ordered : [];
      const payload = itemsArr.map((x, idx) => ({
        id: x?.id || x?._id || x,
        position: Number.isFinite(Number(x?.position)) ? Number(x.position) : idx,
      }));

      // optimistic sort in UI based on new order
      const mapPos = new Map(payload.map((p) => [String(p.id), p.position]));
      const optimistic = [...prev].map((x) => {
        const p = mapPos.get(String(x._id));
        return p == null ? x : { ...x, position: p };
      });
      optimistic.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      set({ items: optimistic });

      await apiFetch(`${ENDPOINT}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ items: payload }),
      });

      set({ reordering: false });
      toast.success("Reordered");
      return true;
    } catch (e) {
      set({ items: prev, reordering: false, error: e?.message || "Reorder failed" });
      toast.error(e?.message || "Reorder failed");
      return false;
    }
  },

  /* ---------------- BULK UPSERT ---------------- */
  upsertMany: async (items) => {
    set({ saving: true, error: "" });
    try {
      const clean = (Array.isArray(items) ? items : []).map((x) =>
        stripUndefinedDeep({
          imageUrl: safe(x?.imageUrl).trim(),
          name: safe(x?.name).trim(),
          slug: safe(x?.slug).trim(),
          isActive: typeof x?.isActive === "boolean" ? x.isActive : undefined,
          position:
            x?.position === "" || x?.position == null ? undefined : Number(x.position),
        })
      );

      const data = await apiFetch(`${ENDPOINT}/upsert`, {
        method: "POST",
        body: JSON.stringify({ items: clean }),
      });

      set({ saving: false });
      toast.success(`Upserted ${data?.count || clean.length} items`);

      // refresh list for accuracy
      await get().fetchAll();
      return true;
    } catch (e) {
      set({ saving: false, error: e?.message || "Upsert failed" });
      toast.error(e?.message || "Upsert failed");
      return false;
    }
  },
}));
