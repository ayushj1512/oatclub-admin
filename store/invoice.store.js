"use client";

import { create } from "zustand";

export const useInvoiceStore = create((set) => ({
  /* ===============================
     STATE
  =============================== */
  isOpen: false,
  type: "invoice", // "invoice" | "packing"
  order: null,
  invoiceData: null,

  /* ===============================
     ACTIONS
  =============================== */
  openInvoice: ({ order, type = "invoice", invoiceData }) =>
    set({
      isOpen: true,
      order,
      type,
      invoiceData,
    }),

  closeInvoice: () =>
    set({
      isOpen: false,
      order: null,
      invoiceData: null,
    }),
}));
