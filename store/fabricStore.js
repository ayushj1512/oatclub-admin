import { create } from "zustand";

/* ============================================================
   CONFIG
============================================================ */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/fabrics`
    : "/api/fabrics";

/* ============================================================
   FABRIC STORE
============================================================ */
export const useFabricStore = create((set, get) => ({
  /* -------------------------------
     STATE
  -------------------------------- */
  fabrics: [],
  selectedFabric: null,

  loading: false,
  error: null,

  filters: {
    q: "",
    status: "",
    movementStatus: "",
  },

  /* -------------------------------
     INTERNAL HELPERS
  -------------------------------- */
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /* -------------------------------
     FETCH ALL FABRICS
  -------------------------------- */
  fetchFabrics: async () => {
    const { filters } = get();

    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.status) params.append("status", filters.status);
      if (filters.movementStatus)
        params.append("movementStatus", filters.movementStatus);

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch fabrics");

      set({ fabrics: data.data || [] });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------
     GET SINGLE FABRIC
  -------------------------------- */
  fetchFabricById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API_BASE}/${id}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Fabric not found");

      set({ selectedFabric: data.data });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------
     CREATE FABRIC
  -------------------------------- */
  createFabric: async (payload) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Create failed");

      // Optimistic append
      set((state) => ({
        fabrics: [data.data, ...state.fabrics],
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------
     UPDATE FABRIC
  -------------------------------- */
  updateFabric: async (id, updates) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Update failed");

      set((state) => ({
        fabrics: state.fabrics.map((f) =>
          f._id === id ? data.data : f
        ),
        selectedFabric:
          state.selectedFabric?._id === id
            ? data.data
            : state.selectedFabric,
      }));

      return data.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------
     UPDATE MOVEMENT STATUS
  -------------------------------- */
  updateMovementStatus: async (id, movementStatus) => {
    try {
      const res = await fetch(`${API_BASE}/${id}/movement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movementStatus }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Status update failed");

      set((state) => ({
        fabrics: state.fabrics.map((f) =>
          f._id === id
            ? { ...f, movementStatus }
            : f
        ),
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /* -------------------------------
     SOFT DELETE FABRIC
  -------------------------------- */
  deleteFabric: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      set((state) => ({
        fabrics: state.fabrics.filter((f) => f._id !== id),
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  /* -------------------------------
     FILTER HELPERS
  -------------------------------- */
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () =>
    set({
      filters: { q: "", status: "", movementStatus: "" },
    }),

  /* -------------------------------
     RESET
  -------------------------------- */
  resetFabricStore: () =>
    set({
      fabrics: [],
      selectedFabric: null,
      loading: false,
      error: null,
    }),
}));
