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
import { useXpressbeesStore } from "@/store/xpressbeesStore";
import { useBlueDartStore } from "@/store/bluedartStore";
import { useOrderReviewStore } from "@/store/order.review.store";

const ActionCard = ({
  title,
  desc,
  icon: Icon,
  onClick,
  loading,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full rounded-2xl border border-gray-100 bg-white/90 p-4 text-left shadow-sm backdrop-blur transition hover:bg-gray-50 disabled:opacity-50"
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

  const { loading: reviewWhatsappLoading, sendReviewWhatsapp } =
    useOrderReviewStore();

  const { busy, busyKey, sendConfirmationEmail, sendTrackingEmail } =
    useEmailStore();

  const { loading: orderLoading, bookShiprocketIfMissing } = useOrderStore();

  const { loading: xbLoading, createShipment } = useXpressbeesStore();

  const { creating: eshipzLoading, createShipmentFromOrder } =
    useBlueDartStore();

  const isConfirmed = !!order?.isConfirmed;

  const actionLocked =
    busy ||
    orderLoading ||
    xbLoading ||
    eshipzLoading ||
    reviewWhatsappLoading;

  const finalTrackingId = String(trackingId || "").trim();
  const finalCourierName = String(courierName || "").trim();

  const finalTrackingLink =
    String(trackingUrl || "").trim() ||
    String(order?.shipment?.shiprocket?.trackingUrl || "").trim() ||
    String(order?.shipment?.xpressbees?.trackingUrl || "").trim() ||
    String(order?.shipment?.bluedart?.trackingUrl || "").trim() ||
    String(order?.shipment?.eshipz?.trackingUrl || "").trim();

  const canSendTrackingMail =
    !!finalTrackingId && !!finalCourierName && !!finalTrackingLink;

  const hasShiprocket =
    !!String(order?.shipment?.shiprocket?.awb || "").trim() ||
    !!String(order?.shipment?.shiprocket?.shipmentId || "").trim();

  const hasXpressbees =
    !!String(order?.shipment?.xpressbees?.awb || "").trim() ||
    !!String(order?.shipment?.xpressbees?.shipmentId || "").trim();

  const hasEshipzBlueDart =
    !!String(order?.shipment?.bluedart?.awb || "").trim() ||
    !!String(order?.shipment?.bluedart?.awbNumber || "").trim() ||
    !!String(order?.shipment?.bluedart?.shipmentId || "").trim() ||
    !!String(order?.shipment?.eshipz?.awb || "").trim() ||
    !!String(order?.shipment?.eshipz?.awbNumber || "").trim() ||
    !!String(order?.shipment?.eshipz?.shipmentId || "").trim();

  const copyToClipboard = async (text, label = "Copied") => {
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

  const handleSendReviewWhatsapp = async () => {
    if (!orderId || actionLocked) return;

    const orderNumber = String(order?.orderNumber || "").trim();

    if (!orderNumber) {
      return toast.error("Order number missing.");
    }

    try {
      const res = await sendReviewWhatsapp(orderNumber, {
        force: true,
      });

      if (res?.skipped) {
        toast(res?.message || "Review WhatsApp skipped", {
          icon: "ℹ️",
        });
      } else {
        toast.success(res?.message || "Review WhatsApp sent ✅");
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
      return toast.error("Only confirmed orders will be booked ✅");
    }

    if (hasShiprocket) {
      return toast("Already booked with Shiprocket. Skipped ✅", {
        icon: "ℹ️",
      });
    }

    try {
      const res = await bookShiprocketIfMissing(orderId);

      if (res?.skipped) {
        toast(res?.message || "Already booked. Skipped ✅", {
          icon: "ℹ️",
        });
      } else {
        toast.success(res?.message || "Shiprocket booked ✅");
      }

      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Shiprocket booking failed");
    }
  };

  const handleBookXpressbees = async () => {
    if (!orderId || actionLocked) return;

    if (!isConfirmed) {
      return toast.error("Only confirmed orders will be booked ✅");
    }

    if (hasXpressbees) {
      return toast("Already booked with XpressBees. Skipped ✅", {
        icon: "ℹ️",
      });
    }

    try {
      toast.loading("Creating XpressBees booking…", {
        id: "xb-book",
      });

      const res = await createShipment({
        orderId,
        force: true,
        confirmIfCOD: true,
        preferXpressbeesProvider: true,
      });

      toast.success(res?.message || "XpressBees booking created ✅", {
        id: "xb-book",
      });

      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "XpressBees booking failed", {
        id: "xb-book",
      });
    }
  };

  const handleBookEshipzBlueDart = async () => {
    if (!orderId || actionLocked) return;

    if (!isConfirmed) {
      return toast.error("Only confirmed orders will be booked ✅");
    }

    if (hasEshipzBlueDart) {
      return toast("Already booked through Eshipz BlueDart. Skipped ✅", {
        icon: "ℹ️",
      });
    }

    const orderNumber = String(order?.orderNumber || "").trim();

    if (!orderNumber) {
      return toast.error("Order number missing. Please refresh and try again.");
    }

    try {
      toast.loading("Booking through Eshipz BlueDart…", {
        id: "eshipz-bluedart-book",
      });

      const res = await createShipmentFromOrder({
        orderNumber,
        carrierSlug: "bluedart",
        carrierName: "BlueDart",
        provider: "eshipz",
        force: true,
        confirmIfCOD: true,
      });

      toast.success(res?.message || "Eshipz BlueDart booking created ✅", {
        id: "eshipz-bluedart-book",
      });

      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Eshipz BlueDart booking failed", {
        id: "eshipz-bluedart-book",
      });
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
              ? "Send AWB + courier + tracking link."
              : "Requires Tracking ID + Courier + Tracking URL"
          }
          icon={Send}
          onClick={handleSendTracking}
          loading={busyKey === "send-tracking-email"}
          disabled={!orderId || actionLocked || !canSendTrackingMail}
        />

        <ActionCard
          title="Book through Eshipz"
          desc={
            !isConfirmed
              ? "Only confirmed orders will be booked."
              : hasEshipzBlueDart
              ? "Already booked through Eshipz BlueDart."
              : "Book this order through Eshipz using BlueDart."
          }
          icon={Truck}
          onClick={handleBookEshipzBlueDart}
          loading={eshipzLoading}
          disabled={!orderId || actionLocked || hasEshipzBlueDart || !isConfirmed}
        />

        <ActionCard
          title="Book Courier (Shiprocket)"
          desc={
            !isConfirmed
              ? "Only confirmed orders will be booked."
              : hasShiprocket
              ? "Already booked with Shiprocket."
              : "Auto book only if Shiprocket details are missing."
          }
          icon={Truck}
          onClick={handleBookShiprocket}
          loading={orderLoading}
          disabled={!orderId || actionLocked || hasShiprocket || !isConfirmed}
        />

        <ActionCard
          title="Book Courier (XpressBees)"
          desc={
            !isConfirmed
              ? "Only confirmed orders will be booked."
              : hasXpressbees
              ? "Already booked with XpressBees."
              : "Manually book courier with XpressBees."
          }
          icon={Truck}
          onClick={handleBookXpressbees}
          loading={xbLoading}
          disabled={!orderId || actionLocked || hasXpressbees || !isConfirmed}
        />

        <ActionCard
          title="Copy AWB / Tracking ID"
          desc="Copy tracking id for courier."
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