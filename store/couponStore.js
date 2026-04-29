import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

/* ------------------------------------------------------------------
HELPERS
------------------------------------------------------------------- */

const normEmail = (v) => (v ? String(v).trim().toLowerCase() : null);

const normPhone = (v) => {
  if (!v) return null;
  const digits = String(v).replace(/\D/g, "");
  return digits.length ? digits : null;
};

const cleanObject = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      return true;
    })
  );

const normalizeCartRules = (rules = []) => {
  if (!Array.isArray(rules)) return [];

  return rules
    .filter(Boolean)
    .map((rule) => ({
      ruleType: rule.ruleType,
      categories: Array.isArray(rule.categories) ? rule.categories : [],
      collections: Array.isArray(rule.collections) ? rule.collections : [],
      matchMode: rule.matchMode || "any",
      isActive: rule.isActive !== false,
    }))
    .filter((rule) => rule.ruleType);
};

const normalizeCouponPayload = (payload = {}) => {
  const cleanPayload = {
    ...payload,

    code: payload.code ? String(payload.code).trim().toUpperCase() : payload.code,

    visibility: payload.visibility || "public",

    autoApply: Boolean(payload.autoApply),

    categories: Array.isArray(payload.categories) ? payload.categories : [],

    collections: Array.isArray(payload.collections) ? payload.collections : [],

    cartRules: normalizeCartRules(payload.cartRules),

    discountTarget: payload.discountTarget || "cart",

    applyToAllEligibleItems: payload.applyToAllEligibleItems !== false,

    targetEmail: payload.targetEmail ? normEmail(payload.targetEmail) : null,

    targetPhone: payload.targetPhone ? normPhone(payload.targetPhone) : null,
  };

  // ✅ Backward compatibility only
  if (payload.cartRule) {
    cleanPayload.cartRule = {
      enabled: Boolean(payload.cartRule.enabled),
      ruleType: payload.cartRule.ruleType || "none",
      requiresPrimaryProduct: Boolean(payload.cartRule.requiresPrimaryProduct),
      requiresSecondaryProduct: Boolean(payload.cartRule.requiresSecondaryProduct),
      discountTarget: payload.cartRule.discountTarget || "cart",
      matchMode: payload.cartRule.matchMode || "any",
      applyToAllEligibleItems:
        payload.cartRule.applyToAllEligibleItems !== false,
    };
  }

  return cleanObject(cleanPayload);
};

/* ------------------------------------------------------------------
COUPON STORE
------------------------------------------------------------------- */

export const useCouponStore = create((set, get) => ({
  coupons: [],
  selectedCoupon: null,

  appliedCoupon: null,
  autoAppliedCoupon: null,

  loading: false,
  applying: false,
  autoApplying: false,
  redeeming: false,

  error: null,
  success: null,

  /* ------------------------------------------------------------------
  FETCH ALL COUPONS - ADMIN

  Supported filters:
  type, isActive, influencerId, visibility, autoApply,
  ruleType, category, collection, discountTarget, search
  ------------------------------------------------------------------- */

  fetchCoupons: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      const query = new URLSearchParams(cleanObject(filters)).toString();

      const res = await fetch(`${API}/api/coupons${query ? `?${query}` : ""}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch coupons");

      set({
        coupons: data.data || [],
        loading: false,
      });

      return data.data || [];
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  FETCH SINGLE COUPON - ADMIN/PUBLIC
  ------------------------------------------------------------------- */

  fetchCouponByIdOrCode: async (idOrCode) => {
    try {
      set({ loading: true, error: null, selectedCoupon: null });

      const res = await fetch(`${API}/api/coupons/${idOrCode}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch coupon");

      set({
        selectedCoupon: data,
        loading: false,
      });

      return data;
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  CREATE COUPON - ADMIN
  ------------------------------------------------------------------- */

  createCoupon: async (payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const cleanPayload = normalizeCouponPayload(payload);

      const res = await fetch(`${API}/api/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cleanPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create coupon");

      set((state) => ({
        coupons: [data.data, ...state.coupons],
        loading: false,
        success: "Coupon created successfully",
      }));

      return data.data;
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  UPDATE COUPON - ADMIN
  ------------------------------------------------------------------- */

  updateCoupon: async (id, payload) => {
    try {
      set({ loading: true, error: null, success: null });

      const cleanPayload = normalizeCouponPayload(payload);

      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cleanPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update coupon");

      set((state) => ({
        coupons: state.coupons.map((coupon) =>
          coupon._id === id ? data.data : coupon
        ),
        selectedCoupon:
          state.selectedCoupon?._id === id ? data.data : state.selectedCoupon,
        loading: false,
        success: "Coupon updated successfully",
      }));

      return data.data;
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  DELETE COUPON - ADMIN
  ------------------------------------------------------------------- */

  deleteCoupon: async (id) => {
    try {
      set({ loading: true, error: null, success: null });

      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete coupon");

      set((state) => ({
        coupons: state.coupons.filter((coupon) => coupon._id !== id),
        selectedCoupon:
          state.selectedCoupon?._id === id ? null : state.selectedCoupon,
        loading: false,
        success: "Coupon deleted successfully",
      }));

      return true;
    } catch (err) {
      set({
        error: err.message,
        loading: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  APPLY COUPON - CUSTOMER/CART
  ------------------------------------------------------------------- */

  applyCoupon: async ({
    code,
    cartTotal,
    cartItems = [],
    email,
    phone,
    customerId,
  }) => {
    try {
      set({ applying: true, error: null, appliedCoupon: null });

      const res = await fetch(`${API}/api/coupons/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          cartTotal,
          cartItems,
          email: email ? normEmail(email) : null,
          phone: phone ? normPhone(phone) : null,
          customerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to apply coupon");

      set({
        appliedCoupon: data,
        applying: false,
      });

      return data;
    } catch (err) {
      set({
        error: err.message,
        applying: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  AUTO APPLY BEST COUPON - CUSTOMER/CART
  ------------------------------------------------------------------- */

  autoApplyCoupon: async ({
    cartTotal,
    cartItems = [],
    email,
    phone,
    customerId,
  }) => {
    try {
      set({ autoApplying: true, error: null, autoAppliedCoupon: null });

      const res = await fetch(`${API}/api/coupons/auto-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cartTotal,
          cartItems,
          email: email ? normEmail(email) : null,
          phone: phone ? normPhone(phone) : null,
          customerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to auto apply coupon");
      }

      set({
        autoAppliedCoupon: data,
        appliedCoupon: data?.applied ? data : null,
        autoApplying: false,
      });

      return data;
    } catch (err) {
      set({
        error: err.message,
        autoApplying: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  REDEEM COUPON
  ------------------------------------------------------------------- */

  redeemCoupon: async ({
    code,
    cartTotal,
    cartItems = [],
    email,
    phone,
    customerId,
  }) => {
    try {
      set({ redeeming: true, error: null });

      const res = await fetch(`${API}/api/coupons/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          cartTotal,
          cartItems,
          email: email ? normEmail(email) : null,
          phone: phone ? normPhone(phone) : null,
          customerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to redeem coupon");

      set({
        redeeming: false,
        success: "Coupon redeemed successfully",
      });

      return data;
    } catch (err) {
      set({
        error: err.message,
        redeeming: false,
      });
      throw err;
    }
  },

  /* ------------------------------------------------------------------
  LOCAL HELPERS
  ------------------------------------------------------------------- */

  clearAppliedCoupon: () =>
    set({
      appliedCoupon: null,
      autoAppliedCoupon: null,
    }),

  clearSelectedCoupon: () => set({ selectedCoupon: null }),

  clearMessages: () => set({ error: null, success: null }),

  getCouponById: (id) => get().coupons.find((coupon) => coupon._id === id),

  getCouponByCode: (code) =>
    get().coupons.find(
      (coupon) =>
        String(coupon.code || "").toUpperCase() ===
        String(code || "").toUpperCase()
    ),

  getCouponByNumber: (couponNumber) =>
    get().coupons.find(
      (coupon) => String(coupon.couponNumber) === String(couponNumber)
    ),
}));