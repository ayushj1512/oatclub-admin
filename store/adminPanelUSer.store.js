// stores/adminPanel.store.js
import { create } from "zustand";

/* ============================================================
   CONFIG
   ✅ Use: NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
============================================================ */
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/* ============================================================
   INTERNAL HELPERS (kept inside store file)
============================================================ */
const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

const setToken = (token) => {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem("admin_token");
  else localStorage.setItem("admin_token", token);
};

const api = async (path, { method = "GET", body, token } = {}) => {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

/* ============================================================
   STORE
============================================================ */
export const useAdminPanelStore = create((set, get) => ({
  /* =======================
     AUTH STATE
  ======================= */
  token: getToken(),
  admin: null,

  /* =======================
     USERS STATE
  ======================= */
  users: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,

  filters: {
    search: "",
    role: "",
    isActive: "", // "" | "true" | "false"
  },

  /* =======================
     UI STATE
  ======================= */
  loading: false,
  error: null,
  clearError: () => set({ error: null }),

  /* =======================
     AUTH ACTIONS
  ======================= */
  login: async ({ username, password }) => {
    set({ loading: true, error: null });
    try {
      const data = await api(`/api/admin-users/login`, {
        method: "POST",
        body: { username, password },
      });

      setToken(data.token);

      set({
        token: data.token,
        admin: data.admin,
        loading: false,
      });

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  logout: () => {
    setToken(null);
    set({
      token: null,
      admin: null,
      users: [],
      total: 0,
      totalPages: 1,
    });
  },

  /* =======================
     FILTERS & PAGINATION
  ======================= */
  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...patch },
      page: 1,
    })),

  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  /* =======================
     FETCH USERS
  ======================= */
  fetchUsers: async () => {
    const { token, page, limit, filters } = get();
    set({ loading: true, error: null });

    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: filters.search || "",
        role: filters.role || "",
        isActive: filters.isActive ?? "",
      });

      const data = await api(`/api/admin-users?${qs.toString()}`, { token });

      set({
        users: data.users || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        page: data.page || page,
        limit: data.limit || limit,
        loading: false,
      });

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     CREATE USER
  ======================= */
  createUser: async (payload) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users`, {
        method: "POST",
        token,
        body: payload,
      });

      await get().fetchUsers();
      set({ loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     UPDATE USER (PROFILE)
     PATCH /:id
  ======================= */
  updateUser: async (id, payload) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users/${id}`, {
        method: "PATCH",
        token,
        body: payload,
      });

      set((s) => ({
        users: s.users.map((u) => (u._id === id ? data.user : u)),
        loading: false,
      }));

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     UPDATE ROLE + PERMS
     PATCH /:id/role
  ======================= */
  updateRoleAndPermissions: async (id, payload) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users/${id}/role`, {
        method: "PATCH",
        token,
        body: payload,
      });

      set((s) => ({
        users: s.users.map((u) => (u._id === id ? data.user : u)),
        loading: false,
      }));

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     CHANGE PASSWORD
     PATCH /:id/password
  ======================= */
  changePassword: async (id, newPassword) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users/${id}/password`, {
        method: "PATCH",
        token,
        body: { newPassword },
      });

      set({ loading: false });
      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     UNLOCK USER
     PATCH /:id/unlock
  ======================= */
  unlockUser: async (id) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users/${id}/unlock`, {
        method: "PATCH",
        token,
      });

      set((s) => ({
        users: s.users.map((u) => (u._id === id ? data.user : u)),
        loading: false,
      }));

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  /* =======================
     DELETE USER
     DELETE /:id
  ======================= */
  deleteUser: async (id) => {
    const { token } = get();
    set({ loading: true, error: null });

    try {
      const data = await api(`/api/admin-users/${id}`, {
        method: "DELETE",
        token,
      });

      set((s) => ({
        users: s.users.filter((u) => u._id !== id),
        loading: false,
      }));

      return data;
    } catch (e) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },
}));
