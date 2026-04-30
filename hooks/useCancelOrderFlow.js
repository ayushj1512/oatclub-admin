"use client";

import { useState } from "react";
import { useOrderStore } from "@/store/orderStore";

export function useCancelOrderFlow() {
  const { cancelOrder, loading } = useOrderStore();
  const [targetOrder, setTargetOrder] = useState(null);

  const openCancelModal = (order) => {
    if (!order?._id) return;
    setTargetOrder(order);
  };

  const closeCancelModal = () => setTargetOrder(null);

  const confirmCancel = async (reason = "") => {
    if (!targetOrder?._id) return;

    await cancelOrder(targetOrder._id, reason);
    setTargetOrder(null);
  };

  return {
    cancelModalOpen: !!targetOrder,
    cancelTargetOrder: targetOrder,
    cancelLoading: loading,
    openCancelModal,
    closeCancelModal,
    confirmCancel,
  };
}