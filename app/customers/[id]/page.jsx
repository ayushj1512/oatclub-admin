// ✅ app/customers/[id]/page.jsx — WHOLE UPDATED FILE (uses the component)
"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

import CustomerSection from "@/components/customer/CustomerSection";
import CustomerCartAddsSection from "@/components/customer/CustomerCartAddsSection";
// import AbandonedCartsSection from "@/components/customer/AbandonedCartsSection";
import WishlistSection from "@/components/customer/WishlistSection";
import AddressSection from "@/components/customer/AddressSection";
import OrderSection from "@/components/customer/OrderSection";
import SupportTicketSection from "@/components/customer/SupportTicketSection";

import { useCustomerStore } from "@/store/customerStore";

const safe = (v) => String(v ?? "").trim();

export default function CustomerDetailPage() {
  const params = useParams();

  const routeId = useMemo(() => {
    const raw = params?.id;
    return safe(Array.isArray(raw) ? raw[0] : raw);
  }, [params]);

  const customer = useCustomerStore((s) => s.customer);
  const fetchCustomerById = useCustomerStore((s) => s.fetchCustomerById);

  useEffect(() => {
    if (!routeId) return;
    fetchCustomerById?.(routeId);
  }, [routeId, fetchCustomerById]);

  const customerEmail = useMemo(() => safe(customer?.email).toLowerCase(), [customer?.email]);
  const customerUID = useMemo(() => safe(customer?.firebaseUID), [customer?.firebaseUID]);
  const customerMongoId = useMemo(() => safe(customer?._id) || routeId, [customer?._id, routeId]);

  return (
    <div className="p-8 space-y-10">
      <CustomerSection customerId={routeId} />
      <CustomerCartAddsSection customerId={customerMongoId} />
      <WishlistSection firebaseUID={customerUID} customerId={customerMongoId} />
      <AddressSection key={`${customerMongoId}-${customerUID}`} firebaseUID={customerUID} customerId={customerMongoId} />
      <OrderSection customerId={customerMongoId} />
      <SupportTicketSection customerEmail={customerEmail} />
    </div>
  );
}
