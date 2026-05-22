import { create } from "zustand";

const API = process.env.NEXT_PUBLIC_API_URL;

export const useOrderReviewStore = create((set) => ({
  loading: false,
  error: "",
  result: null,

  sendReviewWhatsapp: async (
    orderIdOrNumber,
    { force = false } = {}
  ) => {
    try {
      set({
        loading: true,
        error: "",
        result: null,
      });

      const query = force ? "?force=true" : "";

      const res = await fetch(
        `${API}/api/orders/${orderIdOrNumber}/review-whatsapp/send${query}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to send review WhatsApp"
        );
      }

      set({
        loading: false,
        result: data,
      });

      return data;
    } catch (err) {
      const message =
        err?.message || "Failed to send review WhatsApp";

      set({
        loading: false,
        error: message,
        result: null,
      });

      throw err;
    }
  },

  resetReviewWhatsappState: () => {
    set({
      loading: false,
      error: "",
      result: null,
    });
  },
}));