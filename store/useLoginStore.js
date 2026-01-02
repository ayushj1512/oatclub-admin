"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useLoginStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      admin: null,
      token: "",

      login: ({ token, admin }) => {
        if (typeof window !== "undefined" && token) {
          localStorage.setItem("adminToken", token); // ✅ compatibility
        }

        set({
          isLoggedIn: true,
          admin: admin || null,
          token: token || "",
        });
      },

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

      setToken: (token) => {
        if (typeof window !== "undefined" && token) {
          localStorage.setItem("adminToken", token);
        }
        set({ token: token || "" });
      },

      getRole: () => get().admin?.role || "",
      getUsername: () => get().admin?.username || "",
    }),
    {
      name: "miray-admin-session",

      // ✅ correct JSON storage (fix)
      storage: createJSONStorage(() => localStorage),

      // ✅ optional but recommended (only store needed fields)
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        admin: state.admin,
        token: state.token,
      }),
    }
  )
);

export default useLoginStore;
