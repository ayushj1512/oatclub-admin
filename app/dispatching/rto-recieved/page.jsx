"use client";

import { useEffect } from "react";

import RtoReceivedPage from "@/components/orders/rto-received-page";
import { useOrderStore } from "@/store/orderStore";
export default function Page() {
  const orders = useOrderStore((state) => state.orders);
  const loading = useOrderStore((state) => state.loading);
  const fetchAllOrders = useOrderStore(
    (state) => state.fetchAllOrders,
  );

  useEffect(() => {
    fetchAllOrders({
      fulfillmentStatus: "rto",
      limit: 200,
    }).catch((error) => {
      console.error("Failed to fetch dispatching RTO orders:", error);
    });
  }, [fetchAllOrders]);

  if (loading && !orders.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          <p className="mt-3 text-sm text-zinc-500">
            Loading RTO orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RtoReceivedPage
      orders={orders}
      title="Dispatching RTO Received"
    />
  );
}
