"use client";

import { useEffect } from "react";

import RtoReceivedPage from "@/components/orders/rto-received-page";
import { useOrderStore } from "@/store/orderStore";

export default function Page() {
  const orders = useOrderStore((state) => state.orders);
  const loading = useOrderStore((state) => state.loading);
  const fetchAllOrdersAllPages = useOrderStore(
    (state) => state.fetchAllOrdersAllPages,
  );

  useEffect(() => {
    fetchAllOrdersAllPages({
      limit: 200,
    }).catch((error) => {
      console.error("Failed to fetch orders:", error);
    });
  }, [fetchAllOrdersAllPages]);

  if (loading && !orders.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          <p className="mt-3 text-xs text-zinc-500">
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RtoReceivedPage
      orders={orders}
      title="RTO Received"
    />
  );
}
