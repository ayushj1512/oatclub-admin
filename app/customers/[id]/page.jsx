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
  const params = useParams();

  // ✅ safe route id (string | string[])
  const routeId = useMemo(() => {
    const raw = params?.id;
    return safe(Array.isArray(raw) ? raw[0] : raw);
  }, [params]);

  const { customer } = useCustomerStore();

  const customerEmail = useMemo(
    () => safe(customer?.email).toLowerCase(),
    [customer?.email]
  );

  const customerUID = useMemo(
    () => safe(customer?.firebaseUID),
    [customer?.firebaseUID]
  );

  // ✅ IMPORTANT: use mongo _id if present, else fallback to routeId
  const customerMongoId = useMemo(
    () => safe(customer?._id) || routeId,
    [customer?._id, routeId]
  );

  return (
    <div className="p-8 space-y-10">
      <CustomerSection customerId={routeId} />

      <AbandonedCartsSection
        customerId={customerMongoId}
        customerEmail={customerEmail}
        customerUID={customerUID}
      />

      <WishlistSection firebaseUID={customerUID} customerId={customerMongoId} />

      {/* ✅ key forces remount when id/uid changes */}
      <AddressSection
        key={`${customerMongoId}-${customerUID}`}
        firebaseUID={customerUID}
        customerId={customerMongoId}
      />

      <OrderSection customerId={customerMongoId} />

      <SupportTicketSection customerEmail={customerEmail} />
    </div>
  );
}
