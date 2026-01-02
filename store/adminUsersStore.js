import { create } from "zustand";
import axios from "axios";
import useLoginStore from "./useLoginStore";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const useAdminUsersVerifyStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  loading: false,
  error: null,

  _headers: () => {
    const token = useLoginStore.getState().token; // ✅ from store
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  clearError: () => set({ error: null }),

  fetchUsers: async () => {
    try {
      set({ loading: true, error: null });

      const { data } = await axios.get(`${BASE_URL}/api/admin-users`, {
        headers: get()._headers(),
      });

      set({ users: data.users || [], loading: false });
      return data.users;
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.message ||
          err.message ||
          "Failed to fetch users",
      });
      return null;
    }
  },

  fetchUserById: async (id) => {
    try {
      set({ loading: true, error: null });

      const { data } = await axios.get(`${BASE_URL}/api/admin-users/${id}`, {
        headers: get()._headers(),
      });

      set({ selectedUser: data.user, loading: false });
      return data.user;
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.message ||
          err.message ||
          "Failed to fetch user",
      });
      return null;
    }
  },
}));
