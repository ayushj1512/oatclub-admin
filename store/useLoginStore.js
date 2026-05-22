"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const TOKEN_KEY_PRIMARY = "admin_token";
const TOKEN_KEY_LEGACY = "adminToken";

const useLoginStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      admin: null,
      token: "",

      /* ============================================================
         ✅ LOGIN
      ============================================================ */
      login: ({ token, admin }) => {
        const safeToken = token || "";
        const safeAdmin = admin || null;

        if (typeof window !== "undefined") {
          if (safeToken) {
            localStorage.setItem(TOKEN_KEY_PRIMARY, safeToken);
            localStorage.setItem(TOKEN_KEY_LEGACY, safeToken);
          } else {
            localStorage.removeItem(TOKEN_KEY_PRIMARY);
            localStorage.removeItem(TOKEN_KEY_LEGACY);
          }
        }

        set({
          isLoggedIn: !!safeToken,
          admin: safeAdmin,
          token: safeToken,
        });
      },

      /* ============================================================
         ✅ LOGOUT
      ============================================================ */
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY_PRIMARY);
          localStorage.removeItem(TOKEN_KEY_LEGACY);

          // ✅ clear zustand persist session
          localStorage.removeItem("miray-admin-session");
        }

        set({
          isLoggedIn: false,
          admin: null,
          token: "",
        });
      },

      /* ============================================================
         ✅ FORCE LOGOUT + REDIRECT
      ============================================================ */
      forceLogout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY_PRIMARY);
          localStorage.removeItem(TOKEN_KEY_LEGACY);
          localStorage.removeItem("miray-admin-session");
        }

        set({
          isLoggedIn: false,
          admin: null,
          token: "",
        });

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      /* ============================================================
         ✅ HANDLE AUTH ERRORS
      ============================================================ */
      handleAuthError: (err) => {
        const code = err?.response?.data?.code;

        const shouldLogout =
          code === "SESSION_REVOKED" ||
          code === "TOKEN_INVALID" ||
          code === "TOKEN_MISSING" ||
          code === "ADMIN_NOT_FOUND" ||
          code === "ACCOUNT_DISABLED";

        if (!shouldLogout) return false;

        get().forceLogout();

        return true;
      },

      /* ============================================================
         ✅ SET TOKEN
      ============================================================ */
      setToken: (token) => {
        const safeToken = token || "";

        if (typeof window !== "undefined") {
          if (safeToken) {
            localStorage.setItem(TOKEN_KEY_PRIMARY, safeToken);
            localStorage.setItem(TOKEN_KEY_LEGACY, safeToken);
          } else {
            localStorage.removeItem(TOKEN_KEY_PRIMARY);
            localStorage.removeItem(TOKEN_KEY_LEGACY);
          }
        }

        set({
          token: safeToken,
          isLoggedIn: !!safeToken,
        });
      },

      /* ============================================================
         ✅ SET ADMIN
      ============================================================ */
      setAdmin: (admin) =>
        set({
          admin: admin || null,
        }),

      /* ============================================================
         ✅ UPDATE ADMIN
      ============================================================ */
      updateAdmin: (updates = {}) => {
        const currentAdmin = get().admin || {};

        set({
          admin: {
            ...currentAdmin,
            ...updates,
          },
        });
      },

      /* ============================================================
         ✅ HYDRATE FROM LOCALSTORAGE
      ============================================================ */
      hydrateFromLegacyToken: () => {
        if (typeof window === "undefined") return;

        const t =
          localStorage.getItem(TOKEN_KEY_PRIMARY) ||
          localStorage.getItem(TOKEN_KEY_LEGACY);

        if (t && !get().token) {
          set({
            token: t,
            isLoggedIn: true,
          });
        }
      },

      /* ============================================================
         ✅ GETTERS
      ============================================================ */
      getRole: () => get().admin?.role || "",

      getUsername: () => get().admin?.username || "",

      getPermissions: () => get().admin?.permissions || [],

      isTokenPresent: () => !!get().token,

      hasRole: (...roles) => {
        return roles.includes(get().admin?.role || "");
      },

      hasPermission: (perm) => {
        return (get().admin?.permissions || []).includes(perm);
      },

      isActive: () => {
        return get().admin?.isActive !== false;
      },
    }),
    {
      name: "miray-admin-session",

      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        admin: state.admin,
        token: state.token,
      }),
    }
  )
);

export default useLoginStore;