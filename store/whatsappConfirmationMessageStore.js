import { create } from "zustand";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const BASE_URL = `${API}/api/whatsapp-confirmation-message`;

const cleanError = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

const useWhatsappConfirmationMessageStore = create((set, get) => ({
  loading: false,
  sending: false,
  updating: false,
  deleting: false,
  error: null,

  messages: [],
  selectedMessage: null,
  orderMessages: [],

  filters: {
    status: "",
    phone: "",
    templateName: "",
    direction: "",
    orderId: "",
    customerId: "",
    fromDate: "",
    toDate: "",
  },

  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  },

  clearError: () => set({ error: null }),
  clearSelectedMessage: () => set({ selectedMessage: null }),
  clearOrderMessages: () => set({ orderMessages: [] }),

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
        status: "",
        phone: "",
        templateName: "",
        direction: "",
        orderId: "",
        customerId: "",
        fromDate: "",
        toDate: "",
      },
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
      },
    }),

  fetchMessages: async (page = get().pagination.page, limit = get().pagination.limit) => {
    set({ loading: true, error: null });

    try {
      const { filters } = get();

      const params = {
        page,
        limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== "" && value !== null)
        ),
      };

      const res = await axios.get(BASE_URL, { params });

      set({
        messages: res.data?.data || [],
        pagination: res.data?.pagination || {
          total: 0,
          page,
          limit,
          pages: 1,
        },
        loading: false,
      });

      return res.data;
    } catch (err) {
      set({ loading: false, error: cleanError(err) });
      throw err;
    }
  },

  fetchMessageById: async (id) => {
    if (!id) return null;

    set({ loading: true, error: null });

    try {
      const res = await axios.get(`${BASE_URL}/${id}`);

      set({
        selectedMessage: res.data?.data || null,
        loading: false,
      });

      return res.data?.data;
    } catch (err) {
      set({ loading: false, error: cleanError(err) });
      throw err;
    }
  },

  fetchMessagesByOrder: async (orderId) => {
    if (!orderId) return [];

    set({ loading: true, error: null });

    try {
      const res = await axios.get(`${BASE_URL}/order/${orderId}`);

      set({
        orderMessages: res.data?.data || [],
        loading: false,
      });

      return res.data?.data || [];
    } catch (err) {
      set({ loading: false, error: cleanError(err) });
      throw err;
    }
  },

  sendMessage: async (payload = {}) => {
    set({ sending: true, error: null });

    try {
      const res = await axios.post(`${BASE_URL}/send`, payload);

      await get().fetchMessages(1);

      set({ sending: false });
      return res.data;
    } catch (err) {
      set({ sending: false, error: cleanError(err) });
      throw err;
    }
  },

  updateMessageStatus: async (id, payload = {}) => {
    if (!id) return null;

    set({ updating: true, error: null });

    try {
      const res = await axios.patch(`${BASE_URL}/${id}/status`, payload);

      const updated = res.data?.data;

      set((state) => ({
        messages: state.messages.map((item) =>
          item._id === id ? updated : item
        ),
        selectedMessage:
          state.selectedMessage?._id === id ? updated : state.selectedMessage,
        orderMessages: state.orderMessages.map((item) =>
          item._id === id ? updated : item
        ),
        updating: false,
      }));

      return updated;
    } catch (err) {
      set({ updating: false, error: cleanError(err) });
      throw err;
    }
  },

  deleteMessage: async (id) => {
    if (!id) return false;

    set({ deleting: true, error: null });

    try {
      await axios.delete(`${BASE_URL}/${id}`);

      set((state) => ({
        messages: state.messages.filter((item) => item._id !== id),
        orderMessages: state.orderMessages.filter((item) => item._id !== id),
        selectedMessage:
          state.selectedMessage?._id === id ? null : state.selectedMessage,
        deleting: false,
      }));

      return true;
    } catch (err) {
      set({ deleting: false, error: cleanError(err) });
      throw err;
    }
  },
}));

export default useWhatsappConfirmationMessageStore;