"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Package,
  User,
  Receipt,
  BadgeIndianRupee,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";
import OrderPrintPanel from "@/components/orders/OrderPrintPanel";
import OrderRmaMention from "../../../components/orders/OrderRma";
const API = process.env.NEXT_PUBLIC_API_URL;


const statusBadgeStyle = (status) => {
  switch (status) {
    case "processing":
      return "bg-yellow-50 text-yellow-700";
    case "packed":
      return "bg-indigo-50 text-indigo-700";
    case "shipped":
      return "bg-blue-50 text-blue-700";
    case "out_for_delivery":
      return "bg-purple-50 text-purple-700";
    case "delivered":
      return "bg-green-50 text-green-700";
    case "returned":
      return "bg-orange-50 text-orange-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}
  >
    {children}
  </div>
);

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

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");

  const [remarks, setRemarks] = useState("");
  const [remarksSaving, setRemarksSaving] = useState(false);

  const orderStatusLabel = useMemo(() => {
    if (!order?.fulfillmentStatus) return "";
    return String(order.fulfillmentStatus).replace(/_/g, " ");
  }, [order?.fulfillmentStatus]);

  /* ✅ Load order */
  useEffect(() => {
    if (!id) return;
    fetchOrderById(id);
    return () => clearOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ✅ Hydrate inputs */
  useEffect(() => {
    if (!order) return;
    setNewStatus(order.fulfillmentStatus || "processing");
    setTrackingId(order.trackingDetails?.trackingId || "");
    setCourierName(order.trackingDetails?.courierName || "");
    setRemarks(order.adminRemarks || "");
  }, [order]);

  /* ✅ Update status */
  const handleUpdateStatus = async () => {
    if (!order?._id) return;

    setStatusUpdating(true);
    try {
      await updateOrderStatus(order._id, { fulfillmentStatus: newStatus });
      toast.success("Order status updated ✅");
      await fetchOrderById(order._id);
    } catch (e) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  /* ✅ Update tracking */
  const updateTracking = async () => {
    if (!order?._id) return;

    try {
      const res = await fetch(`${API}/api/orders/${order._id}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingId, courierName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.message || "Failed to update tracking");

      toast.success("Tracking updated ✅");
      await fetchOrderById(order._id);
    } catch {
      toast.error("Failed to update tracking");
    }
  };

  /* ✅ Update remarks */
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

  /* ✅ LOADING */
  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gray-600" size={34} />
      </div>
    );

  if (error) return <p className="p-10 text-red-500">{error}</p>;
  if (!order) return <p className="p-10 text-red-500">Order not found</p>;

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* BACK */}
        <button
          onClick={() => router.push("/orders/all")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} /> Back to Orders
        </button>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage customer details, tracking & printing.
            </p>
          </div>

          <span
            className={`px-3 py-1.5 rounded-full capitalize font-semibold text-xs w-fit ${statusBadgeStyle(
              order.fulfillmentStatus
            )}`}
          >
            {orderStatusLabel}
          </span>
        </div>

        {/* ✅ ORDER ITEMS */}
        <Card>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <Package size={18} /> Items in this Order
          </h2>

          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Product</th>
                    <th className="py-3 px-4 text-left font-semibold">Variant</th>
                    <th className="py-3 px-4 text-left font-semibold">Qty</th>
                    <th className="py-3 px-4 text-left font-semibold">Price</th>
                    <th className="py-3 px-4 text-left font-semibold">Subtotal</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {items.map((it, idx) => {
                    const snap = it?.productSnapshot || {};
                    const v = it?.variant || {};

                    const size = it?.selectedSize || "-";
                    const color = it?.selectedColor || "-";
                    const sku = v?.sku || snap?.sku || "-";

                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        {/* Product */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              alt={snap.title || "Product"}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {snap.title || "-"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Code: {snap.productCode || "-"} • SKU: {sku}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Variant */}
                        <td className="py-4 px-4 text-gray-700">
                          <div className="space-y-1 text-xs">
                            <p>
                              <span className="font-medium">Size:</span>{" "}
                              {size}
                            </p>
                            <p>
                              <span className="font-medium">Color:</span>{" "}
                              {color}
                            </p>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="py-4 px-4 font-semibold text-gray-900">
                          {it.quantity}
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4 text-gray-800">
                          ₹{Number(it.price || 0)}
                        </td>

                        {/* Subtotal */}
                        <td className="py-4 px-4 font-semibold text-gray-900">
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

        {/* ✅ TOTALS */}
        <Card>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <BadgeIndianRupee size={18} /> Payment Summary
          </h2>

          <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
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

            <div className="sm:col-span-2 border-t border-gray-100 pt-4 flex justify-between text-base font-bold text-gray-900">
              <span>Final Payable</span>
              <span>₹{order.finalPayable}</span>
            </div>
          </div>
        </Card>

        {/* CUSTOMER */}
        <Card>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <User size={18} /> Customer
          </h2>

          <p className="font-semibold text-gray-900">
            {order.customerId?.name || "-"}
          </p>

          <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
            <p className="flex items-center gap-2">
              <Phone size={15} /> {order.customerId?.phone || "-"}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} /> {order.customerId?.email || "-"}
            </p>
          </div>
        </Card>

        {/* ADDRESSES */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <MapPin size={18} /> Shipping Address
            </h2>
            <div className="text-gray-700 leading-relaxed text-sm space-y-0.5">
              <p>{order.shippingAddressSnapshot?.fullName || "-"}</p>
              <p>{order.shippingAddressSnapshot?.line1 || "-"}</p>
              <p>{order.shippingAddressSnapshot?.line2 || ""}</p>
              <p>
                {order.shippingAddressSnapshot?.city || "-"},{" "}
                {order.shippingAddressSnapshot?.state || "-"} -{" "}
                {order.shippingAddressSnapshot?.pincode || "-"}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <Receipt size={18} /> Billing Address
            </h2>
            <div className="text-gray-700 leading-relaxed text-sm space-y-0.5">
              <p>{order.billingAddressSnapshot?.fullName || "-"}</p>
              <p>{order.billingAddressSnapshot?.line1 || "-"}</p>
              <p>{order.billingAddressSnapshot?.line2 || ""}</p>
              <p>
                {order.billingAddressSnapshot?.city || "-"},{" "}
                {order.billingAddressSnapshot?.state || "-"} -{" "}
                {order.billingAddressSnapshot?.pincode || "-"}
              </p>
            </div>
          </Card>
        </div>

        {/* STATUS UPDATE */}
        <Card>
          <h2 className="text-base font-semibold mb-4">Order Status</h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-full sm:w-64">
              <label className="text-xs font-semibold text-gray-600">
                Fulfillment Status
              </label>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-2 w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={statusUpdating}
              className="h-[42px] px-6 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
            >
              {statusUpdating ? "Updating..." : "Update"}
            </button>
          </div>
        </Card>

<OrderRmaMention orderId={order._id} />



        {/* TRACKING */}
        <Card>
          <h2 className="text-base font-semibold mb-4">Tracking</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Tracking ID / AWB
              </label>
              <input
                className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">
                Courier Name
              </label>
              <input
                className="mt-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={updateTracking}
            className="mt-4 px-6 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Save Tracking
          </button>
        </Card>

        {/* REMARKS */}
        <Card>
          <h2 className="text-base font-semibold mb-4">Admin Remarks</h2>

          <label className="text-xs font-semibold text-gray-600">
            Notes / Remarks
          </label>

          <textarea
            className="mt-2 px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 w-full h-28 text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <button
            onClick={updateRemarks}
            disabled={remarksSaving}
            className="mt-4 px-6 py-2.5 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition"
          >
            {remarksSaving ? "Saving..." : "Save Remarks"}
          </button>
        </Card>

        {/* ✅ PRINT PANEL */}
        <OrderPrintPanel
          order={order}
          courierName={courierName}
          trackingId={trackingId}
        />
      </div>
    </section>
  );
}
