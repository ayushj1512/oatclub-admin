"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useLoginStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      admin: null, // { _id, username, email, role, fullName, permissions, isActive }
      token: "",

      /* ============================================================
         ✅ LOGIN
      ============================================================ */
      login: ({ token, admin }) => {
        const safeToken = token || "";
        const safeAdmin = admin || null;

        // ✅ legacy compatibility
        if (typeof window !== "undefined" && safeToken) {
          localStorage.setItem("adminToken", safeToken);
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
          localStorage.removeItem("adminToken");
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
          if (safeToken) localStorage.setItem("adminToken", safeToken);
          else localStorage.removeItem("adminToken");
        }

        set({
          token: safeToken,
          isLoggedIn: !!safeToken,
        });
      },

      /* ============================================================
         ✅ SET ADMIN (update role/permissions after fetch /me)
      ============================================================ */
      setAdmin: (admin) => {
        set({ admin: admin || null });
      },

      /* ============================================================
         ✅ LEGACY TOKEN HYDRATE (Optional)
         - If Zustand storage lost but localStorage has adminToken
      ============================================================ */
      hydrateFromLegacyToken: () => {
        if (typeof window === "undefined") return;

        const legacy = localStorage.getItem("adminToken");
        if (legacy && !get().token) {
          set({
            token: legacy,
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

      /* ============================================================
         ✅ HELPERS FOR FRONTEND ROLE-BASED UI
      ============================================================ */
      hasRole: (...roles) => {
        const role = get().admin?.role || "";
        return roles.includes(role);
      },

      hasPermission: (perm) => {
        const list = get().admin?.permissions || [];
        return list.includes(perm);
      },

      /* ============================================================
         ✅ SAFE CHECK: account active?
      ============================================================ */
      isActive: () => get().admin?.isActive !== false, // default true
    }),
    {
      name: "miray-admin-session",

      // ✅ correct JSON storage
      storage: createJSONStorage(() => localStorage),

      // ✅ store only required fields
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        admin: state.admin,
        token: state.token,
      }),
    }
  )
);

export default useLoginStore;
