"use client";

import OrderActionCenter from "@/components/orders/OrderActionCenter";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Package,
  User,
  BadgeIndianRupee,
  ExternalLink,
} from "lucide-react";
import EditableAddressCard from "@/components/orders/EditableAddressCard";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";
import { useCancelOrderFlow } from "@/hooks/useCancelOrderFlow";
import CancelOrderModal from "@/components/orders/CancelOrderModal";
import OrderPrintPanel from "@/components/orders/OrderPrintPanel";
import OrderRmaMention from "../../../components/orders/OrderRma";
import OrderTrackingCard from "@/components/orders/OrderTrackingCard";
import OrderCreateRmaPanel from "@/components/orders/OrderCreateRmaPanel";
import OrderServiceabilityCard from "@/components/orders/OrderServiceabilityCard";
import OrderFulfillmentTimeline from "@/components/orders/OrderFulfillmentTimeline";
import OrderCancellationDetails from "@/components/orders/OrderCancellationDetails";
import OrderConfirmationDetails from "@/components/orders/OrderConfirmationDetails";
import OrderSourceAttributionCard from "@/components/orders/OrderSourceAttributionCard";
const API = process.env.NEXT_PUBLIC_API_URL;
const STORE_URL = "https://www.mirayfashions.com";

const FULFILLMENT_OPTIONS = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "picked", label: "Picked" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "exchanged", label: "Exchanged" },
  { value: "rto", label: "RTO" },
  { value: "cancelled", label: "Cancelled" },
];

const statusBadgeStyle = (status) => {
  switch (status) {
    case "processing":
      return "bg-yellow-50 text-yellow-700";
    case "packed":
      return "bg-indigo-50 text-indigo-700";
    case "picked":
      return "bg-cyan-50 text-cyan-700";
    case "shipped":
      return "bg-blue-50 text-blue-700";
    case "out_for_delivery":
      return "bg-purple-50 text-purple-700";
    case "delivered":
      return "bg-green-50 text-green-700";
    case "exchanged":
      return "bg-emerald-50 text-emerald-700";
    case "rto":
      return "bg-gray-200 text-gray-800";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur ${className}`}
  >
    {children}
  </div>
);

const PRIORITY_LABELS = {
  normal: "Normal",
  medium: "Medium",
  high: "High",
};

const PRIORITY_BADGE = {
  normal: "border border-gray-200 bg-gray-100 text-gray-700",
  medium: "border border-yellow-200 bg-yellow-50 text-yellow-800",
  high: "border border-red-200 bg-red-50 text-red-700",
};

const getPriorityBadge = (order) => {
  const key = ["normal", "medium", "high"].includes(
    String(order?.priority).toLowerCase()
  )
    ? String(order.priority).toLowerCase()
    : "normal";

  return {
    key,
    label: PRIORITY_LABELS[key],
    cls: PRIORITY_BADGE[key],
  };
};

const pretty = (v) => String(v || "").replace(/_/g, " ").trim();

export default function OrderDetailsClient({ id }) {
  const router = useRouter();

  const {
    order,
    loading,
    error,
    fetchOrderById,
    clearOrder,
    updateOrderStatus,
  } = useOrderStore();

  const {
    cancelModalOpen,
    cancelTargetOrder,
    cancelLoading,
    openCancelModal,
    closeCancelModal,
    confirmCancel,
  } = useCancelOrderFlow();

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("processing");

  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const [remarks, setRemarks] = useState("");
  const [remarksSaving, setRemarksSaving] = useState(false);

  const pri = useMemo(() => getPriorityBadge(order), [order?.priority]);

  const safeCurrentStatus = useMemo(() => {
    const v = String(order?.fulfillmentStatus || "processing").trim();
    const ok = FULFILLMENT_OPTIONS.some((o) => o.value === v);
    return ok ? v : "processing";
  }, [order?.fulfillmentStatus]);

  const orderStatusLabel = useMemo(
    () => pretty(safeCurrentStatus),
    [safeCurrentStatus]
  );

  useEffect(() => {
    if (!id) return;
    fetchOrderById(id);
    return () => clearOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!order) return;

    const v = String(order.fulfillmentStatus || "processing").trim();
    const ok = FULFILLMENT_OPTIONS.some((o) => o.value === v);
    setNewStatus(ok ? v : "processing");

    setTrackingId(order.trackingDetails?.trackingId || "");
    setCourierName(order.trackingDetails?.courierName || "");
    setTrackingUrl(
      order?.shipment?.shiprocket?.trackingUrl ||
        order?.trackingDetails?.trackingUrl ||
        ""
    );
    setRemarks(order.adminRemarks || "");
  }, [order]);

  const handleUpdateStatus = async () => {
    if (!order?._id) return;

    if (newStatus === "cancelled") {
      openCancelModal(order);
      return;
    }

    setStatusUpdating(true);

    try {
      const payload =
        newStatus === "exchanged"
          ? { fulfillmentStatus: "exchanged" }
          : { fulfillmentStatus: newStatus };

      await updateOrderStatus(order._id, payload);
      toast.success("Order status updated ✅");
      await fetchOrderById(order._id);
    } catch (e) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCancelConfirm = async (reason = "") => {
    if (!order?._id) return;

    try {
      await confirmCancel(reason);
      toast.success("Order cancelled ✅");
      await fetchOrderById(order._id);
      setNewStatus("cancelled");
    } catch (e) {
      toast.error(e?.message || "Failed to cancel order");
      setNewStatus(safeCurrentStatus);
    }
  };

  const updateTracking = async () => {
    if (!order?._id) return;

    try {
      const res = await fetch(`${API}/api/orders/${order._id}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingId, courierName, trackingUrl }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.message || "Failed to update tracking");

      toast.success("Tracking updated ✅");
      await fetchOrderById(order._id);
    } catch {
      toast.error("Failed to update tracking");
    }
  };

  const updateRemarks = async () => {
    if (!order?._id) return;

    setRemarksSaving(true);

    try {
      const res = await fetch(`${API}/api/orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRemarks: remarks }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.message || "Failed to update remarks");

      toast.success("Remarks updated ✅");
      await fetchOrderById(order._id);
    } catch {
      toast.error("Failed to update remarks");
    } finally {
      setRemarksSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-gray-600" size={34} />
      </div>
    );
  }

  if (error) return <p className="p-10 text-red-500">{error}</p>;
  if (!order) return <p className="p-10 text-red-500">Order not found</p>;

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <>
      <section className="min-h-screen bg-[#f6f7fb] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto space-y-6">
          <button
            onClick={() => router.push("/orders/all")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={18} /> Back to Orders
          </button>

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pri.cls} ring-1 ring-black/5`}
              >
                Priority: {pri.label}
              </span>

              <p className="mt-0.5 text-sm text-gray-500">
                Manage customer details, tracking & printing.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusBadgeStyle(
                safeCurrentStatus
              )}`}
            >
              {orderStatusLabel}
            </span>
          </div>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <Package size={18} /> Items in this Order
            </h2>

            {items.length === 0 ? (
              <p className="text-sm text-gray-500">No items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Product</th>
                      <th className="px-4 py-3 text-left font-semibold">Variant</th>
                      <th className="px-4 py-3 text-left font-semibold">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold">Price</th>
                      <th className="px-4 py-3 text-left font-semibold">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => {
                      const snap = it?.productSnapshot || {};
                      const v = it?.variant || {};
                      const productUrl = it?.productId?._id
                        ? `${STORE_URL}/category/products/name/${it.productId._id}`
                        : "";

                      const size = it?.selectedSize || "-";
                      const color = it?.selectedColor || "-";
                      const sku = v?.sku || snap?.sku || "-";

                      return (
                        <tr key={idx} className="transition hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={snap.thumbnail || "/placeholder.png"}
                                alt={snap.title || "Product"}
                                className="h-12 w-12 rounded-xl border border-gray-100 object-cover"
                              />
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {snap.title || "-"}
                                </p>

                                {productUrl && (
                                  <a
                                    href={productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    View Product <ExternalLink size={13} />
                                  </a>
                                )}

                                <p className="text-xs text-gray-500">
                                  Code: {snap.productCode || "-"} • SKU: {sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-gray-700">
                            <div className="space-y-1 text-xs">
                              <p>
                                <span className="font-medium">Size:</span> {size}
                              </p>
                              <p>
                                <span className="font-medium">Color:</span> {color}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {it.quantity}
                          </td>

                          <td className="px-4 py-4 text-gray-800">
                            ₹{Number(it.price || 0)}
                          </td>

                          <td className="px-4 py-4 font-semibold text-gray-900">
                            ₹{Number(it.subtotal || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <OrderFulfillmentTimeline order={order} />

          <OrderConfirmationDetails order={order} />


          <OrderCancellationDetails order={order} />

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <BadgeIndianRupee size={18} /> Payment Summary
            </h2>

            <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">₹{order.subtotal}</span>
              </p>
              <p className="flex justify-between">
                <span>Discount</span>
                <span className="font-semibold">₹{order.discount}</span>
              </p>
              <p className="flex justify-between">
                <span>Shipping Fee</span>
                <span className="font-semibold">₹{order.shippingFee}</span>
              </p>
              <p className="flex justify-between">
                <span>Tax</span>
                <span className="font-semibold">₹{order.tax}</span>
              </p>

              <div className="flex justify-between border-t border-gray-100 pt-4 text-base font-bold text-gray-900 sm:col-span-2">
                <span>Final Payable</span>
                <span>₹{order.finalPayable}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <User size={18} /> Customer
            </h2>

            <p className="font-semibold text-gray-900">
              {order.customerId?.name || "-"}
            </p>

            <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Phone size={15} /> {order.customerId?.phone || "-"}
              </p>
              <p className="flex items-center gap-2">
                <Mail size={15} /> {order.customerId?.email || "-"}
              </p>
            </div>
          </Card>

          <OrderSourceAttributionCard order={order} />

          <div className="grid gap-5 md:grid-cols-2">
            <EditableAddressCard
              orderId={order._id}
              type="shipping"
              address={order.shippingAddressSnapshot}
              onRefresh={() => fetchOrderById(order._id)}
            />

            <EditableAddressCard
              orderId={order._id}
              type="billing"
              address={order.billingAddressSnapshot}
              onRefresh={() => fetchOrderById(order._id)}
            />
          </div>

          <OrderServiceabilityCard order={order} />

          <Card>
            <h2 className="mb-4 text-base font-semibold">Order Status</h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-64">
                <label className="text-xs font-semibold text-gray-600">
                  Fulfillment Status
                </label>

                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                >
                  {FULFILLMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={statusUpdating || cancelLoading}
                className="h-[42px] rounded-lg bg-black px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {statusUpdating || cancelLoading ? "Updating..." : "Update"}
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Note: Return/Exchange progress is tracked in RMA section, not in fulfillment status.
            </p>
          </Card>

          <OrderCreateRmaPanel
            order={order}
            onCreated={() => fetchOrderById(order._id)}
          />

          <OrderRmaMention orderId={order._id} />

          <OrderActionCenter
            order={order}
            trackingId={trackingId}
            courierName={courierName}
            trackingUrl={
              order?.shipment?.shiprocket?.trackingUrl ||
              order?.trackingDetails?.trackingUrl ||
              ""
            }
            onRefresh={() => fetchOrderById(order._id)}
          />

          <OrderTrackingCard
            orderId={order._id}
            shipment={order?.shipment}
            trackingDetails={order?.trackingDetails}
            onRefresh={() => fetchOrderById(order._id)}
          />

          <Card>
            <h2 className="mb-4 text-base font-semibold">Admin Remarks</h2>

            <label className="text-xs font-semibold text-gray-600">
              Notes / Remarks
            </label>

            <textarea
              className="mt-2 h-28 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={updateRemarks}
                disabled={remarksSaving}
                className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {remarksSaving ? "Saving..." : "Save Remarks"}
              </button>

              <button
                onClick={updateTracking}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-50"
                type="button"
              >
                Save Tracking
              </button>
            </div>
          </Card>

          <OrderPrintPanel
            order={order}
            courierName={courierName}
            trackingId={trackingId}
          />
        </div>
      </section>

      <CancelOrderModal
        open={cancelModalOpen}
        order={cancelTargetOrder}
        loading={cancelLoading}
        onClose={() => {
          closeCancelModal();
          setNewStatus(safeCurrentStatus);
        }}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}