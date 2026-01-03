"use client";

import { create } from "zustand";
import axios from "axios";
import { toast } from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// ✅ Update these endpoints based on your backend
const PREVIEW_API = `${BASE_URL}/api/products/bulk/preview`;
const CREATE_DRAFT_API = `${BASE_URL}/api/products/bulk/create-draft`;

/* -------------------------------------------------------
   HELPERS
-------------------------------------------------------- */

// ✅ Validation
const validateRow = (r) => {
  const errors = [];

  const title = String(r.title || "").trim();
  const price = Number(r.price);
  const categories = Array.isArray(r.categories) ? r.categories : [];

  if (!title) errors.push("Missing title");
  if (!Number.isFinite(price)) errors.push("Invalid price");
  if (!categories.length) errors.push("Missing category");

  return {
    ...r,
    title,
    price,
    categories,
    stock: Number(r.stock || 0),
    isValid: errors.length === 0,
    errors,
  };
};

// ✅ normalize tags
const tagsNorm = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim().toLowerCase());
  return String(tags)
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
};

// ✅ apply global defaults to a row
const applyDefaultsToRow = (row, defaults) => {
  if (!defaults) return row;

  return validateRow({
    ...row,
    categories:
      defaults.categories?.length && (!row.categories || !row.categories.length)
        ? defaults.categories
        : row.categories,

    attributes:
      defaults.attributes?.length && (!row.attributes || !row.attributes.length)
        ? defaults.attributes
        : row.attributes,

    images:
      defaults.images?.length && (!row.images || !row.images.length)
        ? defaults.images
        : row.images,

    thumbnail:
      defaults.thumbnail && (!row.thumbnail || row.thumbnail === "")
        ? defaults.thumbnail
        : row.thumbnail,
  });
};

// ✅ auto row number generator
const nextRowNumber = (rows) => {
  if (!Array.isArray(rows) || !rows.length) return 1;
  return Math.max(...rows.map((r) => Number(r.row || 0))) + 1;
};

export const useAdminBulkProductStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */
  previewRows: [], // combined CSV + Manual
  selectedRowIds: [], // array of row numbers

  uploading: false,
  creating: false,

  error: null,
  successMessage: null,

  globalDefaults: {
    categories: [],
    attributes: [],
    images: [],
    thumbnail: "",
  },

  /* ============================================================
     STATUS HELPERS
  ============================================================ */
  clearStatus: () => set({ error: null, successMessage: null }),

  /* ============================================================
     UPLOAD CSV → PREVIEW
  ============================================================ */
  uploadCSVForPreview: async (file) => {
    try {
      set({
        uploading: true,
        error: null,
        successMessage: null,
      });

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(PREVIEW_API, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      let preview = Array.isArray(data.preview) ? data.preview : [];

      // ✅ apply global defaults to every row
      const defaults = get().globalDefaults;
      preview = preview.map((r) => applyDefaultsToRow(r, defaults));

      // ✅ auto select all valid
      const selectedRowIds = preview.filter((r) => r.isValid).map((r) => r.row);

      set({
        previewRows: preview,
        selectedRowIds,
        uploading: false,
      });

      toast.success("✅ CSV parsed successfully");
    } catch (e) {
      console.error(e);
      set({
        uploading: false,
        error: e?.response?.data?.message || e.message,
      });
      toast.error(e?.response?.data?.message || e.message);
    }
  },

  /* ============================================================
     MANUAL ROWS
  ============================================================ */

  // ✅ addManualRow is here now ✅
  addManualRow: () => {
    const rows = get().previewRows;
    const newRowNumber = nextRowNumber(rows);

    const emptyRow = validateRow({
      row: newRowNumber,
      title: "",
      price: "",
      compareAtPrice: null,
      categories: [],
      stock: 0,
      tags: [],
      shortDescription: "",
      description: "",
      images: [],
      thumbnail: "",
      attributes: [],
      variants: [],
      sku: "",
    });

    // ✅ apply defaults
    const defaults = get().globalDefaults;
    const finalRow = applyDefaultsToRow(emptyRow, defaults);

    set({
      previewRows: [...rows, finalRow],
    });

    toast.success("➕ Manual row added");
  },

  updateManualRowField: (rowId, field, value) => {
    const rows = get().previewRows;

    const updated = rows.map((r) => {
      if (r.row !== rowId) return r;

      const next = { ...r, [field]: value };

      // normalize certain fields
      if (field === "tags") next.tags = tagsNorm(value);
      if (field === "price" || field === "stock") next[field] = Number(value);

      // ensure categories always array
      if (field === "categories" && typeof value === "string") {
        next.categories = value.split(",").map((x) => x.trim()).filter(Boolean);
      }

      return validateRow(next);
    });

    set({ previewRows: updated });
  },

  deleteManualRow: (rowId) => {
    const rows = get().previewRows.filter((r) => r.row !== rowId);
    const selectedRowIds = get().selectedRowIds.filter((id) => id !== rowId);

    set({
      previewRows: rows,
      selectedRowIds,
    });

    toast.success("🗑️ Row deleted");
  },

  /* ============================================================
     ROW SELECTION
  ============================================================ */
  toggleRowSelection: (rowId) => {
    const selected = get().selectedRowIds;

    if (selected.includes(rowId)) {
      set({ selectedRowIds: selected.filter((id) => id !== rowId) });
    } else {
      set({ selectedRowIds: [...selected, rowId] });
    }
  },

  selectAllValidRows: () => {
    const ids = get()
      .previewRows.filter((r) => r.isValid)
      .map((r) => r.row);
    set({ selectedRowIds: ids });
  },

  clearSelection: () => set({ selectedRowIds: [] }),

  /* ============================================================
     GLOBAL DEFAULTS (from Setup Modal)
  ============================================================ */
  setGlobalDefaults: (config) => {
    set({
      globalDefaults: {
        categories: config.categories || [],
        attributes: config.attributes || [],
        images: config.images || [],
        thumbnail: config.thumbnail || "",
      },
    });

    toast.success("✅ Setup defaults saved");
  },

  applyDefaultsToSelectedRows: () => {
    const defaults = get().globalDefaults;
    const selected = get().selectedRowIds;

    const updated = get().previewRows.map((r) => {
      if (!selected.includes(r.row)) return r;
      return applyDefaultsToRow(r, defaults);
    });

    set({ previewRows: updated });
    toast.success("✅ Defaults applied to selected rows");
  },

  /* ============================================================
     CREATE DRAFT PRODUCTS
  ============================================================ */
  createDraftProducts: async () => {
    try {
      set({ creating: true, error: null, successMessage: null });

      const rows = get().previewRows;
      const selected = get().selectedRowIds;

      if (!selected.length) {
        set({ creating: false, error: "No rows selected for import" });
        toast.error("No rows selected");
        return;
      }

      const selectedRows = rows.filter((r) => selected.includes(r.row));

      const { data } = await axios.post(
        CREATE_DRAFT_API,
        { rows: selectedRows },
        { withCredentials: true }
      );

      set({
        creating: false,
        successMessage: data.message || "Draft products created successfully",
      });

      toast.success(data.message || "✅ Draft products created");
      return data;
    } catch (e) {
      console.error(e);
      set({
        creating: false,
        error: e?.response?.data?.message || e.message,
      });
      toast.error(e?.response?.data?.message || e.message);
    }
  },

  /* ============================================================
     RESET
  ============================================================ */
  resetBulkImport: () => {
    set({
      previewRows: [],
      selectedRowIds: [],
      uploading: false,
      creating: false,
      error: null,
      successMessage: null,
      globalDefaults: {
        categories: [],
        attributes: [],
        images: [],
        thumbnail: "",
      },
    });
  },
}));
