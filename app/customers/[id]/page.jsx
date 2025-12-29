"use client";

/* ============================================================
   IMPORTS
============================================================ */
import { useMemo } from "react";
import { useParams } from "next/navigation";

import CustomerSection from "@/components/customer/CustomerSection";
import AbandonedCartsSection from "@/components/customer/AbandonedCartsSection";
import WishlistSection from "@/components/customer/WishlistSection";
import AddressSection from "@/components/customer/AddressSection";
import OrderSection from "@/components/customer/OrderSection";
import SupportTicketSection from "@/components/customer/SupportTicketSection";

import { useCustomerStore } from "@/store/customerStore";

/* ============================================================
   SMALL HELPERS
============================================================ */
const safe = (v) => String(v ?? "").trim();

/* ============================================================
   CUSTOMER DETAIL PAGE
============================================================ */
export default function CustomerDetailPage() {
  /* ----------------------------------------------------------
     ROUTE PARAM
  ---------------------------------------------------------- */
  const { id } = useParams(); // customerId from URL

  /* ----------------------------------------------------------
     GLOBAL CUSTOMER (ZUSTAND)
  ---------------------------------------------------------- */
  const { customer } = useCustomerStore();

  /* ----------------------------------------------------------
     DERIVED KEYS (SAFE)
  ---------------------------------------------------------- */
  const customerEmail = useMemo(
    () => safe(customer?.email).toLowerCase(),
    [customer]
  );

  const customerUID = useMemo(
    () => safe(customer?.firebaseUID),
    [customer]
  );

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <div className="p-8 space-y-10">
      {/* ======================================================
         CUSTOMER HEADER (PROFILE / BASIC INFO)
      ====================================================== */}
      <CustomerSection customerId={id} />

      {/* ======================================================
         ABANDONED CARTS
         - Uses firebaseUID + email internally
      ====================================================== */}
      <AbandonedCartsSection
        customerId={customer?._id}
        customerEmail={customer?.email}
        customerUID={customer?.firebaseUID}
      />

      {/* ======================================================
         WISHLIST
      ====================================================== */}
      <WishlistSection
        firebaseUID={customer?.firebaseUID}
        customerId={customer?._id}
      />

      {/* ======================================================
         ADDRESSES
      ====================================================== */}
      <AddressSection
        firebaseUID={customer?.firebaseUID}
        customerId={customer?._id}
      />

      {/* ======================================================
         ORDERS
         - Shows last 3
         - Expandable + search inside component
      ====================================================== */}
      <OrderSection customerId={customer?._id} />

      {/* ======================================================
         SUPPORT TICKETS
         - Loaded by customer email
      ====================================================== */}
      <SupportTicketSection customerEmail={customerEmail} />
    </div>
  );
}
