// oatclub-admin/store/whatsappConfirmationMessageStore.js

import axios from "axios";
import { create } from "zustand";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

const BASE_URL = `${API_URL}/api/whatsapp-confirmation-message`;
const FAST2SMS_URL = `${API_URL}/api/fast2sms`;

const DEFAULT_FILTERS = {
  status: "",
  phone: "",
  templateName: "",
  direction: "",
  orderId: "",
  customerId: "",
  fromDate: "",
  toDate: "",
};

const DEFAULT_PAGINATION = {
  total: 0,
  page: 1,
  limit: 100,
  pages: 1,
};

const getErrorMessage = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const fast2smsApi = axios.create({
  baseURL: FAST2SMS_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const useWhatsappConfirmationMessageStore = create((set, get) => ({
  // General states
  loading: false,
  sending: false,
  updating: false,
  deleting: false,
  analyticsLoading: false,
  templatesLoading: false,

  error: null,
  successMessage: null,
  lastResponse: null,

  // Message data
  messages: [],
  selectedMessage: null,
  orderMessages: [],

  // Fast2SMS templates
  templates: [],
  selectedTemplate: null,

  // Analytics
  analytics: {
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    deliveryRate: 0,
    readRate: 0,
    daily: [],
    templates: [],
  },

  filters: {
    ...DEFAULT_FILTERS,
  },

  pagination: {
    ...DEFAULT_PAGINATION,
  },

  // -------------------------------------------------------------------
  // Common actions
  // -------------------------------------------------------------------

  clearError: () =>
    set({
      error: null,
    }),

  clearFeedback: () =>
    set({
      error: null,
      successMessage: null,
    }),

  clearSelectedMessage: () =>
    set({
      selectedMessage: null,
    }),

  clearSelectedTemplate: () =>
    set({
      selectedTemplate: null,
    }),

  clearOrderMessages: () =>
    set({
      orderMessages: [],
    }),

  clearLastResponse: () =>
    set({
      lastResponse: null,
    }),

  setSelectedTemplate: (template) =>
    set({
      selectedTemplate: template || null,
    }),

  resetStore: () =>
    set({
      loading: false,
      sending: false,
      updating: false,
      deleting: false,
      analyticsLoading: false,
      templatesLoading: false,

      error: null,
      successMessage: null,
      lastResponse: null,

      messages: [],
      selectedMessage: null,
      orderMessages: [],

      templates: [],
      selectedTemplate: null,

      analytics: {
        total: 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        deliveryRate: 0,
        readRate: 0,
        daily: [],
        templates: [],
      },

      filters: {
        ...DEFAULT_FILTERS,
      },

      pagination: {
        ...DEFAULT_PAGINATION,
      },
    }),

  // -------------------------------------------------------------------
  // Filters and pagination
  // -------------------------------------------------------------------

  setFilters: (payload = {}) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...payload,
      },
      pagination: {
        ...state.pagination,
        page: 1,
      },
    })),

  resetFilters: () =>
    set({
      filters: {
        ...DEFAULT_FILTERS,
      },
      pagination: {
        ...DEFAULT_PAGINATION,
      },
    }),

  setPage: (page) =>
    set((state) => ({
      pagination: {
        ...state.pagination,
        page: Number(page) || 1,
      },
    })),

  setLimit: (limit) =>
    set((state) => ({
      pagination: {
        ...state.pagination,
        page: 1,
        limit: Number(limit) || 100,
      },
    })),

  // -------------------------------------------------------------------
  // Message listing
  // GET /api/whatsapp-confirmation-message
  // -------------------------------------------------------------------

  fetchMessages: async (
    page = get().pagination.page,
    limit = get().pagination.limit
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { filters } = get();

      const params = {
        page,
        limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([, value]) =>
              value !== "" &&
              value !== null &&
              value !== undefined
          )
        ),
      };

      const response = await api.get("/", {
        params,
      });

      const messages = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      set({
        messages,
        pagination: {
          ...DEFAULT_PAGINATION,
          ...response.data?.pagination,
          page,
          limit,
        },
        loading: false,
      });

      return {
        success: true,
        data: messages,
        pagination: response.data?.pagination,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        loading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Single message
  // GET /api/whatsapp-confirmation-message/:id
  // -------------------------------------------------------------------

  fetchMessageById: async (id) => {
    if (!id) {
      const error = "Message ID is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    set({
      loading: true,
      error: null,
      selectedMessage: null,
    });

    try {
      const response = await api.get(`/${id}`);

      const message = response.data?.data || null;

      set({
        selectedMessage: message,
        loading: false,
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        loading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Messages by order
  // GET /api/whatsapp-confirmation-message/order/:orderId
  // -------------------------------------------------------------------

  fetchMessagesByOrder: async (orderId) => {
    if (!orderId) {
      const error = "Order ID is required";

      set({ error });

      return {
        success: false,
        error,
        data: [],
      };
    }

    set({
      loading: true,
      error: null,
      orderMessages: [],
    });

    try {
      const response = await api.get(`/order/${orderId}`);

      const messages = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      set({
        orderMessages: messages,
        loading: false,
      });

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        loading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
        data: [],
      };
    }
  },

  // -------------------------------------------------------------------
  // Send message
  // POST /api/whatsapp-confirmation-message/send
  // -------------------------------------------------------------------

  sendMessage: async (payload = {}) => {
    if (!payload || typeof payload !== "object") {
      const error = "Message payload is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    set({
      sending: true,
      error: null,
      successMessage: null,
      lastResponse: null,
    });

    try {
      const response = await api.post("/send", payload);

      set({
        sending: false,
        successMessage:
          response.data?.message ||
          "WhatsApp message sent successfully",
        lastResponse: response.data,
      });

      await get().fetchMessages(1);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        sending: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Automatic COD / prepaid order confirmation
  // -------------------------------------------------------------------

  sendOrderConfirmation: async (order) => {
    if (!order) {
      const error = "Order data is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    return get().sendMessage({
      type: "ORDER_CONFIRMATION",
      order,
    });
  },

  // -------------------------------------------------------------------
  // Force COD confirmation
  // -------------------------------------------------------------------

  sendCodConfirmation: async (order) => {
    if (!order) {
      const error = "Order data is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    return get().sendMessage({
      type: "COD_ORDER_CONFIRMATION",
      order,
    });
  },

  // -------------------------------------------------------------------
  // Force prepaid confirmation
  // -------------------------------------------------------------------

  sendPrepaidConfirmation: async (order) => {
    if (!order) {
      const error = "Order data is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    return get().sendMessage({
      type: "PREPAID_ORDER_CONFIRMATION",
      order,
    });
  },

  // -------------------------------------------------------------------
  // Manual payment confirmation
  // -------------------------------------------------------------------

  sendPaymentCompleted: async ({
    phone,
    amount,
    orderNumber,
    orderId,
    customerId,
  } = {}) => {
    if (!phone) {
      const error = "Phone number is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      const error = "Payment amount is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    return get().sendMessage({
      type: "PAYMENT_COMPLETED",
      phone,
      amount,
      orderNumber,
      orderId,
      customerId,
    });
  },

  // -------------------------------------------------------------------
  // Manual OTP
  // -------------------------------------------------------------------

  sendOtp: async ({ phone, otp } = {}) => {
    if (!phone) {
      const error = "Phone number is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    if (!otp) {
      const error = "OTP is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    return get().sendMessage({
      type: "OTP",
      phone,
      otp,
    });
  },

  // -------------------------------------------------------------------
  // Update message status
  // PATCH /api/whatsapp-confirmation-message/:id/status
  // -------------------------------------------------------------------

  updateMessageStatus: async (id, payload = {}) => {
    if (!id) {
      const error = "Message ID is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    set({
      updating: true,
      error: null,
      successMessage: null,
    });

    try {
      const response = await api.patch(
        `/${id}/status`,
        payload
      );

      const updatedMessage = response.data?.data || null;

      set((state) => ({
        messages: state.messages.map((item) =>
          item?._id === id ? updatedMessage : item
        ),

        selectedMessage:
          state.selectedMessage?._id === id
            ? updatedMessage
            : state.selectedMessage,

        orderMessages: state.orderMessages.map((item) =>
          item?._id === id ? updatedMessage : item
        ),

        updating: false,
        successMessage:
          response.data?.message ||
          "Message status updated successfully",
      }));

      return {
        success: true,
        data: updatedMessage,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        updating: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Delete message
  // DELETE /api/whatsapp-confirmation-message/:id
  // -------------------------------------------------------------------

  deleteMessage: async (id) => {
    if (!id) {
      const error = "Message ID is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    set({
      deleting: true,
      error: null,
      successMessage: null,
    });

    try {
      const response = await api.delete(`/${id}`);

      set((state) => ({
        messages: state.messages.filter(
          (item) => item?._id !== id
        ),

        orderMessages: state.orderMessages.filter(
          (item) => item?._id !== id
        ),

        selectedMessage:
          state.selectedMessage?._id === id
            ? null
            : state.selectedMessage,

        deleting: false,

        successMessage:
          response.data?.message ||
          "Message deleted successfully",
      }));

      return {
        success: true,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        deleting: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Analytics
  // GET /api/whatsapp-confirmation-message/analytics
  // -------------------------------------------------------------------

  fetchAnalytics: async (params = {}) => {
    set({
      analyticsLoading: true,
      error: null,
    });

    try {
      const response = await api.get("/analytics", {
        params,
      });

      const analytics = response.data?.data || {};

      set({
        analytics: {
          total: 0,
          pending: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          deliveryRate: 0,
          readRate: 0,
          daily: [],
          templates: [],
          ...analytics,
        },
        analyticsLoading: false,
      });

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        analyticsLoading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Fast2SMS templates
  // GET /api/fast2sms/templates
  // -------------------------------------------------------------------

  fetchTemplates: async () => {
    set({
      templatesLoading: true,
      error: null,
    });

    try {
      const response = await fast2smsApi.get("/templates");

      const templates = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      set({
        templates,
        templatesLoading: false,
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        templatesLoading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // -------------------------------------------------------------------
  // Single Fast2SMS template
  // GET /api/fast2sms/templates/:templateKey
  // -------------------------------------------------------------------

  fetchTemplateByKey: async (templateKey) => {
    if (!templateKey) {
      const error = "Template key is required";

      set({ error });

      return {
        success: false,
        error,
      };
    }

    set({
      templatesLoading: true,
      error: null,
      selectedTemplate: null,
    });

    try {
      const response = await fast2smsApi.get(
        `/templates/${encodeURIComponent(templateKey)}`
      );

      const template = response.data?.data || null;

      set({
        selectedTemplate: template,
        templatesLoading: false,
      });

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      set({
        templatesLoading: false,
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },
}));

export default useWhatsappConfirmationMessageStore;
