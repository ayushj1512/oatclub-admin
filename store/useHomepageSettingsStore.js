"use client";

import { create } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE = `${BASE_URL}/api/homepage-settings`;

/* =========================================================
   HELPERS
========================================================= */

const safeText = (value = "") => String(value || "").trim();

const hasValue = (value) => value !== undefined;

const sortByOrder = (items = []) =>
  [...items].sort(
    (firstItem, secondItem) =>
      Number(firstItem?.sortOrder || 0) -
      Number(secondItem?.sortOrder || 0)
  );

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
};

/* =========================================================
   NORMALIZE HERO BANNERS

   Desktop and mobile banners now use separate arrays.
   Each banner contains a single `image` field.
========================================================= */

const normalizeHeroBanners = (banners = []) =>
  sortByOrder(Array.isArray(banners) ? banners : []).map((item, index) => ({
    _id: item?._id,

    clientId:
      safeText(item?.clientId) ||
      safeText(item?._id) ||
      `hero-banner-${Date.now()}-${index}`,

    image: safeText(item?.image),

    publicId:
      safeText(item?.publicId) ||
      safeText(item?.imagePublicId),

    link: safeText(item?.link),
    title: safeText(item?.title),

    isActive: item?.isActive !== false,

    sortOrder:
      Number.isFinite(Number(item?.sortOrder))
        ? Number(item.sortOrder)
        : index,
  }));

/* =========================================================
   NORMALIZE CATEGORY ROW
========================================================= */

const normalizeCategoryRow = (row = []) =>
  sortByOrder(Array.isArray(row) ? row : []).map((item, index) => {
    const navigationType = item?.navigationType || "category";

    return {
      _id: item?._id,

      clientId:
        safeText(item?.clientId) ||
        safeText(item?._id) ||
        `category-row-${Date.now()}-${index}`,

      name: safeText(item?.name),
      navigationType,

      slug: ["category", "collection"].includes(navigationType)
        ? safeText(item?.slug)
        : "",

      customRoute:
        navigationType === "custom"
          ? safeText(item?.customRoute)
          : "",

      tag: safeText(item?.tag),

      image: safeText(item?.image),
      video: safeText(item?.video),

      imagePublicId: safeText(item?.imagePublicId),
      videoPublicId: safeText(item?.videoPublicId),

      isActive: item?.isActive !== false,

      sortOrder:
        Number.isFinite(Number(item?.sortOrder))
          ? Number(item.sortOrder)
          : index,
    };
  });

/* =========================================================
   NORMALIZE CATEGORY BANNERS
========================================================= */

const normalizeCategoryBanners = (banners = []) =>
  sortByOrder(Array.isArray(banners) ? banners : []).map(
    (item, index) => {
      const categoryName = safeText(item?.categoryName);
      const categorySlug = safeText(item?.categorySlug);

      return {
        _id: item?._id,

        clientId:
          safeText(item?.clientId) ||
          safeText(item?._id) ||
          `category-banner-${Date.now()}-${index}`,

        categoryName,
        categorySlug,

        title: safeText(item?.title) || categoryName,
        subtitle: safeText(item?.subtitle),

        image: safeText(item?.image),
        imagePublicId: safeText(item?.imagePublicId),

        link:
          safeText(item?.link) ||
          (categorySlug ? `/category/${categorySlug}` : ""),

        isActive: item?.isActive !== false,

        sortOrder:
          Number.isFinite(Number(item?.sortOrder))
            ? Number(item.sortOrder)
            : index,
      };
    }
  );

/* =========================================================
   SETTINGS NORMALIZER
========================================================= */

const normalizeSettings = (data = {}) => ({
  ...data,

  desktopHeroBanners: normalizeHeroBanners(
    data?.desktopHeroBanners || []
  ),

  mobileHeroBanners: normalizeHeroBanners(
    data?.mobileHeroBanners || []
  ),

  categoryRow: normalizeCategoryRow(data?.categoryRow || []),

  categoryBanners: normalizeCategoryBanners(
    data?.categoryBanners || []
  ),
});

/* =========================================================
   STORE
========================================================= */

export const useHomepageSettingsStore = create((set, get) => ({
  settings: null,

  desktopHeroBanners: [],
  mobileHeroBanners: [],

  categoryRow: [],
  categoryBanners: [],

  loading: false,
  saving: false,

  error: null,
  success: null,

  /* =======================================================
     MESSAGES
  ======================================================= */

  clearMessages: () =>
    set({
      error: null,
      success: null,
    }),

  /* =======================================================
     FETCH FULL HOMEPAGE SETTINGS
  ======================================================= */

  fetchHomepageSettings: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await fetch(API_BASE, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await parseResponse(response);
      const normalized = normalizeSettings(data);

      set({
        settings: normalized,

        desktopHeroBanners:
          normalized.desktopHeroBanners,

        mobileHeroBanners:
          normalized.mobileHeroBanners,

        categoryRow:
          normalized.categoryRow,

        categoryBanners:
          normalized.categoryBanners,

        loading: false,
      });

      return normalized;
    } catch (error) {
      set({
        loading: false,

        error:
          error?.message ||
          "Failed to fetch homepage settings",
      });

      return null;
    }
  },

  /* =======================================================
     FETCH HERO BANNERS ONLY
  ======================================================= */

  fetchHeroBanners: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await fetch(
        `${API_BASE}/hero-banners`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await parseResponse(response);

      const desktopHeroBanners =
        normalizeHeroBanners(
          data?.desktopHeroBanners || []
        );

      const mobileHeroBanners =
        normalizeHeroBanners(
          data?.mobileHeroBanners || []
        );

      set((state) => ({
        desktopHeroBanners,
        mobileHeroBanners,

        settings: state.settings
          ? {
              ...state.settings,
              desktopHeroBanners,
              mobileHeroBanners,
            }
          : state.settings,

        loading: false,
      }));

      return {
        desktopHeroBanners,
        mobileHeroBanners,
      };
    } catch (error) {
      set({
        loading: false,

        error:
          error?.message ||
          "Failed to fetch hero banners",
      });

      return {
        desktopHeroBanners: [],
        mobileHeroBanners: [],
      };
    }
  },

  /* =======================================================
     FETCH CATEGORY ROW ONLY
  ======================================================= */

  fetchCategoryRow: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await fetch(
        `${API_BASE}/category-row`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await parseResponse(response);

      const categoryRow = normalizeCategoryRow(
        data?.categoryRow || []
      );

      set((state) => ({
        categoryRow,

        settings: state.settings
          ? {
              ...state.settings,
              categoryRow,
            }
          : state.settings,

        loading: false,
      }));

      return categoryRow;
    } catch (error) {
      set({
        loading: false,

        error:
          error?.message ||
          "Failed to fetch category row",
      });

      return [];
    }
  },

  /* =======================================================
     FETCH CATEGORY BANNERS ONLY
  ======================================================= */

  fetchCategoryBanners: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await fetch(
        `${API_BASE}/category-banners`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await parseResponse(response);

      const categoryBanners =
        normalizeCategoryBanners(
          data?.categoryBanners || []
        );

      set((state) => ({
        categoryBanners,

        settings: state.settings
          ? {
              ...state.settings,
              categoryBanners,
            }
          : state.settings,

        loading: false,
      }));

      return categoryBanners;
    } catch (error) {
      set({
        loading: false,

        error:
          error?.message ||
          "Failed to fetch category banners",
      });

      return [];
    }
  },

  /* =======================================================
     UPDATE FULL HOMEPAGE SETTINGS
  ======================================================= */

  updateHomepageSettings: async (payload = {}) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const finalPayload = {};

      if (hasValue(payload.desktopHeroBanners)) {
        finalPayload.desktopHeroBanners =
          normalizeHeroBanners(
            payload.desktopHeroBanners
          );
      }

      if (hasValue(payload.mobileHeroBanners)) {
        finalPayload.mobileHeroBanners =
          normalizeHeroBanners(
            payload.mobileHeroBanners
          );
      }

      if (hasValue(payload.categoryRow)) {
        finalPayload.categoryRow =
          normalizeCategoryRow(payload.categoryRow);
      }

      if (hasValue(payload.categoryBanners)) {
        finalPayload.categoryBanners =
          normalizeCategoryBanners(
            payload.categoryBanners
          );
      }

      const response = await fetch(API_BASE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });

      const data = await parseResponse(response);
      const normalized = normalizeSettings(data);

      set({
        settings: normalized,

        desktopHeroBanners:
          normalized.desktopHeroBanners,

        mobileHeroBanners:
          normalized.mobileHeroBanners,

        categoryRow:
          normalized.categoryRow,

        categoryBanners:
          normalized.categoryBanners,

        saving: false,
        success: "Homepage updated ✅",
      });

      return normalized;
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update homepage settings",
      });

      return null;
    }
  },

  /* =======================================================
     UPDATE DESKTOP + MOBILE HERO BANNERS
  ======================================================= */

  updateHeroBanners: async ({
    desktopHeroBanners,
    mobileHeroBanners,
  } = {}) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const payload = {};

      if (hasValue(desktopHeroBanners)) {
        payload.desktopHeroBanners =
          normalizeHeroBanners(
            desktopHeroBanners
          );
      }

      if (hasValue(mobileHeroBanners)) {
        payload.mobileHeroBanners =
          normalizeHeroBanners(
            mobileHeroBanners
          );
      }

      if (
        !hasValue(desktopHeroBanners) &&
        !hasValue(mobileHeroBanners)
      ) {
        throw new Error(
          "Desktop or mobile hero banners are required"
        );
      }

      const response = await fetch(
        `${API_BASE}/hero-banners`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseResponse(response);

      const normalizedDesktop =
        normalizeHeroBanners(
          data?.desktopHeroBanners ||
            payload.desktopHeroBanners ||
            get().desktopHeroBanners
        );

      const normalizedMobile =
        normalizeHeroBanners(
          data?.mobileHeroBanners ||
            payload.mobileHeroBanners ||
            get().mobileHeroBanners
        );

      set((state) => ({
        desktopHeroBanners:
          normalizedDesktop,

        mobileHeroBanners:
          normalizedMobile,

        settings: state.settings
          ? {
              ...state.settings,
              desktopHeroBanners:
                normalizedDesktop,
              mobileHeroBanners:
                normalizedMobile,
            }
          : state.settings,

        saving: false,
        success: "Hero banners updated ✅",
      }));

      return {
        ...data,
        desktopHeroBanners: normalizedDesktop,
        mobileHeroBanners: normalizedMobile,
      };
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update hero banners",
      });

      return null;
    }
  },

  /* =======================================================
     UPDATE DESKTOP HERO BANNERS ONLY
  ======================================================= */

  updateDesktopHeroBanners: async (
    desktopHeroBanners = []
  ) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const normalized = normalizeHeroBanners(
        desktopHeroBanners
      );

      const response = await fetch(
        `${API_BASE}/hero-banners/desktop`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            desktopHeroBanners: normalized,
          }),
        }
      );

      const data = await parseResponse(response);

      const updatedDesktop =
        normalizeHeroBanners(
          data?.desktopHeroBanners || normalized
        );

      set((state) => ({
        desktopHeroBanners:
          updatedDesktop,

        settings: state.settings
          ? {
              ...state.settings,
              desktopHeroBanners:
                updatedDesktop,
            }
          : state.settings,

        saving: false,
        success: "Desktop banners updated ✅",
      }));

      return updatedDesktop;
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update desktop banners",
      });

      return null;
    }
  },

  /* =======================================================
     UPDATE MOBILE HERO BANNERS ONLY
  ======================================================= */

  updateMobileHeroBanners: async (
    mobileHeroBanners = []
  ) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const normalized = normalizeHeroBanners(
        mobileHeroBanners
      );

      const response = await fetch(
        `${API_BASE}/hero-banners/mobile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileHeroBanners: normalized,
          }),
        }
      );

      const data = await parseResponse(response);

      const updatedMobile =
        normalizeHeroBanners(
          data?.mobileHeroBanners || normalized
        );

      set((state) => ({
        mobileHeroBanners:
          updatedMobile,

        settings: state.settings
          ? {
              ...state.settings,
              mobileHeroBanners:
                updatedMobile,
            }
          : state.settings,

        saving: false,
        success: "Mobile banners updated ✅",
      }));

      return updatedMobile;
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update mobile banners",
      });

      return null;
    }
  },

  /* =======================================================
     UPDATE CATEGORY ROW ONLY
  ======================================================= */

  updateCategoryRow: async (categoryRow = []) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const normalized =
        normalizeCategoryRow(categoryRow);

      const response = await fetch(
        `${API_BASE}/category-row`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryRow: normalized,
          }),
        }
      );

      const data = await parseResponse(response);

      const updatedCategoryRow =
        normalizeCategoryRow(
          data?.categoryRow || normalized
        );

      set((state) => ({
        categoryRow:
          updatedCategoryRow,

        settings: state.settings
          ? {
              ...state.settings,
              categoryRow:
                updatedCategoryRow,
            }
          : state.settings,

        saving: false,
        success: "Category row updated ✅",
      }));

      return updatedCategoryRow;
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update category row",
      });

      return null;
    }
  },

  /* =======================================================
     UPDATE CATEGORY BANNERS ONLY
  ======================================================= */

  updateCategoryBanners: async (
    categoryBanners = []
  ) => {
    try {
      set({
        saving: true,
        error: null,
        success: null,
      });

      const normalized =
        normalizeCategoryBanners(
          categoryBanners
        );

      const response = await fetch(
        `${API_BASE}/category-banners`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryBanners: normalized,
          }),
        }
      );

      const data = await parseResponse(response);

      const updatedCategoryBanners =
        normalizeCategoryBanners(
          data?.categoryBanners || normalized
        );

      set((state) => ({
        categoryBanners:
          updatedCategoryBanners,

        settings: state.settings
          ? {
              ...state.settings,
              categoryBanners:
                updatedCategoryBanners,
            }
          : state.settings,

        saving: false,
        success: "Category banners updated ✅",
      }));

      return updatedCategoryBanners;
    } catch (error) {
      set({
        saving: false,

        error:
          error?.message ||
          "Failed to update category banners",
      });

      return null;
    }
  },

  /* =======================================================
     LOCAL SETTERS
  ======================================================= */

  setDesktopHeroBannersLocal: (
    desktopHeroBanners = []
  ) =>
    set({
      desktopHeroBanners:
        normalizeHeroBanners(
          desktopHeroBanners
        ),
    }),

  setMobileHeroBannersLocal: (
    mobileHeroBanners = []
  ) =>
    set({
      mobileHeroBanners:
        normalizeHeroBanners(
          mobileHeroBanners
        ),
    }),

  setHeroBannersLocal: ({
    desktopHeroBanners,
    mobileHeroBanners,
  } = {}) =>
    set((state) => ({
      desktopHeroBanners:
        hasValue(desktopHeroBanners)
          ? normalizeHeroBanners(
              desktopHeroBanners
            )
          : state.desktopHeroBanners,

      mobileHeroBanners:
        hasValue(mobileHeroBanners)
          ? normalizeHeroBanners(
              mobileHeroBanners
            )
          : state.mobileHeroBanners,
    })),

  setCategoryRowLocal: (categoryRow = []) =>
    set({
      categoryRow:
        normalizeCategoryRow(categoryRow),
    }),

  setCategoryBannersLocal: (
    categoryBanners = []
  ) =>
    set({
      categoryBanners:
        normalizeCategoryBanners(
          categoryBanners
        ),
    }),
}));