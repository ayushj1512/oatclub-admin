"use client";

import { create } from "zustand";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
const API_BASE = BACKEND ? `${BACKEND}/api` : "/api";

const safe = (v) => (v == null ? "" : String(v));
const asBool = (v) => v === true || v === "true" || v === 1 || v === "1";

async function readJson(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = safe(data?.message) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const useMarqueeAdminStore = create((set, get) => ({
  /* =========================
     STATE
  ========================= */
  items: [], // public list (active only) OR you can also store admin list if you create admin GET later
  loading: false,
  saving: false,
  deletingId: null,
  error: "",

  /* =========================
     HELPERS
  ========================= */
  setItems: (items) => set({ items: Array.isArray(items) ? items : [] }),
  clearError: () => set({ error: "" }),

  /* =========================
     PUBLIC FETCH (for marquee preview / frontend usage)
     GET /api/public/marquee
  ========================= */
  fetchPublic: async () => {
    const url = `${API_BASE}/public/marquee`;

    set({ loading: true, error: "" });
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await readJson(res);
      const items = Array.isArray(json?.items) ? json.items : [];
      set({ items, loading: false });
      return { ok: true, items };
    } catch (e) {
      console.error("fetchPublic marquee error:", e);
      set({ loading: false, error: safe(e?.message) || "Failed to load marquee" });
      return { ok: false, message: safe(e?.message) || "Failed to load marquee" };
    }
  },

  /* =========================
     CREATE
     POST /api/admin/marquee
     body: { imageUrl, productCode, isActive, sortOrder, alt }
  ========================= */
  createItem: async (payload) => {
    const url = `${API_BASE}/admin/marquee`;

    // minimal sanitize
    const body = {
      imageUrl: safe(payload?.imageUrl).trim(),
      productCode: safe(payload?.productCode).trim(),
      alt: safe(payload?.alt).trim(),
      isActive: payload?.isActive == null ? true : asBool(payload.isActive),
      sortOrder: Number.isFinite(Number(payload?.sortOrder)) ? Number(payload.sortOrder) : 0,
    };

    if (!body.imageUrl || !body.productCode) {
      const msg = "imageUrl and productCode are required";
      set({ error: msg });
      return { ok: false, message: msg };
    }

    set({ saving: true, error: "" });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await readJson(res);

      // refresh list so UI stays synced
      await get().fetchPublic();

      set({ saving: false });
      return { ok: true, item: json?.item || null };
    } catch (e) {
      console.error("createItem marquee error:", e);
      set({ saving: false, error: safe(e?.message) || "Failed to create marquee item" });
      return { ok: false, message: safe(e?.message) || "Failed to create marquee item" };
    }
  },

  /* =========================
     UPDATE
     PATCH /api/admin/marquee/:id
  ========================= */
  updateItem: async (id, patch) => {
    const _id = safe(id).trim();
    if (!_id) {
      const msg = "Missing item id";
      set({ error: msg });
      return { ok: false, message: msg };
    }

    const url = `${API_BASE}/admin/marquee/${encodeURIComponent(_id)}`;

    // only send fields that exist
    const body = {};
    if (patch?.imageUrl != null) body.imageUrl = safe(patch.imageUrl).trim();
    if (patch?.productCode != null) body.productCode = safe(patch.productCode).trim();
    if (patch?.alt != null) body.alt = safe(patch.alt).trim();
    if (patch?.isActive != null) body.isActive = asBool(patch.isActive);
    if (patch?.sortOrder != null)
      body.sortOrder = Number.isFinite(Number(patch.sortOrder)) ? Number(patch.sortOrder) : 0;

    set({ saving: true, error: "" });
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await readJson(res);

      // refresh list
      await get().fetchPublic();

      set({ saving: false });
      return { ok: true, item: json?.item || null };
    } catch (e) {
      console.error("updateItem marquee error:", e);
      set({ saving: false, error: safe(e?.message) || "Failed to update marquee item" });
      return { ok: false, message: safe(e?.message) || "Failed to update marquee item" };
    }
  },

  /* =========================
     DELETE
     DELETE /api/admin/marquee/:id
  ========================= */
  deleteItem: async (id) => {
    const _id = safe(id).trim();
    if (!_id) {
      const msg = "Missing item id";
      set({ error: msg });
      return { ok: false, message: msg };
    }

    const url = `${API_BASE}/admin/marquee/${encodeURIComponent(_id)}`;

    set({ deletingId: _id, error: "" });
    try {
      const res = await fetch(url, { method: "DELETE" });
      await readJson(res);

      // refresh list
      await get().fetchPublic();

      set({ deletingId: null });
      return { ok: true };
    } catch (e) {
      console.error("deleteItem marquee error:", e);
      set({ deletingId: null, error: safe(e?.message) || "Failed to delete marquee item" });
      return { ok: false, message: safe(e?.message) || "Failed to delete marquee item" };
    }
  },
}));