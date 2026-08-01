"use client";

import { create } from "zustand";
import toast from "react-hot-toast";

const API = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const str = (value) => (value == null ? "" : String(value));

const toPositiveNumber = (value, fallback = 1) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
};

const dedupeById = (previous = [], incoming = []) => {
  const map = new Map();

  [...previous, ...incoming].forEach((item) => {
    const id = str(item?._id);

    if (id) {
      map.set(id, item);
    }
  });

  return [...map.values()];
};

const readResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message: text || "Unexpected server response",
  };
};

const ensureApiConfigured = () => {
  if (!API) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
};

export const useAdminMediaStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pages: 1,
  limit: 48,

  q: "",
  type: "",
  source: "",

  loading: false,
  uploading: false,
  syncing: false,
  loadingMore: false,

  deletingIds: [],

  lastSync: null,

  /* =====================================================
     FETCH MEDIA
  ===================================================== */

  fetchMedia: async ({
    page = 1,
    limit = 48,
    append = false,
  } = {}) => {
    const loadingKey = append ? "loadingMore" : "loading";

    set({
      [loadingKey]: true,
    });

    try {
      ensureApiConfigured();

      const {
        q,
        type,
        source,
        items: currentItems,
      } = get();

      const requestedPage = toPositiveNumber(page, 1);
      const requestedLimit = toPositiveNumber(limit, 48);

      const params = new URLSearchParams({
        page: String(requestedPage),
        limit: String(requestedLimit),
      });

      const cleanQuery = str(q).trim();
      const cleanType = str(type).trim();
      const cleanSource = str(source).trim();

      if (cleanQuery) {
        params.set("q", cleanQuery);
      }

      if (cleanType) {
        params.set("type", cleanType);
      }

      if (cleanSource) {
        params.set("source", cleanSource);
      }

      const response = await fetch(
        `${API}/api/media?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load media"
        );
      }

      const incomingItems = Array.isArray(data?.items)
        ? data.items
        : [];

      set({
        items: append
          ? dedupeById(currentItems, incomingItems)
          : incomingItems,

        total: Number(data?.total || 0),
        page: Number(data?.page || requestedPage),
        pages: Math.max(Number(data?.pages || 1), 1),
        limit: Number(data?.limit || requestedLimit),
      });

      return data;
    } catch (error) {
      console.error("❌ fetchMedia:", error);

      toast.error(
        error.message || "Failed to load media"
      );

      if (!append) {
        set({
          items: [],
          total: 0,
          page: 1,
          pages: 1,
        });
      }

      return null;
    } finally {
      set({
        [loadingKey]: false,
      });
    }
  },

  /* =====================================================
     LOAD NEXT PAGE
  ===================================================== */

  loadMore: async () => {
    const {
      page,
      pages,
      limit,
      loading,
      loadingMore,
    } = get();

    if (
      loading ||
      loadingMore ||
      page >= pages
    ) {
      return null;
    }

    return get().fetchMedia({
      page: page + 1,
      limit,
      append: true,
    });
  },

  /* =====================================================
     UPLOAD MEDIA
     Backend uploads all new files to Cloudinary 2
  ===================================================== */

  uploadMedia: async ({
    files,
    folder = "oatclub/media",
  } = {}) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      toast.error("Please select at least one file");
      return null;
    }

    set({
      uploading: true,
    });

    try {
      ensureApiConfigured();

      const formData = new FormData();

      fileList.forEach((file) => {
        formData.append("files", file);
      });

      formData.append(
        "folder",
        str(folder).trim() || "oatclub/media"
      );

      const response = await fetch(
        `${API}/api/media/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Upload failed"
        );
      }

      const uploadedCount =
        Number(data?.count) ||
        Number(data?.media?.length) ||
        fileList.length;

      const destination =
        data?.uploadedTo === "cloudinary_2"
          ? "Cloudinary 2"
          : data?.cloudName || "Cloudinary";

      toast.success(
        `${uploadedCount} file${
          uploadedCount === 1 ? "" : "s"
        } uploaded to ${destination}`
      );

      set({
        page: 1,
      });

      await get().fetchMedia({
        page: 1,
        limit: get().limit,
        append: false,
      });

      return data;
    } catch (error) {
      console.error("❌ uploadMedia:", error);

      toast.error(
        error.message || "Upload failed"
      );

      return null;
    } finally {
      set({
        uploading: false,
      });
    }
  },

  /* =====================================================
     DELETE MEDIA
     Backend decides Cloudinary 1 or Cloudinary 2
  ===================================================== */

  deleteMedia: async (id) => {
    const mediaId = str(id).trim();

    if (!mediaId) {
      return null;
    }

    if (!window.confirm("Delete this media permanently?")) {
      return null;
    }

    const { deletingIds } = get();

    if (deletingIds.includes(mediaId)) {
      return null;
    }

    set({
      deletingIds: [...deletingIds, mediaId],
    });

    try {
      ensureApiConfigured();

      const response = await fetch(
        `${API}/api/media/${mediaId}`,
        {
          method: "DELETE",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Delete failed"
        );
      }

      set((state) => ({
        items: state.items.filter(
          (item) => str(item?._id) !== mediaId
        ),
        total: Math.max(state.total - 1, 0),
      }));

      const sourceLabel =
        data?.deletedFrom === "cloudinary_1"
          ? "Cloudinary 1"
          : data?.deletedFrom === "cloudinary_2"
            ? "Cloudinary 2"
            : "";

      toast.success(
        sourceLabel
          ? `Media deleted from ${sourceLabel}`
          : "Media deleted"
      );

      const {
        page,
        limit,
        items,
      } = get();

      if (!items.length && page > 1) {
        await get().fetchMedia({
          page: page - 1,
          limit,
          append: false,
        });
      }

      return data;
    } catch (error) {
      console.error("❌ deleteMedia:", error);

      toast.error(
        error.message || "Delete failed"
      );

      return null;
    } finally {
      set((state) => ({
        deletingIds: state.deletingIds.filter(
          (itemId) => itemId !== mediaId
        ),
      }));
    }
  },

  /* =====================================================
     SYNC CLOUDINARY 1 + CLOUDINARY 2
  ===================================================== */

  syncMedia: async ({
    max = 100,
  } = {}) => {
    const { syncing } = get();

    if (syncing) {
      return null;
    }

    set({
      syncing: true,
    });

    try {
      ensureApiConfigured();

      const safeMax = Math.min(
        toPositiveNumber(max, 100),
        500
      );

      const response = await fetch(
        `${API}/api/media/sync?max=${safeMax}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Sync failed"
        );
      }

      const cloudinary1Count = Number(
        data?.accounts?.cloudinary_1?.totalFound || 0
      );

      const cloudinary2Count = Number(
        data?.accounts?.cloudinary_2?.totalFound || 0
      );

      toast.success(
        `Media synced: ${cloudinary1Count} old + ${cloudinary2Count} new`
      );

      set({
        page: 1,
        lastSync: data,
      });

      await get().fetchMedia({
        page: 1,
        limit: get().limit,
        append: false,
      });

      return data;
    } catch (error) {
      console.error("❌ syncMedia:", error);

      toast.error(
        error.message || "Sync failed"
      );

      return null;
    } finally {
      set({
        syncing: false,
      });
    }
  },

  /* =====================================================
     FILTERS
  ===================================================== */

  setQuery: (q) => {
    set({
      q: str(q),
      page: 1,
    });
  },

  setType: (type) => {
    set({
      type: str(type),
      page: 1,
    });
  },

  setSource: (source) => {
    set({
      source: str(source),
      page: 1,
    });
  },

  resetFilters: () => {
    set({
      q: "",
      type: "",
      source: "",
      page: 1,
    });
  },

  clearMedia: () => {
    set({
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      lastSync: null,
    });
  },
}));