"use client";

import { toast } from "react-hot-toast";
import {
  Mail,
  Send,
  PackageCheck,
  Truck,
  Copy,
  Loader2,
  MessageCircle,
} from "lucide-react";

import { useEmailStore } from "@/store/emailStore";
import { useOrderStore } from "@/store/orderStore";
import { useOrderReviewStore } from "@/store/order.review.store";

const ActionCard = ({
  title,
  desc,
  icon: Icon,
  onClick,
  loading = false,
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full rounded-2xl border border-gray-100 bg-white/90 p-4 text-left shadow-sm backdrop-blur transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100">
        <Icon size={18} className="text-gray-700" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-xs text-gray-500">{desc}</p>
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
  const isConfirmed = Boolean(order?.isConfirmed);

  const { loading: reviewWhatsappLoading, sendReviewWhatsapp } =
    useOrderReviewStore();

  const { busy, busyKey, sendConfirmationEmail, sendTrackingEmail } =
    useEmailStore();

  const { loading: orderLoading, bookShiprocketIfMissing } = useOrderStore();

  const actionLocked = busy || orderLoading || reviewWhatsappLoading;

  const finalTrackingId = String(trackingId || "").trim();
  const finalCourierName = String(courierName || "").trim();

  const finalTrackingLink =
    String(trackingUrl || "").trim() ||
    String(order?.shipment?.shiprocket?.trackingUrl || "").trim();

  const canSendTrackingMail =
    Boolean(finalTrackingId) &&
    Boolean(finalCourierName) &&
    Boolean(finalTrackingLink);

  const hasShiprocket =
    Boolean(String(order?.shipment?.shiprocket?.awb || "").trim()) ||
    Boolean(String(order?.shipment?.shiprocket?.shipmentId || "").trim());

  const copyToClipboard = async (text, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSendConfirmation = async () => {
    if (!orderId || actionLocked) return;

    try {
      const res = await sendConfirmationEmail(orderId);
      toast.success(res?.message || "Confirmation email sent");
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

      toast.success(res?.message || "Tracking email sent");
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to send tracking email");
    }
  };

  const handleSendReviewWhatsapp = async () => {
    if (!orderId || actionLocked) return;

    const orderNumber = String(order?.orderNumber || "").trim();

    if (!orderNumber) {
      toast.error("Order number missing.");
      return;
    }

    try {
      const res = await sendReviewWhatsapp(orderNumber, { force: true });

      if (res?.skipped) {
        toast(res?.message || "Review WhatsApp skipped", { icon: "ℹ️" });
      } else {
        toast.success(res?.message || "Review WhatsApp sent");
      }

      onRefresh?.();
    } catch (e) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to send review WhatsApp"
      );
    }
  };

  const handleBookShiprocket = async () => {
    if (!orderId || actionLocked) return;

    if (!isConfirmed) {
      toast.error("Only confirmed orders can be booked.");
      return;
    }

    if (hasShiprocket) {
      toast("Already booked with Shiprocket.", { icon: "ℹ️" });
      return;
    }

    try {
      const res = await bookShiprocketIfMissing(orderId);

      if (res?.skipped) {
        toast(res?.message || "Already booked. Skipped.", { icon: "ℹ️" });
      } else {
        toast.success(res?.message || "Shiprocket booked");
      }

      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket booking failed");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Action Center</h2>

        {actionLocked ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <Loader2 size={14} className="animate-spin" />
            Working…
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Send Confirmation Email"
          desc="Resend order confirmation to customer."
          icon={Mail}
          onClick={handleSendConfirmation}
          loading={busyKey === "send-confirmation-email"}
          disabled={!orderId || actionLocked}
        />

        <ActionCard
          title="Send Review WhatsApp"
          desc={
            order?.reviewRequest?.sent
              ? "Already sent. Force resend for testing."
              : "Send review request WhatsApp to customer."
          }
          icon={MessageCircle}
          onClick={handleSendReviewWhatsapp}
          loading={reviewWhatsappLoading}
          disabled={!orderId || actionLocked}
        />

        <ActionCard
          title="Send Tracking Email"
          desc={
            canSendTrackingMail
              ? "Send AWB, courier and tracking link."
              : "Requires Tracking ID, Courier and Tracking URL."
          }
          icon={Send}
          onClick={handleSendTracking}
          loading={busyKey === "send-tracking-email"}
          disabled={!orderId || actionLocked || !canSendTrackingMail}
        />

        <ActionCard
          title="Book Courier"
          desc={
            !isConfirmed
              ? "Only confirmed orders can be booked."
              : hasShiprocket
              ? "Already booked with Shiprocket."
              : "Book this order through Shiprocket."
          }
          icon={Truck}
          onClick={handleBookShiprocket}
          loading={orderLoading}
          disabled={!orderId || actionLocked || hasShiprocket || !isConfirmed}
        />

        <ActionCard
          title="Copy AWB / Tracking ID"
          desc="Copy tracking ID for courier."
          icon={Copy}
          onClick={() => copyToClipboard(finalTrackingId, "Tracking ID copied")}
          disabled={!finalTrackingId || actionLocked}
        />

        <ActionCard
          title="Copy Tracking Link"
          desc="Copy tracking URL."
          icon={PackageCheck}
          onClick={() =>
            copyToClipboard(finalTrackingLink, "Tracking link copied")
          }
          disabled={!finalTrackingLink || actionLocked}
        />
      </div>
    </div>
  );
}