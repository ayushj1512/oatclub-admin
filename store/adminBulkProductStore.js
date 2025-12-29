"use client";

import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export const useAdminBulkProductStore = create((set, get) => ({
  /* ======================================================
     STATE
  ====================================================== */
  previewRows: [],
  uploading: false,
  creating: false,
  error: null,

  /* ======================================================
     DERIVED (HELPERS)
  ====================================================== */
  get validRows() {
    return get().previewRows.filter((r) => r.isValid);
  },

  get invalidRows() {
    return get().previewRows.filter((r) => !r.isValid);
  },

  get stats() {
    const rows = get().previewRows;
    return {
      total: rows.length,
      valid: rows.filter((r) => r.isValid).length,
      invalid: rows.filter((r) => !r.isValid).length,
    };
  },

  /* ======================================================
     ACTIONS
  ====================================================== */

  /* ---------- RESET ---------- */
  resetBulkImport: () =>
    set({
      previewRows: [],
      uploading: false,
      creating: false,
      error: null,
    }),

  /* ---------- CSV PREVIEW ---------- */
  uploadCSVForPreview: async (file) => {
    if (!file) return;

    try {
      set({ uploading: true, error: null });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/api/products/bulk/preview`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "CSV preview failed");
      }

      set({
        previewRows: Array.isArray(data.preview) ? data.preview : [],
        uploading: false,
      });
    } catch (e) {
      set({
        error: e.message || "Failed to preview CSV",
        uploading: false,
      });
    }
  },

  /* ---------- CREATE DRAFT PRODUCTS ---------- */
  createDraftProducts: async () => {
    const rows = get().validRows;
    if (!rows.length) {
      set({ error: "No valid rows to import" });
      return;
    }

    try {
      set({ creating: true, error: null });

      const res = await fetch(
        `${API}/api/products/bulk/create-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Bulk create failed");
      }

      set({
        creating: false,
      });

      return data; // { createdCount }
    } catch (e) {
      set({
        creating: false,
        error: e.message || "Failed to create draft products",
      });
    }
  },

  /* ---------- UPDATE SINGLE ROW (INLINE EDIT SUPPORT) ---------- */
  updatePreviewRow: (rowIndex, patch) => {
    const rows = [...get().previewRows];
    if (!rows[rowIndex]) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      ...patch,
    };

    // re-evaluate validity if needed
    const errors = [];
    if (!rows[rowIndex].title) errors.push("Missing title");
    if (!Number.isFinite(Number(rows[rowIndex].price)))
      errors.push("Invalid price");
    if (!rows[rowIndex].categories?.length)
      errors.push("Missing category");

    rows[rowIndex].errors = errors;
    rows[rowIndex].isValid = errors.length === 0;

    set({ previewRows: rows });
  },
}));
