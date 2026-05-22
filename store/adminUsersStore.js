  import { create } from "zustand";
  import axios from "axios";
  import useLoginStore from "./useLoginStore";

  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  export const useAdminUsersVerifyStore = create((set, get) => ({
    users: [],
    selectedUser: null,

    loading: false,
    actionLoading: false,
    error: null,

    _headers: () => {
      const token = useLoginStore.getState().token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    _handleAuthError: (err) => {
      const code = err?.response?.data?.code;

      if (
        code === "SESSION_REVOKED" ||
        code === "TOKEN_INVALID" ||
        code === "TOKEN_MISSING" ||
        code === "ADMIN_NOT_FOUND" ||
        code === "ACCOUNT_DISABLED"
      ) {
        const loginStore = useLoginStore.getState();

        if (typeof loginStore.logout === "function") {
          loginStore.logout();
        } else {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("token");
        }

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    },

    _getErrorMessage: (err, fallback = "Something went wrong") => {
      return err?.response?.data?.message || err.message || fallback;
    },

    clearError: () => set({ error: null }),

    fetchUsers: async (params = {}) => {
      try {
        set({ loading: true, error: null });

        const { data } = await axios.get(`${BASE_URL}/api/admin-users`, {
          headers: get()._headers(),
          params,
        });

        set({
          users: data.users || [],
          loading: false,
        });

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          loading: false,
          error: get()._getErrorMessage(err, "Failed to fetch users"),
        });

        return null;
      }
    },

    fetchUserById: async (id) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ loading: true, error: null });

        const { data } = await axios.get(`${BASE_URL}/api/admin-users/${id}`, {
          headers: get()._headers(),
        });

        set({
          selectedUser: data.user || null,
          loading: false,
        });

        return data.user;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          loading: false,
          error: get()._getErrorMessage(err, "Failed to fetch user"),
        });

        return null;
      }
    },

    createUser: async (payload) => {
      try {
        set({ actionLoading: true, error: null });

        const { data } = await axios.post(`${BASE_URL}/api/admin-users`, payload, {
          headers: get()._headers(),
        });

        const createdUser = data.user;

        set((state) => ({
          users: createdUser ? [createdUser, ...state.users] : state.users,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to create user"),
        });

        return null;
      }
    },

    updateUser: async (id, payload) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.patch(
          `${BASE_URL}/api/admin-users/${id}`,
          payload,
          {
            headers: get()._headers(),
          }
        );

        const updatedUser = data.user;

        set((state) => ({
          users: state.users.map((user) =>
            user._id === id ? updatedUser || user : user
          ),
          selectedUser:
            state.selectedUser?._id === id
              ? updatedUser || state.selectedUser
              : state.selectedUser,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to update user"),
        });

        return null;
      }
    },

    updateRoleAndPermissions: async (id, payload) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.patch(
          `${BASE_URL}/api/admin-users/${id}/role`,
          payload,
          {
            headers: get()._headers(),
          }
        );

        const updatedUser = data.user;

        set((state) => ({
          users: state.users.map((user) =>
            user._id === id ? updatedUser || user : user
          ),
          selectedUser:
            state.selectedUser?._id === id
              ? updatedUser || state.selectedUser
              : state.selectedUser,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(
            err,
            "Failed to update role or permissions"
          ),
        });

        return null;
      }
    },

    changePassword: async (id, newPassword) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.patch(
          `${BASE_URL}/api/admin-users/${id}/password`,
          { newPassword },
          {
            headers: get()._headers(),
          }
        );

        set({ actionLoading: false });

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to change password"),
        });

        return null;
      }
    },

    unlockUser: async (id) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.patch(
          `${BASE_URL}/api/admin-users/${id}/unlock`,
          {},
          {
            headers: get()._headers(),
          }
        );

        const updatedUser = data.user;

        set((state) => ({
          users: state.users.map((user) =>
            user._id === id ? updatedUser || user : user
          ),
          selectedUser:
            state.selectedUser?._id === id
              ? updatedUser || state.selectedUser
              : state.selectedUser,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to unlock user"),
        });

        return null;
      }
    },

    forceLogoutUser: async (id) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.patch(
          `${BASE_URL}/api/admin-users/${id}/force-logout`,
          {},
          {
            headers: get()._headers(),
          }
        );

        const updatedUser = data.user;

        set((state) => ({
          users: state.users.map((user) =>
            user._id === id ? updatedUser || user : user
          ),
          selectedUser:
            state.selectedUser?._id === id
              ? updatedUser || state.selectedUser
              : state.selectedUser,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to force logout user"),
        });

        return null;
      }
    },

    deleteUser: async (id) => {
      try {
        if (!id) throw new Error("User id is required");

        set({ actionLoading: true, error: null });

        const { data } = await axios.delete(`${BASE_URL}/api/admin-users/${id}`, {
          headers: get()._headers(),
        });

        set((state) => ({
          users: state.users.filter((user) => user._id !== id),
          selectedUser:
            state.selectedUser?._id === id ? null : state.selectedUser,
          actionLoading: false,
        }));

        return data;
      } catch (err) {
        get()._handleAuthError(err);

        set({
          actionLoading: false,
          error: get()._getErrorMessage(err, "Failed to delete user"),
        });

        return null;
      }
    },
  }));