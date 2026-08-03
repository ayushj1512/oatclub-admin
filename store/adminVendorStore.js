// oatclub-admin/store/adminVendorStore.js

import axios from "axios";
import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

const DEFAULT_MODULES = {
  sampling: true,
  pattern: true,
  production: true,
  cuttingList: true,
};

const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeList = (values = []) => [
  ...new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ),
];

const normalizeProductIds = (values = []) => [
  ...new Set(
    (Array.isArray(values) ? values : [values])
      .map((item) =>
        String(
          item?.product?._id || item?.product || item?._id || item || "",
        ).trim(),
      )
      .filter(Boolean),
  ),
];

const normalizeProductCode = (value = "") => {
  const code = String(value).trim().toUpperCase().replace(/\s+/g, "");

  return /^\d+$/.test(code) ? code.padStart(5, "0") : code;
};

const normalizeProductCodes = (values = []) => {
  const list = Array.isArray(values) ? values : String(values || "").split(",");

  return [...new Set(list.map(normalizeProductCode).filter(Boolean))];
};

const getAssignmentProductId = (assignment) =>
  String(assignment?.product?._id || assignment?.product || "");

const buildPagination = (
  data = {},
  fallbackPage = 1,
  fallbackLimit = 20,
  fallbackTotal = 0,
) => {
  const page = Number(data.page || fallbackPage);
  const limit = Number(data.limit || fallbackLimit);
  const total = Number(data.total ?? data.count ?? fallbackTotal);
  const pages = Number(data.pages || Math.max(Math.ceil(total / limit), 1));

  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: data.hasNextPage ?? page < pages,
    hasPrevPage: data.hasPrevPage ?? page > 1,
  };
};

const normalizeRole = (role) =>
  role === "superadmin" ? "superadmin" : "vendor";

const isSuperAdminVendor = (vendor) => vendor?.role === "superadmin";

/* =========================================================
   STORE
========================================================= */

const useAdminVendorStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,

  assignedProducts: [],
  productResults: [],

  vendorPagination: { ...initialPagination },
  assignedPagination: { ...initialPagination },
  productPagination: { ...initialPagination },

  loadingVendors: false,
  loadingVendor: false,
  creatingVendor: false,
  updatingVendor: false,
  deletingVendor: false,

  loadingAssignedProducts: false,
  searchingProducts: false,
  assigningProducts: false,
  removingProducts: false,
  updatingProductModules: false,

  error: "",
  message: "",

  /* =======================================================
     LOCAL ACTIONS
  ======================================================= */

  clearMessages: () =>
    set({
      error: "",
      message: "",
    }),

  setSelectedVendor: (vendor) =>
    set({
      selectedVendor: vendor || null,

      assignedProducts: isSuperAdminVendor(vendor)
        ? []
        : vendor?.assignedProducts || [],
    }),

  clearSelectedVendor: () =>
    set({
      selectedVendor: null,
      assignedProducts: [],
      assignedPagination: {
        ...initialPagination,
      },
    }),

  clearProductResults: () =>
    set({
      productResults: [],
      productPagination: {
        ...initialPagination,
      },
    }),

  /* =======================================================
     FETCH VENDORS
     GET /api/vendor-users
  ======================================================= */

  fetchVendors: async ({
    page = 1,
    limit = 20,
    search = "",
    isActive = "",
  } = {}) => {
    set({
      loadingVendors: true,
      error: "",
    });

    try {
      const { data } = await axios.get(`${API_URL}/api/vendor-users`, {
        params: {
          page,
          limit,
          search: search || undefined,
          isActive:
            isActive === "" || isActive === "all" ? undefined : isActive,
        },
      });

      const vendors = data?.vendors || [];

      set({
        vendors,
        vendorPagination: buildPagination(data, page, limit, vendors.length),
      });

      return {
        success: true,
        vendors,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch vendors");

      set({ error: message });

      return {
        success: false,
        message,
      };
    } finally {
      set({ loadingVendors: false });
    }
  },

  /* =======================================================
     FETCH SINGLE VENDOR
     GET /api/vendor-users/:id
  ======================================================= */

  fetchVendorById: async (vendorId) => {
    if (!vendorId) {
      return {
        success: false,
        message: "Vendor ID is required",
      };
    }

    set({
      loadingVendor: true,
      error: "",
    });

    try {
      const { data } = await axios.get(
        `${API_URL}/api/vendor-users/${vendorId}`,
      );

      const vendor = data?.vendor || null;

      set({
        selectedVendor: vendor,

        assignedProducts: isSuperAdminVendor(vendor)
          ? []
          : vendor?.assignedProducts || [],
      });

      return {
        success: true,
        vendor,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch vendor");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        loadingVendor: false,
      });
    }
  },

  /* =======================================================
     CREATE VENDOR
     POST /api/vendor-users/create
  ======================================================= */

  createVendor: async ({
    name,
    username,
    password,
    phone = "",
    role = "vendor",
    modules = DEFAULT_MODULES,
  }) => {
    set({
      creatingVendor: true,
      error: "",
      message: "",
    });

    try {
      const normalizedRole = normalizeRole(role);

      const { data } = await axios.post(`${API_URL}/api/vendor-users/create`, {
        name: String(name || "").trim(),

        username: String(username || "")
          .trim()
          .toLowerCase(),

        password,

        phone: String(phone || "").trim(),

        role: normalizedRole,

        modules:
          normalizedRole === "superadmin"
            ? {
              ...DEFAULT_MODULES,
            }
            : {
              ...DEFAULT_MODULES,
              ...modules,
            },
      });

      const vendor = data?.vendor;

      const message =
        data?.message ||
        (normalizedRole === "superadmin"
          ? "Vendor super admin created successfully"
          : "Vendor created successfully");

      if (vendor) {
        set((state) => ({
          vendors: [vendor, ...state.vendors],

          vendorPagination: {
            ...state.vendorPagination,
            total: state.vendorPagination.total + 1,
          },

          message,
        }));
      } else {
        set({
          message,
        });
      }

      return {
        success: true,
        vendor,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create vendor");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        creatingVendor: false,
      });
    }
  },

  /* =======================================================
     UPDATE VENDOR
     PATCH /api/vendor-users/:id
  ======================================================= */

  updateVendor: async (vendorId, updates = {}) => {
    if (!vendorId) {
      return {
        success: false,
        message: "Vendor ID is required",
      };
    }

    set({
      updatingVendor: true,
      error: "",
      message: "",
    });

    try {
      const payload = {};

      if (updates.name !== undefined) {
        payload.name = String(updates.name || "").trim();
      }

      if (updates.username !== undefined) {
        payload.username = String(updates.username || "")
          .trim()
          .toLowerCase();
      }

      if (updates.phone !== undefined) {
        payload.phone = String(updates.phone || "").trim();
      }

      if (updates.password) {
        payload.password = updates.password;
      }

      if (updates.role !== undefined) {
        payload.role = normalizeRole(updates.role);
      }

      const currentVendor =
        get().vendors.find((item) => String(item?._id) === String(vendorId)) ||
        (String(get().selectedVendor?._id) === String(vendorId)
          ? get().selectedVendor
          : null);

      const finalRole = normalizeRole(updates.role ?? currentVendor?.role);

      if (updates.modules !== undefined && finalRole !== "superadmin") {
        payload.modules = updates.modules;
      }

      if (updates.isActive !== undefined) {
        payload.isActive =
          updates.isActive === true || updates.isActive === "true";
      }

      const { data } = await axios.patch(
        `${API_URL}/api/vendor-users/${vendorId}`,
        payload,
      );

      const vendor = data?.vendor;

      const message = data?.message || "Vendor updated successfully";

      set((state) => {
        const isSelected =
          String(state.selectedVendor?._id) === String(vendorId);

        const updatedSelectedVendor = isSelected
          ? {
            ...state.selectedVendor,
            ...(vendor || {}),
          }
          : state.selectedVendor;

        return {
          vendors: state.vendors.map((item) =>
            String(item?._id) === String(vendorId)
              ? {
                ...item,
                ...(vendor || {}),
              }
              : item,
          ),

          selectedVendor: updatedSelectedVendor,

          assignedProducts:
            isSelected && isSuperAdminVendor(updatedSelectedVendor)
              ? []
              : state.assignedProducts,

          message,
        };
      });

      return {
        success: true,
        vendor,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update vendor");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        updatingVendor: false,
      });
    }
  },

  toggleVendorStatus: (vendorId, isActive) =>
    get().updateVendor(vendorId, {
      isActive,
    }),

  /* =======================================================
     DELETE VENDOR
     DELETE /api/vendor-users/:id
  ======================================================= */

  deleteVendor: async (vendorId) => {
    if (!vendorId) {
      return {
        success: false,
        message: "Vendor ID is required",
      };
    }

    set({
      deletingVendor: true,
      error: "",
      message: "",
    });

    try {
      const { data } = await axios.delete(
        `${API_URL}/api/vendor-users/${vendorId}`,
      );

      const message = data?.message || "Vendor deleted successfully";

      set((state) => {
        const isSelected =
          String(state.selectedVendor?._id) === String(vendorId);

        return {
          vendors: state.vendors.filter(
            (vendor) => String(vendor._id) !== String(vendorId),
          ),

          selectedVendor: isSelected ? null : state.selectedVendor,

          assignedProducts: isSelected ? [] : state.assignedProducts,

          vendorPagination: {
            ...state.vendorPagination,
            total: Math.max(0, state.vendorPagination.total - 1),
          },

          message,
        };
      });

      return {
        success: true,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete vendor");

      set({ error: message });

      return {
        success: false,
        message,
      };
    } finally {
      set({ deletingVendor: false });
    }
  },

  /* =======================================================
     SEARCH PRODUCTS
     GET /api/products/card-search
  ======================================================= */

  searchProducts: async ({
    page = 1,
    limit = 20,
    search = "",
    productCode = "",
    category = "",
  } = {}) => {
    set({
      searchingProducts: true,
      error: "",
    });

    try {
      const { data } = await axios.get(`${API_URL}/api/products/card-search`, {
        params: {
          page,
          limit,
          q: search || undefined,
          productCode: productCode || undefined,
          category: category || undefined,
          activeOnly: true,
          excludeDrafts: true,
          sortBy: "latest",
        },
      });

      const products = data?.products || [];
      const pagination = data?.pagination || data || {};

      set({
        productResults: products,
        productPagination: buildPagination(
          pagination,
          page,
          limit,
          products.length,
        ),
      });

      return {
        success: true,
        products,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to search products");

      set({ error: message });

      return {
        success: false,
        message,
      };
    } finally {
      set({ searchingProducts: false });
    }
  },

  /* =======================================================
     FETCH ASSIGNED PRODUCTS
     GET /api/vendor-users/:vendorId/products
  ======================================================= */

  fetchAssignedProducts: async (
    vendorId,
    { page = 1, limit = 20, search = "", module = "", status = "" } = {},
  ) => {
    if (!vendorId) {
      return {
        success: false,
        message: "Vendor ID is required",
      };
    }

    set({
      loadingAssignedProducts: true,
      error: "",
    });

    try {
      const { data } = await axios.get(
        `${API_URL}/api/vendor-users/${vendorId}/products`,
        {
          params: {
            page,
            limit,
            search: search || undefined,
            module: module || undefined,
            status: status || undefined,
          },
        },
      );

      const products = data?.products || data?.assignedProducts || [];

      set((state) => {
        const isSelected =
          String(state.selectedVendor?._id) === String(vendorId);

        return {
          assignedProducts: Array.isArray(products) ? products : [],

          assignedPagination: buildPagination(
            data,
            page,
            limit,
            products.length,
          ),

          selectedVendor: isSelected
            ? {
              ...state.selectedVendor,

              isSuperAdmin:
                data?.isSuperAdmin ??
                isSuperAdminVendor(state.selectedVendor),

              hasAllProductAccess:
                data?.hasAllProductAccess ??
                isSuperAdminVendor(state.selectedVendor),
            }
            : state.selectedVendor,
        };
      });

      return {
        success: true,
        products,
        isSuperAdmin: data?.isSuperAdmin === true,
        hasAllProductAccess: data?.hasAllProductAccess === true,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch assigned products",
      );

      set({
        assignedProducts: [],
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        loadingAssignedProducts: false,
      });
    }
  },

  /* =======================================================
     ASSIGN PRODUCTS
     POST /api/vendor-users/:vendorId/products/assign
  ======================================================= */

  assignProducts: async (vendorId, productIds, modules = []) => {
    const ids = normalizeProductIds(productIds);

    const vendor =
      get().vendors.find((item) => String(item?._id) === String(vendorId)) ||
      (String(get().selectedVendor?._id) === String(vendorId)
        ? get().selectedVendor
        : null);

    if (isSuperAdminVendor(vendor)) {
      return {
        success: false,
        message: "Super admin already has access to all products",
      };
    }

    if (!vendorId || !ids.length) {
      return {
        success: false,
        message: !vendorId
          ? "Vendor ID is required"
          : "Select at least one product",
      };
    }

    set({
      assigningProducts: true,
      error: "",
      message: "",
    });

    try {
      const { data } = await axios.post(
        `${API_URL}/api/vendor-users/${vendorId}/products/assign`,
        {
          productIds: ids,

          modules: Array.isArray(modules) ? normalizeList(modules) : modules,
        },
      );

      const products = data?.products || data?.assignedProducts || [];

      const message = data?.message || "Products assigned successfully";

      set((state) => {
        const assignmentMap = new Map(
          state.assignedProducts.map((assignment) => [
            getAssignmentProductId(assignment),
            assignment,
          ]),
        );

        products.forEach((assignment) => {
          const productId = getAssignmentProductId(assignment);

          if (productId) {
            assignmentMap.set(productId, assignment);
          }
        });

        return {
          assignedProducts: [...assignmentMap.values()],

          assignedPagination: {
            ...state.assignedPagination,

            total: data?.total ?? assignmentMap.size,
          },

          message,
        };
      });

      return {
        success: true,
        products,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign products");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        assigningProducts: false,
      });
    }
  },

  /* =======================================================
     ASSIGN PRODUCTS BY CODES
  ======================================================= */

  assignProductsByCodes: async (vendorId, productCodes, modules = []) => {
    const codes = normalizeProductCodes(productCodes);

    const vendor =
      get().vendors.find((item) => String(item?._id) === String(vendorId)) ||
      (String(get().selectedVendor?._id) === String(vendorId)
        ? get().selectedVendor
        : null);

    if (isSuperAdminVendor(vendor)) {
      return {
        success: false,
        message: "Super admin already has access to all products",
      };
    }

    if (!vendorId || !codes.length) {
      return {
        success: false,

        message: !vendorId
          ? "Vendor ID is required"
          : "Enter at least one product code",
      };
    }

    set({
      assigningProducts: true,
      error: "",
      message: "",
    });

    try {
      const { data } = await axios.post(
        `${API_URL}/api/vendor-users/${vendorId}/products/assign`,
        {
          productCodes: codes,

          modules: Array.isArray(modules) ? normalizeList(modules) : modules,
        },
      );

      const message = data?.message || "Products assigned successfully";

      set({
        message,
      });

      await get().fetchAssignedProducts(vendorId, {
        page: 1,

        limit: get().assignedPagination.limit || 20,
      });

      return {
        success: true,

        products: data?.products || data?.assignedProducts || [],

        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign products");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        assigningProducts: false,
      });
    }
  },

  /* =======================================================
     REMOVE ASSIGNED PRODUCTS
     DELETE /api/vendor-users/:vendorId/products
  ======================================================= */

  removeAssignedProducts: async (vendorId, productIds) => {
    const ids = normalizeProductIds(productIds);

    const vendor =
      get().vendors.find((item) => String(item?._id) === String(vendorId)) ||
      (String(get().selectedVendor?._id) === String(vendorId)
        ? get().selectedVendor
        : null);

    if (isSuperAdminVendor(vendor)) {
      return {
        success: false,
        message: "Products cannot be removed from a super admin",
      };
    }

    if (!vendorId || !ids.length) {
      return {
        success: false,

        message: !vendorId
          ? "Vendor ID is required"
          : "Select at least one product",
      };
    }

    set({
      removingProducts: true,
      error: "",
      message: "",
    });

    try {
      const { data } = await axios.delete(
        `${API_URL}/api/vendor-users/${vendorId}/products`,
        {
          data: {
            productIds: ids,
          },
        },
      );

      const removedIds = new Set(ids);

      const message = data?.message || "Products removed successfully";

      set((state) => ({
        assignedProducts: state.assignedProducts.filter(
          (assignment) => !removedIds.has(getAssignmentProductId(assignment)),
        ),

        assignedPagination: {
          ...state.assignedPagination,

          total:
            data?.total ??
            Math.max(0, state.assignedPagination.total - ids.length),
        },

        message,
      }));

      return {
        success: true,
        deletedCount: data?.deletedCount,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove products");

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        removingProducts: false,
      });
    }
  },

  /* =======================================================
     UPDATE ASSIGNED PRODUCT MODULES
     PATCH /api/vendor-users/:vendorId/products/:productId
  ======================================================= */

  updateAssignedProductModules: async (vendorId, productId, modules) => {
    if (!vendorId || !productId) {
      return {
        success: false,
        message: "Vendor and product IDs are required",
      };
    }

    const vendor =
      get().vendors.find((item) => String(item?._id) === String(vendorId)) ||
      (String(get().selectedVendor?._id) === String(vendorId)
        ? get().selectedVendor
        : null);

    if (isSuperAdminVendor(vendor)) {
      return {
        success: false,
        message: "Super admin already has all product permissions",
      };
    }

    set({
      updatingProductModules: true,
      error: "",
      message: "",
    });

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/vendor-users/${vendorId}/products/${productId}`,
        {
          modules,
        },
      );

      const assignment = data?.assignment || data?.product;

      const message =
        data?.message || "Product permissions updated successfully";

      set((state) => ({
        assignedProducts: state.assignedProducts.map((item) =>
          getAssignmentProductId(item) === String(productId)
            ? assignment || {
              ...item,
              modules,
            }
            : item,
        ),

        message,
      }));

      return {
        success: true,
        assignment,
        message,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to update product permissions",
      );

      set({
        error: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      set({
        updatingProductModules: false,
      });
    }
  },

  isSelectedVendorSuperAdmin: () => isSuperAdminVendor(get().selectedVendor),

  canManageSelectedVendorProducts: () =>
    !isSuperAdminVendor(get().selectedVendor),
}));

export default useAdminVendorStore;
