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
  FileText,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore"; // ✅ make sure this path matches your actual store file
import OrderPrintPanel from "@/components/orders/OrderPrintPanel";

const API = process.env.NEXT_PUBLIC_API_URL;

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

  // ✅ Load order from store
  useEffect(() => {
    if (!id) return;
    fetchOrderById(id);

    return () => clearOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ Hydrate local inputs when order loads
  useEffect(() => {
    if (!order) return;
    setNewStatus(order.fulfillmentStatus || "processing");
    setTrackingId(order.trackingDetails?.trackingId || "");
    setCourierName(order.trackingDetails?.courierName || "");
    setRemarks(order.adminRemarks || "");
  }, [order]);

  // ------------------------------
  // ✅ UPDATE ORDER STATUS (STORE)
  // ------------------------------
  const handleUpdateStatus = async () => {
    if (!order?._id) return;

    setStatusUpdating(true);
    try {
      await updateOrderStatus(order._id, { fulfillmentStatus: newStatus });
      await fetchOrderById(order._id);
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // ------------------------------
  // ✅ UPDATE TRACKING (API PATCH)
  // ------------------------------
  const updateTracking = async () => {
    if (!order?._id) return;

    try {
      const res = await fetch(`${API}/api/orders/${order._id}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingId, courierName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Failed to update tracking");
        return;
      }

      alert("Tracking updated!");
      await fetchOrderById(order._id);
    } catch (e) {
      alert("Failed to update tracking");
    }
  };

  // ------------------------------
  // ✅ UPDATE REMARKS (PUT)
  // ------------------------------
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
      if (!res.ok) {
        alert(data?.message || "Failed to update remarks");
      } else {
        alert("Remarks updated!");
        await fetchOrderById(order._id);
      }
    } catch (e) {
      alert("Failed to update remarks");
    } finally {
      setRemarksSaving(false);
    }
  };

  // ✅ LOADING
  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gray-600" size={34} />
      </div>
    );

  // ✅ ERROR
  if (error) return <p className="p-10 text-red-500">{error}</p>;

  // ✅ NO ORDER
  if (!order) return <p className="p-10 text-red-500">Order not found</p>;

  return (
  <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
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

        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 capitalize font-semibold text-xs w-fit">
          {orderStatusLabel}
        </span>
      </div>

      {/* CUSTOMER */}
      <div className="bg-white/90 backdrop-blur p-5 rounded-2xl shadow-sm ring-1 ring-gray-200 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <User size={18} /> Customer
        </h2>

        <p className="font-semibold text-gray-900">
          {order.customerId?.name || "-"}
        </p>

        <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Phone size={15} /> {order.customerId?.phone || "-"}
          </p>
          <p className="flex items-center gap-2">
            <Mail size={15} /> {order.customerId?.email || "-"}
          </p>
        </div>
      </div>

      {/* ADDRESSES */}
      <div className="grid md:grid-cols-2 gap-5 bg-white/90 backdrop-blur p-5 rounded-2xl shadow-sm ring-1 ring-gray-200">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
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
        </div>

        <div>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
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
        </div>
      </div>

      {/* STATUS UPDATE */}
      <div className="bg-white/90 backdrop-blur p-5 rounded-2xl shadow-sm ring-1 ring-gray-200 space-y-3">
        <h2 className="text-base font-semibold">Order Status</h2>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-gray-600">
              Fulfillment Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="mt-2 w-full p-2.5 bg-gray-50 ring-1 ring-gray-200 rounded-md text-sm"
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
            className="h-[42px] px-5 bg-blue-600 text-white rounded-md text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 transition"
          >
            {statusUpdating ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      {/* TRACKING */}
      <div className="bg-white/90 backdrop-blur p-5 rounded-2xl shadow-sm ring-1 ring-gray-200 space-y-4">
        <h2 className="text-base font-semibold">Tracking</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">
              Tracking ID / AWB
            </label>
            <input
              className="mt-2 p-2.5 bg-gray-50 ring-1 ring-gray-200 rounded-md w-full text-sm"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">
              Courier Name
            </label>
            <input
              className="mt-2 p-2.5 bg-gray-50 ring-1 ring-gray-200 rounded-md w-full text-sm"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={updateTracking}
          className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-semibold hover:bg-gray-900 transition"
        >
          Save Tracking
        </button>
      </div>

      {/* REMARKS */}
      <div className="bg-white/90 backdrop-blur p-5 rounded-2xl shadow-sm ring-1 ring-gray-200 space-y-4">
        <h2 className="text-base font-semibold">Admin Remarks</h2>

        <div>
          <label className="text-xs font-semibold text-gray-600">
            Notes / Remarks
          </label>
          <textarea
            className="mt-2 p-3 bg-gray-50 ring-1 ring-gray-200 rounded-md w-full h-28 text-sm"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <button
          onClick={updateRemarks}
          disabled={remarksSaving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-semibold disabled:opacity-60 hover:bg-blue-700 transition"
        >
          {remarksSaving ? "Saving..." : "Save Remarks"}
        </button>
      </div>

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
