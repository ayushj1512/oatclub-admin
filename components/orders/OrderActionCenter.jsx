"use client";

import { toast } from "react-hot-toast";
import { Mail, Send, PackageCheck, Truck, Copy, Loader2 } from "lucide-react";
import { useEmailStore } from "@/store/emailStore";

const ActionCard = ({ title, desc, icon: Icon, onClick, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full text-left rounded-2xl border border-gray-100 bg-white/90 backdrop-blur shadow-sm p-4 hover:bg-gray-50 transition disabled:opacity-50"
  >
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl border border-gray-100 flex items-center justify-center">
        <Icon size={18} className="text-gray-700" />
      </div>

      <div className="flex-1">
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{desc}</p>
      </div>

      {loading ? (
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <Loader2 size={14} className="animate-spin" />
          Working…
        </span>
      ) : null}
    </div>
  </button>
);

export default function OrderActionCenter({
  order,
  trackingId,
  courierName,
  trackingUrl,
  onRefresh,
}) {
  const orderId = order?._id;

  const { busy, busyKey, sendConfirmationEmail, sendTrackingEmail } =
    useEmailStore();

  const actionLocked = busy;

  const finalTrackingId = String(trackingId || "").trim();
  const finalCourierName = String(courierName || "").trim();
  const finalTrackingLink =
    String(trackingUrl || "").trim() ||
    String(order?.shipment?.shiprocket?.trackingUrl || "").trim();

  // ✅ Tracking mail only when ALL 3 are present
  const canSendTrackingMail =
    Boolean(finalTrackingId) && Boolean(finalCourierName) && Boolean(finalTrackingLink);

  const copy = async (text, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      toast.success(`${label} ✅`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSendConfirmation = async () => {
    if (!orderId || actionLocked) return;
    try {
      const res = await sendConfirmationEmail(orderId);
      toast.success(res?.message || "Confirmation email sent ✅");
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to send confirmation email");
    }
  };

  const handleSendTracking = async () => {
    if (!orderId || actionLocked || !canSendTrackingMail) return;
    try {
      const res = await sendTrackingEmail(orderId, {
        trackingId: finalTrackingId,
        courierName: finalCourierName,
        trackingUrl: finalTrackingLink,
      });
      toast.success(res?.message || "Tracking email sent ✅");
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to send tracking email");
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold">Action Center</h2>

        {busy ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <Loader2 size={14} className="animate-spin" />
            Working…
          </div>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ActionCard
          title="Send Confirmation Email"
          desc="Resend order confirmation to customer."
          icon={Mail}
          onClick={handleSendConfirmation}
          loading={busyKey === "send-confirmation-email"}
          disabled={!orderId || actionLocked}
        />

        <ActionCard
          title="Send Tracking Email"
          desc={
            canSendTrackingMail
              ? "Send AWB + courier + tracking link."
              : "Requires Tracking ID + Courier + Tracking URL"
          }
          icon={Send}
          onClick={handleSendTracking}
          loading={busyKey === "send-tracking-email"}
          disabled={!orderId || actionLocked || !canSendTrackingMail}
        />

        {/* ✅ Shiprocket booking disabled for now */}
        <ActionCard
          title="Book Courier (Shiprocket)"
          desc="Temporarily disabled."
          icon={Truck}
          onClick={() =>
            toast("Shiprocket booking disabled for now 🚧", { icon: "🚚" })
          }
          loading={false}
          disabled={true}
        />

        <ActionCard
          title="Copy Order Number"
          desc="Copy MIRAY-XXXXXX"
          icon={Copy}
          onClick={() => copy(order?.orderNumber, "Order number copied")}
          loading={false}
          disabled={!order?.orderNumber || actionLocked}
        />

        <ActionCard
          title="Copy AWB / Tracking ID"
          desc="Copy tracking id for courier."
          icon={Copy}
          onClick={() => copy(finalTrackingId, "Tracking ID copied")}
          loading={false}
          disabled={!finalTrackingId || actionLocked}
        />

        <ActionCard
          title="Copy Tracking Link"
          desc="Copy tracking URL."
          icon={PackageCheck}
          onClick={() => copy(finalTrackingLink, "Tracking link copied")}
          loading={false}
          disabled={!finalTrackingLink || actionLocked}
        />
      </div>
    </div>
  );
}