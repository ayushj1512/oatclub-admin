import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

/* ---------------------------
   API helper
---------------------------- */
const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // keep if you use cookies auth; else remove
});

/* ---------------------------
   Thunks
---------------------------- */

// ✅ Admin list (pagination + filters + search)
export const fetchAdminReviews = createAsyncThunk(
  "adminReviews/fetchAdminReviews",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/reviews/admin/list", { params });
      return res.data; // { items, meta }
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

// ✅ Admin: add review (uses public endpoint)
export const adminCreateReview = createAsyncThunk(
  "adminReviews/adminCreateReview",
  async (payload, { rejectWithValue }) => {
    try {
      // payload can be FormData if you support images
      const isFormData = payload instanceof FormData;
      const res = await api.post("/reviews", payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
      });
      return res.data.review;
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

// ✅ Admin: update review
export const adminUpdateReview = createAsyncThunk(
  "adminReviews/adminUpdateReview",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/reviews/${id}`, data);
      return res.data.review;
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

// ✅ Admin: delete review
export const adminDeleteReview = createAsyncThunk(
  "adminReviews/adminDeleteReview",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/reviews/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

// ✅ Admin: bulk status update
export const adminBulkUpdateStatus = createAsyncThunk(
  "adminReviews/adminBulkUpdateStatus",
  async ({ ids, status }, { rejectWithValue }) => {
    try {
      const res = await api.patch("/reviews/admin/bulk/status", { ids, status });
      return { ids, status, message: res.data?.message };
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

// ✅ Admin: bulk delete
export const adminBulkDelete = createAsyncThunk(
  "adminReviews/adminBulkDelete",
  async ({ ids }, { rejectWithValue }) => {
    try {
      const res = await api.post("/reviews/admin/bulk/delete", { ids });
      return { ids, message: res.data?.message };
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || e.message);
    }
  }
);

/* ---------------------------
   Slice
---------------------------- */

const initialState = {
  // list
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },

  // UI state
  loading: false,
  error: null,

  // selection (bulk actions)
  selectedIds: [],

  // last used filters (handy for refresh after actions)
  query: {
    page: 1,
    limit: 20,
    status: "",
    rating: "",
    productCode: "",
    customerEmail: "",
    q: "",
    sort: "latest",
  },
};

const adminReviewsSlice = createSlice({
  name: "adminReviews",
  initialState,
  reducers: {
    setAdminReviewQuery(state, action) {
      state.query = { ...state.query, ...action.payload };
    },
    clearAdminReviewError(state) {
      state.error = null;
    },

    // bulk selection helpers
    toggleSelect(state, action) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
    },
    selectAllOnPage(state) {
      state.selectedIds = state.items.map((x) => String(x._id));
    },
    clearSelection(state) {
      state.selectedIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---- list ---- */
      .addCase(fetchAdminReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || [];
        state.meta = action.payload.meta || state.meta;
      })
      .addCase(fetchAdminReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load reviews";
      })

      /* ---- create ---- */
      .addCase(adminCreateReview.pending, (state) => {
        state.error = null;
      })
      .addCase(adminCreateReview.fulfilled, (state, action) => {
        // optimistic: add to top
        state.items = [action.payload, ...state.items];
        state.meta.total += 1;
      })
      .addCase(adminCreateReview.rejected, (state, action) => {
        state.error = action.payload || "Failed to create review";
      })

      /* ---- update ---- */
      .addCase(adminUpdateReview.pending, (state) => {
        state.error = null;
      })
      .addCase(adminUpdateReview.fulfilled, (state, action) => {
        const updated = action.payload;
        state.items = state.items.map((r) => (String(r._id) === String(updated._id) ? updated : r));
      })
      .addCase(adminUpdateReview.rejected, (state, action) => {
        state.error = action.payload || "Failed to update review";
      })

      /* ---- delete ---- */
      .addCase(adminDeleteReview.pending, (state) => {
        state.error = null;
      })
      .addCase(adminDeleteReview.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((r) => String(r._id) !== String(id));
        state.selectedIds = state.selectedIds.filter((x) => String(x) !== String(id));
        state.meta.total = Math.max(0, (state.meta.total || 0) - 1);
      })
      .addCase(adminDeleteReview.rejected, (state, action) => {
        state.error = action.payload || "Failed to delete review";
      })

      /* ---- bulk status ---- */
      .addCase(adminBulkUpdateStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(adminBulkUpdateStatus.fulfilled, (state, action) => {
        const { ids, status } = action.payload;
        const set = new Set(ids.map(String));
        state.items = state.items.map((r) =>
          set.has(String(r._id)) ? { ...r, status } : r
        );
      })
      .addCase(adminBulkUpdateStatus.rejected, (state, action) => {
        state.error = action.payload || "Failed to update status";
      })

      /* ---- bulk delete ---- */
      .addCase(adminBulkDelete.pending, (state) => {
        state.error = null;
      })
      .addCase(adminBulkDelete.fulfilled, (state, action) => {
        const { ids } = action.payload;
        const set = new Set(ids.map(String));
        state.items = state.items.filter((r) => !set.has(String(r._id)));
        state.selectedIds = state.selectedIds.filter((x) => !set.has(String(x)));
        state.meta.total = Math.max(0, (state.meta.total || 0) - ids.length);
      })
      .addCase(adminBulkDelete.rejected, (state, action) => {
        state.error = action.payload || "Failed to bulk delete";
      });
  },
});

export const {
  setAdminReviewQuery,
  clearAdminReviewError,
  toggleSelect,
  selectAllOnPage,
  clearSelection,
} = adminReviewsSlice.actions;

export default adminReviewsSlice.reducer;
