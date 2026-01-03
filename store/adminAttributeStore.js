"use client";

import { create } from "zustand";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BASE_URL}/api/attributes`;

export const useAdminAttributeStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  attributes: [],
  attribute: null,

  loading: false,
  saving: false,
  error: null,

  /* ============================================================
     HELPERS
  ============================================================ */
  setLoading: (v) => set({ loading: v }),
  setSaving: (v) => set({ saving: v }),
  resetAttribute: () => set({ attribute: null }),
  clearError: () => set({ error: null }),

  /* ============================================================
     FETCH ALL ATTRIBUTES
  ============================================================ */
  fetchAttributes: async () => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(API, { credentials: "include" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch attributes");

      set({ attributes: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     FETCH SINGLE ATTRIBUTE
  ============================================================ */
  fetchAttributeById: async (id) => {
    if (!id) return;

    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API}/${id}`, { credentials: "include" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch attribute");

      set({ attribute: data });
      return data;
    } catch (e) {
      console.error(e);
      set({ error: e.message });
      toast.error(e.message);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  /* ============================================================
     CREATE ATTRIBUTE
  ============================================================ */
  createAttribute: async (payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Create failed");

      // ✅ update local list
      set((state) => ({
        attributes: [data.attribute, ...state.attributes],
      }));

      toast.success("Attribute created ✅");
      return data.attribute;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
     UPDATE ATTRIBUTE
  ============================================================ */
  updateAttribute: async (id, payload) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      const updated = data.attribute;

      set((state) => ({
        attribute: updated,
        attributes: state.attributes.map((a) =>
          a._id === id ? updated : a
        ),
      }));

      toast.success("Attribute updated ✅");
      return updated;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },

  /* ============================================================
     DELETE ATTRIBUTE
  ============================================================ */
  deleteAttribute: async (id) => {
    try {
      set({ saving: true, error: null });

      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      set((state) => ({
        attributes: state.attributes.filter((a) => a._id !== id),
      }));

      toast.success("Attribute deleted ✅");
      return true;
    } catch (e) {
      console.error(e);
      toast.error(e.message);
      throw e;
    } finally {
      set({ saving: false });
    }
  },
}));
