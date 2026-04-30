"use client";

import { useState } from "react";
import CancelOrderModal from "@/components/orders/CancelOrderModal";

export default function TestPage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // dummy order for UI testing
  const order = {
    _id: "test123",
    orderNumber: "MIRAY-004312",
    fulfillmentStatus: "processing",
  };

  const handleConfirm = async (reason) => {
    console.log("Cancel triggered with reason:", reason);

    setLoading(true);

    // simulate API
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 1200);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Cancel Modal Test</h1>

      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-5 py-2 text-white"
      >
        Open Cancel Modal
      </button>

      <CancelOrderModal
        open={open}
        order={order}
        loading={loading}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}