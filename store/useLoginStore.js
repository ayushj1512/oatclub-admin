"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const TOKEN_KEY_PRIMARY = "admin_token"; // ✅ used by adminPanel.store.js
const TOKEN_KEY_LEGACY = "adminToken";   // optional backward compatibility

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
            localStorage.setItem(TOKEN_KEY_PRIMARY, safeToken); // ✅ IMPORTANT
            localStorage.setItem(TOKEN_KEY_LEGACY, safeToken);  // optional
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
        }

        set({
          isLoggedIn: false,
          admin: null,
          token: "",
        });
      },

      /* ============================================================
         ✅ SET TOKEN
      ============================================================ */
      setToken: (token) => {
        const safeToken = token || "";

        if (typeof window !== "undefined") {
          if (safeToken) {
            localStorage.setItem(TOKEN_KEY_PRIMARY, safeToken); // ✅ IMPORTANT
            localStorage.setItem(TOKEN_KEY_LEGACY, safeToken);  // optional
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
      setAdmin: (admin) => set({ admin: admin || null }),

      /* ============================================================
         ✅ HYDRATE FROM LOCALSTORAGE
      ============================================================ */
      hydrateFromLegacyToken: () => {
        if (typeof window === "undefined") return;

        const t =
          localStorage.getItem(TOKEN_KEY_PRIMARY) ||
          localStorage.getItem(TOKEN_KEY_LEGACY);

        if (t && !get().token) {
          set({ token: t, isLoggedIn: true });
        }
      },

      /* ============================================================
         ✅ GETTERS
      ============================================================ */
      getRole: () => get().admin?.role || "",
      getUsername: () => get().admin?.username || "",
      getPermissions: () => get().admin?.permissions || [],
      isTokenPresent: () => !!get().token,

      hasRole: (...roles) => roles.includes(get().admin?.role || ""),
      hasPermission: (perm) => (get().admin?.permissions || []).includes(perm),
      isActive: () => get().admin?.isActive !== false,
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
