// ============================================================
// FILE:
// oatclub-admin/components/orders/OrderInfluencerCard.jsx
// ============================================================

"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, Megaphone } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

export default function OrderInfluencerCard({
    order,
    onRefresh,
}) {
    const markOrderAsInfluencer = useOrderStore(
        (state) => state.markOrderAsInfluencer,
    );

    const [updating, setUpdating] = useState(false);

    const isInfluencerOrder = order?.isInfluencerOrder === true;

    const handleToggle = async () => {
        if (!order?._id || updating) return;

        const nextValue = !isInfluencerOrder;

        setUpdating(true);

        try {
            await markOrderAsInfluencer(order._id, nextValue);

            toast.success(
                nextValue
                    ? "Marked as influencer order"
                    : "Removed from influencer orders",
            );

            await onRefresh?.();
        } catch (error) {
            toast.error(
                error?.message || "Failed to update influencer order",
            );
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${isInfluencerOrder
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                    >
                        <Megaphone size={19} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-semibold text-gray-900">
                                Influencer Order
                            </h2>

                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${isInfluencerOrder
                                        ? "bg-black text-white"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                            >
                                {isInfluencerOrder ? "ACTIVE" : "OFF"}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                            Exclude this order from normal reconciliation & reports.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={updating}
                    onClick={handleToggle}
                    className="disabled:opacity-50"
                >
                    <div
                        className={`relative h-7 w-14 rounded-full transition-all duration-300 ${isInfluencerOrder ? "bg-black" : "bg-gray-300"
                            }`}
                    >
                        <div
                            className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ${isInfluencerOrder ? "left-8" : "left-1"
                                }`}
                        >
                            {updating ? (
                                <Loader2
                                    size={11}
                                    className="animate-spin text-gray-600"
                                />
                            ) : isInfluencerOrder ? (
                                <BadgeCheck size={11} className="text-black" />
                            ) : null}
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
}