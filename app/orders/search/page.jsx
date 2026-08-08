"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Phone,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import { useCancelOrderFlow } from "@/hooks/useCancelOrderFlow";

import CancelOrderModal from "@/components/orders/CancelOrderModal";
import UniversalOrderPrintPanel from "@/components/invoice/UniversalOrderPrintPanel";
import OrderSearchTrackingCard from "@/components/orders/OrderSearchTrackingCard";

import { normalizeOrderNumberInput } from "@/utils/formatters";

/* =========================================================
   HELPERS
========================================================= */

const IST = "Asia/Kolkata";

const safe = (value) =>
  value == null ? "" : String(value);

const cn = (...classes) =>
  classes.filter(Boolean).join(" ");

const normalizeOrderNumber = (input) =>
  normalizeOrderNumberInput(input);

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const dtIST = (value) => {
  if (!value) return "";

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const copyText = async (
  text,
  label = "Copied",
) => {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(
      String(text),
    );

    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

/* =========================================================
   OPTIONS
========================================================= */

const FULFILLMENT_OPTIONS = [
  "processing",
  "packed",
  "picked",
  "shipped",
  "out_for_delivery",
  "delivered",
  "pickup_initiated",
  "return_requested",
  "exchange_requested",
  "returned",
  "refunded",
  "exchanged",
  "cancelled",
  "rto",
];

const PAYMENT_STATUS_OPTIONS = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "refund_pending",
  "not_applicable",
];

const PRIORITY_OPTIONS = [
  "normal",
  "medium",
  "high",
];

/* =========================================================
   UI HELPERS
========================================================= */

const getTone = (value) => {
  const key = safe(value).toLowerCase();

  if (
    ["delivered", "refunded", "paid"].includes(
      key,
    )
  ) {
    return "success";
  }

  if (
    ["cancelled", "rto", "failed"].includes(
      key,
    )
  ) {
    return "danger";
  }

  if (
    [
      "exchange_requested",
      "exchanged",
    ].includes(key)
  ) {
    return "violet";
  }

  if (
    [
      "shipped",
      "picked",
      "out_for_delivery",
    ].includes(key)
  ) {
    return "info";
  }

  if (key === "packed") {
    return "indigo";
  }

  if (
    ["processing", "pending"].includes(key)
  ) {
    return "amber";
  }

  return "neutral";
};

function Pill({
  children,
  variant = "neutral",
}) {
  const variants = {
    neutral:
      "bg-zinc-100 text-zinc-700",

    amber:
      "bg-amber-50 text-amber-800 ring-1 ring-amber-200",

    indigo:
      "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200",

    info:
      "bg-sky-50 text-sky-800 ring-1 ring-sky-200",

    violet:
      "bg-violet-50 text-violet-800 ring-1 ring-violet-200",

    success:
      "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",

    danger:
      "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
        variants[variant] ||
        variants.neutral,
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  icon: Icon,
  accent = "neutral",
  right,
  children,
}) {
  const bars = {
    neutral: "bg-zinc-300",
    amber: "bg-amber-400",
    indigo: "bg-indigo-400",
    info: "bg-sky-400",
    violet: "bg-violet-400",
    success: "bg-emerald-400",
    danger: "bg-rose-400",
  };

  return (
    <section className="overflow-hidden bg-white shadow-sm ring-1 ring-zinc-200/70">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "h-4 w-1 shrink-0",
              bars[accent] ||
              bars.neutral,
            )}
          />

          {Icon ? (
            <Icon className="h-4 w-4 shrink-0 text-zinc-600" />
          ) : null}

          <h2 className="truncate text-sm font-semibold text-zinc-900">
            {title}
          </h2>
        </div>

        {right}
      </div>

      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}) {
  if (
    value == null ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 last:border-0">
      <span className="shrink-0 text-xs text-zinc-500">
        {label}
      </span>

      <div
        className={cn(
          "min-w-0 break-all text-right text-sm text-zinc-900",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="min-w-0 bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-zinc-900">
        {value || "—"}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full appearance-none bg-white px-3 py-2.5 pr-9 text-sm capitalize outline-none ring-1 ring-zinc-200 transition focus:ring-zinc-400"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option.replaceAll(
              "_",
              " ",
            )}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "dark",
  className,
}) {
  const variants = {
    dark:
      "bg-zinc-900 text-white hover:bg-black",

    light:
      "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50",

    indigo:
      "bg-indigo-600 text-white hover:bg-indigo-700",

    danger:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant] ||
        variants.dark,
        className,
      )}
    >
      {children}
    </button>
  );
}

function ProductImage({
  src,
  alt,
}) {
  const [failed, setFailed] =
    useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center bg-zinc-100 text-[9px] text-zinc-400 ring-1 ring-zinc-200">
        NO IMG
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() =>
        setFailed(true)
      }
      className="h-20 w-16 shrink-0 bg-zinc-100 object-cover ring-1 ring-zinc-200"
    />
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function OrderSearchPage() {
  const {
    fetchOrderByNumber,

    confirmOrder,

    updateOrderStatus,
    updateOrderPaymentStatus,
    updateOrder,

    markCodOrderAsPaid,

    sendOrderPaymentRecoveryEmail,
    canSendPaymentRecoveryEmail,

    bookShiprocketIfMissing,
  } = useOrderStore();

  const {
    cancelModalOpen,
    cancelTargetOrder,
    cancelLoading,

    openCancelModal,
    closeCancelModal,
    confirmCancel,
  } = useCancelOrderFlow();

  const {
    syncTracking,
  } = useShiprocketStore();

  /* ---------------- STATE ---------------- */

  const [query, setQuery] =
    useState("");

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [
    actionBusy,
    setActionBusy,
  ] = useState(false);

  const [
    nextFulfillment,
    setNextFulfillment,
  ] = useState("processing");

  const [
    nextPaymentStatus,
    setNextPaymentStatus,
  ] = useState("pending");

  const [
    nextPriority,
    setNextPriority,
  ] = useState("normal");

  const [
    supportRemark,
    setSupportRemark,
  ] = useState("");

  /* ---------------- BASIC VALUES ---------------- */

  const normalized =
    useMemo(
      () =>
        normalizeOrderNumber(
          query,
        ),
      [query],
    );

  const fulfillmentStatus =
    safe(
      order?.fulfillmentStatus,
    ) || "processing";

  const paymentStatus =
    safe(
      order?.paymentStatus,
    ) || "pending";

  const items = Array.isArray(
    order?.items,
  )
    ? order.items
    : [];

  /* =========================================================
     SYNC LOCAL EDITABLE VALUES
  ========================================================= */

  const syncEditableState =
    useCallback((data) => {
      if (!data) return;

      const fulfillment =
        safe(
          data?.fulfillmentStatus,
        ).toLowerCase() ||
        "processing";

      const payment =
        safe(
          data?.paymentStatus,
        ).toLowerCase() ||
        "pending";

      const priority =
        safe(
          data?.priority,
        ).toLowerCase() ||
        "normal";

      setNextFulfillment(
        FULFILLMENT_OPTIONS.includes(
          fulfillment,
        )
          ? fulfillment
          : "processing",
      );

      setNextPaymentStatus(
        PAYMENT_STATUS_OPTIONS.includes(
          payment,
        )
          ? payment
          : "pending",
      );

      setNextPriority(
        PRIORITY_OPTIONS.includes(
          priority,
        )
          ? priority
          : "normal",
      );

      setSupportRemark(
        safe(
          data?.customerSupportRemark,
        ),
      );
    }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const search =
    useCallback(async () => {
      const orderNumber =
        normalizeOrderNumber(
          query,
        );

      if (!orderNumber) {
        toast.error(
          "Enter valid order number",
        );
        return;
      }

      setLoading(true);

      try {
        const data =
          await fetchOrderByNumber(
            orderNumber,
          );

        if (!data?._id) {
          setOrder(null);

          toast.error(
            "Order not found",
          );

          return;
        }

        setOrder(data);
        syncEditableState(data);

        toast.success(
          "Order loaded",
        );
      } catch (error) {
        setOrder(null);

        toast.error(
          error?.message ||
          "Failed to fetch order",
        );
      } finally {
        setLoading(false);
      }
    }, [
      query,
      fetchOrderByNumber,
      syncEditableState,
    ]);

  /* =========================================================
     REFRESH
  ========================================================= */

  const refresh =
    useCallback(async () => {
      if (
        !order?.orderNumber
      ) {
        return null;
      }

      setLoading(true);

      try {
        const data =
          await fetchOrderByNumber(
            order.orderNumber,
          );

        setOrder(
          data || null,
        );

        syncEditableState(
          data,
        );

        toast.success(
          "Refreshed",
        );

        return data;
      } catch (error) {
        toast.error(
          error?.message ||
          "Refresh failed",
        );

        return null;
      } finally {
        setLoading(false);
      }
    }, [
      order?.orderNumber,
      fetchOrderByNumber,
      syncEditableState,
    ]);

  /* =========================================================
     CONFIRM
  ========================================================= */

  const handleConfirm =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await confirmOrder(
            order._id,
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "Order confirmed",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Confirm failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      confirmOrder,
      syncEditableState,
    ]);

  /* =========================================================
     FULFILLMENT STATUS
  ========================================================= */

  const applyFulfillmentStatus =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      if (
        nextFulfillment ===
        "cancelled"
      ) {
        openCancelModal(
          order,
        );

        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await updateOrderStatus(
            order._id,
            {
              fulfillmentStatus:
                nextFulfillment,
            },
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "Status updated",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Status update failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      nextFulfillment,
      updateOrderStatus,
      syncEditableState,
      openCancelModal,
    ]);

  /* =========================================================
     MARK PACKED
  ========================================================= */

  const markPacked =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await updateOrderStatus(
            order._id,
            {
              fulfillmentStatus:
                "packed",
            },
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "Marked packed",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Failed to mark packed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      updateOrderStatus,
      syncEditableState,
    ]);

  /* =========================================================
     CANCEL
  ========================================================= */

  const openCancel =
    useCallback(() => {
      if (!order?._id) {
        return;
      }

      openCancelModal(
        order,
      );
    }, [
      order,
      openCancelModal,
    ]);

  const handleCancelConfirm =
    useCallback(
      async (
        reason = "",
      ) => {
        if (!order?._id) {
          return;
        }

        setActionBusy(true);

        try {
          const updated =
            await confirmCancel(
              reason,
            );

          const finalOrder =
            updated || {
              ...order,
              fulfillmentStatus:
                "cancelled",
            };

          setOrder(
            finalOrder,
          );

          syncEditableState(
            finalOrder,
          );

          toast.success(
            "Order cancelled",
          );
        } catch (error) {
          toast.error(
            error?.message ||
            "Cancel failed",
          );
        } finally {
          setActionBusy(false);
        }
      },
      [
        order,
        confirmCancel,
        syncEditableState,
      ],
    );

  /* =========================================================
     PAYMENT STATUS
  ========================================================= */

  const applyPaymentStatus =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await updateOrderPaymentStatus(
            order._id,
            nextPaymentStatus,
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "Payment status updated",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Payment status update failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      nextPaymentStatus,
      updateOrderPaymentStatus,
      syncEditableState,
    ]);

  /* =========================================================
     SUPPORT REMARK / PRIORITY
  ========================================================= */

  const saveOrderMeta =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await updateOrder(
            order._id,
            {
              priority:
                nextPriority,

              customerSupportRemark:
                supportRemark,
            },
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "Order notes saved",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Failed to save order notes",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      nextPriority,
      supportRemark,
      updateOrder,
      syncEditableState,
    ]);

  /* =========================================================
     COD PAID
  ========================================================= */

  const markCodPaid =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        const updated =
          await markCodOrderAsPaid(
            order._id,
          );

        const finalOrder =
          updated || order;

        setOrder(finalOrder);

        syncEditableState(
          finalOrder,
        );

        toast.success(
          "COD order marked paid",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Unable to mark COD paid",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      markCodOrderAsPaid,
      syncEditableState,
    ]);

  /* =========================================================
     PAYMENT RECOVERY
  ========================================================= */

  const sendRecoveryEmail =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        await sendOrderPaymentRecoveryEmail(
          order._id,
        );

        toast.success(
          "Payment recovery email sent",
        );
      } catch (error) {
        toast.error(
          error?.message ||
          "Payment recovery email failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order?._id,
      sendOrderPaymentRecoveryEmail,
    ]);

  /* =========================================================
     SHIPROCKET BOOKING
  ========================================================= */

  const bookShiprocket =
    useCallback(async () => {
      if (!order?._id) {
        return;
      }

      setActionBusy(true);

      try {
        await bookShiprocketIfMissing(
          order._id,
        );

        toast.success(
          "Booking attempted",
        );

        await refresh();
      } catch (error) {
        toast.error(
          error?.message ||
          "Shiprocket booking failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order?._id,
      bookShiprocketIfMissing,
      refresh,
    ]);

  /* =========================================================
     TRACKING
  ========================================================= */

  const syncTrackingNow =
    useCallback(async () => {
      if (
        !order?._id &&
        !order?.orderNumber
      ) {
        toast.error(
          "Order not loaded",
        );

        return;
      }

      setActionBusy(true);

      try {
        await syncTracking(
          order?._id
            ? {
              orderId:
                order._id,
            }
            : {
              orderNumber:
                order.orderNumber,
            },
        );

        toast.success(
          "Tracking synced",
        );

        await refresh();
      } catch (error) {
        toast.error(
          error?.message ||
          "Tracking sync failed",
        );
      } finally {
        setActionBusy(false);
      }
    }, [
      order,
      syncTracking,
      refresh,
    ]);

  /* =========================================================
     ORDER DERIVED DATA
  ========================================================= */

  const totals =
    useMemo(
      () => ({
        subtotal: Number(
          order?.subtotal || 0,
        ),

        discount: Number(
          order?.discount || 0,
        ),

        shippingFee:
          Number(
            order?.shippingFee ||
            0,
          ),

        tax: Number(
          order?.tax || 0,
        ),

        totalAmount:
          Number(
            order?.totalAmount ||
            0,
          ),

        finalPayable:
          Number(
            order?.finalPayable ||
            0,
          ),
      }),
      [order],
    );

  const shipment =
    order?.shipment || {};

  const shiprocket =
    shipment?.shiprocket ||
    {};

  const xpressbees =
    shipment?.xpressbees ||
    {};

  const delhivery =
    shipment?.delhivery ||
    {};

  const eshipz =
    shipment?.eshipz ||
    {};

  const tracking =
    order?.trackingDetails ||
    {};

  const shipProvider =
    safe(
      shipment?.provider,
    ) || "shiprocket";

  const providerShipment =
    shipProvider ===
      "xpressbees"
      ? xpressbees
      : shipProvider ===
        "delhivery"
        ? delhivery
        : shipProvider ===
          "eshipz"
          ? eshipz
          : shiprocket;

  const trackingId =
    safe(
      tracking?.trackingId,
    ) ||
    safe(
      tracking?.awb,
    ) ||
    safe(
      providerShipment?.awb,
    ) ||
    safe(
      providerShipment?.waybill,
    ) ||
    safe(
      shipment?.awb,
    );

  const trackingUrl =
    safe(
      tracking?.trackingUrl,
    ) ||
    safe(
      providerShipment?.trackingUrl,
    ) ||
    safe(
      shipment?.trackingUrl,
    );

  const courierName =
    safe(
      tracking?.courierName,
    ) ||
    safe(
      providerShipment?.courierName,
    ) ||
    safe(
      shipment?.courierName,
    );

  const attribution =
    order?.attribution || {};

  const analytics =
    order?.analytics || {};

  const paymentBreakdown =
    order?.paymentBreakdown ||
    {};

  const razorpay =
    order?.razorpay || {};

  const walletCredit =
    order?.walletCredit || {};

  const walletReward =
    order?.walletReward || {};

  const cancellation =
    order?.cancellation || {};

  const refund =
    order?.refundSummary || {};

  const fulfillmentDates =
    order?.fulfillmentDates ||
    {};

  const customer =
    typeof order?.customerId ===
      "object"
      ? order.customerId
      : {};

  const customerId =
    typeof order?.customerId ===
      "object"
      ? safe(
        order?.customerId
          ?._id,
      )
      : safe(
        order?.customerId,
      );

  const customerName =
    safe(
      customer?.name,
    ) ||
    safe(
      order
        ?.shippingAddressSnapshot
        ?.fullName,
    );

  const customerPhone =
    safe(
      customer?.phone,
    ) ||
    safe(
      order
        ?.shippingAddressSnapshot
        ?.phone,
    );

  const customerEmail =
    safe(
      customer?.email,
    ) ||
    safe(
      order
        ?.shippingAddressSnapshot
        ?.email,
    );

  const canConfirm =
    Boolean(order?._id) &&
    !order?.isConfirmed;

  const canPack =
    Boolean(order?._id) &&
    Boolean(
      order?.isConfirmed,
    ) &&
    fulfillmentStatus ===
    "processing" &&
    safe(
      order?.orderType,
    ).toLowerCase() !==
    "parent";

  const canRecoverPayment =
    Boolean(order?._id) &&
    canSendPaymentRecoveryEmail(
      order,
    );

  const canMarkCodPaid =
    Boolean(order?._id) &&
    safe(
      order?.paymentMethod,
    ).toLowerCase() ===
    "cod" &&
    safe(
      order?.paymentStatus,
    ).toLowerCase() !==
    "paid" &&
    fulfillmentStatus !==
    "cancelled";

  const fulfillmentTimeline =
    [
      [
        "Processing",
        fulfillmentDates.processingAt,
      ],

      [
        "Packed",
        fulfillmentDates.packedAt,
      ],

      [
        "Picked",
        fulfillmentDates.pickedAt,
      ],

      [
        "Shipped",
        fulfillmentDates.shippedAt,
      ],

      [
        "Out for delivery",
        fulfillmentDates.outForDeliveryAt,
      ],

      [
        "Delivered",
        fulfillmentDates.deliveredAt,
      ],

      [
        "Pickup initiated",
        fulfillmentDates.pickupInitiatedAt,
      ],

      [
        "Return requested",
        fulfillmentDates.returnRequestedAt,
      ],

      [
        "Exchange requested",
        fulfillmentDates.exchangeRequestedAt,
      ],

      [
        "Returned",
        fulfillmentDates.returnedAt,
      ],

      [
        "Refunded",
        fulfillmentDates.refundedAt,
      ],

      [
        "Exchanged",
        fulfillmentDates.exchangedAt,
      ],

      [
        "RTO",
        fulfillmentDates.rtoAt,
      ],

      [
        "Cancelled",
        fulfillmentDates.cancelledAt,
      ],
    ].filter(
      ([, date]) =>
        Boolean(date),
    );

  const fullAddress = [
    safe(
      order
        ?.shippingAddressSnapshot
        ?.fullName,
    ),

    safe(
      order
        ?.shippingAddressSnapshot
        ?.phone,
    ),

    safe(
      order
        ?.shippingAddressSnapshot
        ?.email,
    ),

    safe(
      order
        ?.shippingAddressSnapshot
        ?.line1,
    ),

    safe(
      order
        ?.shippingAddressSnapshot
        ?.line2,
    ),

    [
      safe(
        order
          ?.shippingAddressSnapshot
          ?.city,
      ),

      safe(
        order
          ?.shippingAddressSnapshot
          ?.state,
      ),
    ]
      .filter(Boolean)
      .join(", "),

    [
      safe(
        order
          ?.shippingAddressSnapshot
          ?.pincode,
      ),

      safe(
        order
          ?.shippingAddressSnapshot
          ?.country,
      ),
    ]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <main className="min-h-screen bg-zinc-50">
        <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
          {/* SEARCH */}

          <section className="bg-white shadow-sm ring-1 ring-zinc-200/70">
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold text-zinc-950">
                    Order Search
                  </h1>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    Search and manage
                    complete order
                    lifecycle.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  disabled={
                    !order?._id ||
                    loading
                  }
                  className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:text-black disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}

                  Refresh
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    value={query}
                    onChange={(e) =>
                      setQuery(
                        e.target
                          .value,
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        search();
                      }
                    }}
                    placeholder="Enter order number e.g. 000123"
                    className="w-full bg-white px-3 py-3 pr-10 text-sm outline-none ring-1 ring-zinc-200 transition placeholder:text-zinc-400 focus:ring-zinc-500"
                  />

                  {query ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuery("")
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 transition hover:text-zinc-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={search}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}

                  <span className="hidden sm:inline">
                    Search
                  </span>
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div>
                  Normalized:{" "}
                  <span className="font-mono text-zinc-900">
                    {normalized ||
                      "—"}
                  </span>
                </div>

                {order?._id ? (
                  <Link
                    href={`/orders/${order._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-zinc-900 hover:underline"
                  >
                    Full order page
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {/* EMPTY */}

          {!order?._id ? (
            <section className="bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200/70">
              <Search className="mx-auto h-6 w-6 text-zinc-300" />

              <div className="mt-3 text-sm font-semibold text-zinc-900">
                No order loaded
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                Enter an order
                number above.
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* =================================================
                  LEFT COLUMN
              ================================================= */}

              <div className="space-y-4 xl:col-span-8">
                {/* OVERVIEW */}

                <Card
                  title="Order Overview"
                  icon={Hash}
                  accent={getTone(
                    fulfillmentStatus,
                  )}
                  right={
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Pill
                        variant={getTone(
                          fulfillmentStatus,
                        )}
                      >
                        {fulfillmentStatus.replaceAll(
                          "_",
                          " ",
                        )}
                      </Pill>

                      <Pill
                        variant={getTone(
                          paymentStatus,
                        )}
                      >
                        {paymentStatus.replaceAll(
                          "_",
                          " ",
                        )}
                      </Pill>

                      {order?.isConfirmed ? (
                        <Pill variant="success">
                          <CheckCircle2 className="h-3 w-3" />
                          Confirmed
                        </Pill>
                      ) : (
                        <Pill variant="amber">
                          <AlertTriangle className="h-3 w-3" />
                          Unconfirmed
                        </Pill>
                      )}
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat
                      label="Order"
                      value={
                        order?.orderNumber
                      }
                    />

                    <MiniStat
                      label="Amount"
                      value={`₹${money(
                        totals.finalPayable,
                      )}`}
                    />

                    <MiniStat
                      label="Items"
                      value={String(
                        analytics?.totalItems ??
                        items.length,
                      )}
                    />

                    <MiniStat
                      label="Source"
                      value={
                        safe(
                          attribution?.source,
                        ) ||
                        safe(
                          order?.source,
                        ) ||
                        "direct"
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <Row
                      label="Order Number"
                      value={
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              order?.orderNumber,
                              "Order number copied",
                            )
                          }
                          className="inline-flex items-center gap-1.5 font-mono text-xs hover:underline"
                        >
                          {
                            order?.orderNumber
                          }

                          <Copy className="h-3 w-3" />
                        </button>
                      }
                    />

                    <Row
                      label="Mongo ID"
                      value={
                        order?._id
                      }
                      mono
                    />

                    <Row
                      label="Placed At"
                      value={dtIST(
                        order?.orderDate ||
                        order?.createdAt,
                      )}
                    />

                    <Row
                      label="Updated At"
                      value={dtIST(
                        order?.updatedAt,
                      )}
                    />

                    <Row
                      label="Priority"
                      value={
                        order?.priority
                      }
                    />

                    <Row
                      label="Order Type"
                      value={
                        order?.orderType
                      }
                    />

                    <Row
                      label="Delivery Method"
                      value={
                        order?.deliveryMethod
                      }
                    />

                    <Row
                      label="Split Suffix"
                      value={
                        order?.splitSuffix
                      }
                    />

                    <Row
                      label="Parent Order ID"
                      value={
                        order?.parentOrderId
                      }
                      mono
                    />
                  </div>
                </Card>

                {/* ITEMS */}

                <Card
                  title={`Products (${items.length})`}
                  icon={Package}
                  accent="info"
                >
                  {!items.length ? (
                    <div className="text-xs text-zinc-500">
                      No products found.
                    </div>
                  ) : (
                    <div>
                      {items.map(
                        (
                          item,
                          index,
                        ) => {
                          const snapshot =
                            item?.productSnapshot ||
                            {};

                          const attrs =
                            Array.isArray(
                              item
                                ?.variant
                                ?.attributes,
                            )
                              ? item
                                .variant
                                .attributes
                              : [];

                          const size =
                            safe(
                              item?.selectedSize,
                            ) ||
                            safe(
                              attrs.find(
                                (
                                  attr,
                                ) =>
                                  safe(
                                    attr?.key,
                                  ).toLowerCase() ===
                                  "size",
                              )
                                ?.value,
                            );

                          const color =
                            safe(
                              item?.selectedColor,
                            ) ||
                            safe(
                              attrs.find(
                                (
                                  attr,
                                ) =>
                                  [
                                    "color",
                                    "colour",
                                  ].includes(
                                    safe(
                                      attr?.key,
                                    ).toLowerCase(),
                                  ),
                              )
                                ?.value,
                            );

                          const image =
                            safe(
                              snapshot?.thumbnail,
                            ) ||
                            safe(
                              snapshot
                                ?.images?.[0],
                            );

                          return (
                            <div
                              key={
                                item?.lineId ||
                                index
                              }
                              className="flex gap-3 border-b border-zinc-100 py-3 first:pt-0 last:border-0 last:pb-0"
                            >
                              <ProductImage
                                src={
                                  image
                                }
                                alt={
                                  snapshot?.title ||
                                  "Product"
                                }
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-zinc-900">
                                      {snapshot?.title ||
                                        "Untitled product"}
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                      {snapshot?.productCode ? (
                                        <span>
                                          Code:{" "}
                                          <b className="font-medium text-zinc-800">
                                            {
                                              snapshot.productCode
                                            }
                                          </b>
                                        </span>
                                      ) : null}

                                      {size ? (
                                        <span>
                                          Size:{" "}
                                          <b className="font-medium text-zinc-800">
                                            {
                                              size
                                            }
                                          </b>
                                        </span>
                                      ) : null}

                                      {color ? (
                                        <span>
                                          Color:{" "}
                                          <b className="font-medium text-zinc-800">
                                            {
                                              color
                                            }
                                          </b>
                                        </span>
                                      ) : null}

                                      {item
                                        ?.variant
                                        ?.sku ? (
                                        <span>
                                          SKU:{" "}
                                          {
                                            item
                                              .variant
                                              .sku
                                          }
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="mt-2 text-[10px] text-zinc-400">
                                      {item?.lineId
                                        ? `Line: ${item.lineId}`
                                        : ""}
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-left sm:text-right">
                                    <div className="text-sm font-semibold text-zinc-900">
                                      ₹
                                      {money(
                                        item?.subtotal,
                                      )}
                                    </div>

                                    <div className="text-[11px] text-zinc-500">
                                      ₹
                                      {money(
                                        item?.price,
                                      )}
                                      {" × "}
                                      {Number(
                                        item?.quantity ||
                                        1,
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <MiniStat
                                    label="Allocated"
                                    value={String(
                                      item
                                        ?.fulfillment
                                        ?.allocatedQty ||
                                      0,
                                    )}
                                  />

                                  <MiniStat
                                    label="Shipped"
                                    value={String(
                                      item
                                        ?.fulfillment
                                        ?.shippedQty ||
                                      0,
                                    )}
                                  />

                                  <MiniStat
                                    label="To Produce"
                                    value={String(
                                      item
                                        ?.fulfillment
                                        ?.toProduceQty ||
                                      0,
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </Card>

                {/* PAYMENT */}

                <Card
                  title="Payment & Totals"
                  icon={CreditCard}
                  accent="indigo"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat
                      label="Method"
                      value={
                        order?.paymentMethod
                      }
                    />

                    <MiniStat
                      label="Status"
                      value={
                        order?.paymentStatus
                      }
                    />

                    <MiniStat
                      label="Subtotal"
                      value={`₹${money(
                        totals.subtotal,
                      )}`}
                    />

                    <MiniStat
                      label="Payable"
                      value={`₹${money(
                        totals.finalPayable,
                      )}`}
                    />
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-semibold text-zinc-900">
                        Order Total
                      </div>

                      <Row
                        label="Subtotal"
                        value={`₹${money(
                          totals.subtotal,
                        )}`}
                      />

                      <Row
                        label="Discount"
                        value={`₹${money(
                          totals.discount,
                        )}`}
                      />

                      <Row
                        label="Shipping"
                        value={`₹${money(
                          totals.shippingFee,
                        )}`}
                      />

                      <Row
                        label="Tax"
                        value={`₹${money(
                          totals.tax,
                        )}`}
                      />

                      <Row
                        label="Total"
                        value={`₹${money(
                          totals.totalAmount,
                        )}`}
                      />

                      <Row
                        label="Final Payable"
                        value={`₹${money(
                          totals.finalPayable,
                        )}`}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-semibold text-zinc-900">
                        Payment Breakdown
                      </div>

                      <Row
                        label="COD"
                        value={`₹${money(
                          paymentBreakdown?.codAmount,
                        )}`}
                      />

                      <Row
                        label="Razorpay"
                        value={`₹${money(
                          paymentBreakdown?.razorpayAmount,
                        )}`}
                      />

                      <Row
                        label="Wallet"
                        value={`₹${money(
                          paymentBreakdown?.walletAmount,
                        )}`}
                      />

                      <Row
                        label="Wallet Used"
                        value={
                          walletCredit?.used
                            ? `Yes • ₹${money(
                              walletCredit?.amount,
                            )}`
                            : "No"
                        }
                      />

                      <Row
                        label="Wallet Reward"
                        value={
                          walletReward?.earned
                            ? `₹${money(
                              walletReward?.amount,
                            )}`
                            : "No"
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <div className="mb-1 text-xs font-semibold text-zinc-900">
                      Razorpay
                    </div>

                    <Row
                      label="Order ID"
                      value={
                        razorpay?.orderId
                      }
                      mono
                    />

                    <Row
                      label="Payment ID"
                      value={
                        razorpay?.paymentId
                      }
                      mono
                    />

                    <Row
                      label="Amount"
                      value={
                        razorpay?.amount
                          ? `₹${money(
                            razorpay.amount,
                          )}`
                          : ""
                      }
                    />

                    <Row
                      label="Paid At"
                      value={dtIST(
                        razorpay?.paidAt,
                      )}
                    />
                  </div>
                </Card>

                {/* TIMELINE */}

                <Card
                  title="Fulfillment Timeline"
                  icon={CalendarClock}
                  accent={getTone(
                    fulfillmentStatus,
                  )}
                >
                  {!fulfillmentTimeline.length ? (
                    <div className="text-xs text-zinc-500">
                      No fulfillment
                      timestamps yet.
                    </div>
                  ) : (
                    <div className="relative">
                      {fulfillmentTimeline.map(
                        (
                          [
                            label,
                            date,
                          ],
                          index,
                        ) => (
                          <div
                            key={
                              label
                            }
                            className="relative flex gap-3 pb-4 last:pb-0"
                          >
                            {index !==
                              fulfillmentTimeline.length -
                              1 ? (
                              <div className="absolute left-[5px] top-3 h-full w-px bg-zinc-200" />
                            ) : null}

                            <div className="relative mt-1 h-3 w-3 shrink-0 rounded-full bg-zinc-900 ring-4 ring-zinc-100" />

                            <div>
                              <div className="text-xs font-semibold text-zinc-900">
                                {
                                  label
                                }
                              </div>

                              <div className="mt-0.5 text-[11px] text-zinc-500">
                                {dtIST(
                                  date,
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </Card>

                {/* REFUND / CANCELLATION */}

                <Card
                  title="Cancellation & Refund"
                  icon={RotateCcw}
                  accent={
                    cancellation?.isCancelled
                      ? "danger"
                      : "neutral"
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-semibold text-zinc-900">
                        Cancellation
                      </div>

                      <Row
                        label="Cancelled"
                        value={
                          cancellation?.isCancelled
                            ? "Yes"
                            : "No"
                        }
                      />

                      <Row
                        label="Reason"
                        value={
                          cancellation?.reason
                        }
                      />

                      <Row
                        label="By"
                        value={
                          cancellation?.cancelledBy
                        }
                      />

                      <Row
                        label="Cancelled At"
                        value={dtIST(
                          cancellation?.cancelledAt,
                        )}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-semibold text-zinc-900">
                        Refund
                      </div>

                      <Row
                        label="Status"
                        value={
                          refund?.status
                        }
                      />

                      <Row
                        label="Type"
                        value={
                          refund?.refundType
                        }
                      />

                      <Row
                        label="Eligible"
                        value={`₹${money(
                          refund?.eligibleAmount,
                        )}`}
                      />

                      <Row
                        label="Refunded"
                        value={`₹${money(
                          refund?.refundedAmount,
                        )}`}
                      />

                      <Row
                        label="Pending"
                        value={`₹${money(
                          refund?.pendingAmount,
                        )}`}
                      />
                    </div>
                  </div>

                  <Row
                    label="Refund Reason"
                    value={
                      refund?.reason
                    }
                  />

                  <Row
                    label="Admin Note"
                    value={
                      refund?.adminNote
                    }
                  />

                  <Row
                    label="Failure"
                    value={
                      refund?.failureReason
                    }
                  />
                </Card>

                {/* ATTRIBUTION */}

                <Card
                  title="Marketing Attribution"
                  icon={Megaphone}
                  accent="info"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat
                      label="Source"
                      value={
                        attribution?.source ||
                        order?.source ||
                        "direct"
                      }
                    />

                    <MiniStat
                      label="Medium"
                      value={
                        attribution?.medium ||
                        "direct"
                      }
                    />

                    <MiniStat
                      label="Campaign"
                      value={
                        attribution?.campaign
                      }
                    />

                    <MiniStat
                      label="Referrer"
                      value={
                        attribution?.referrer
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <Row
                      label="Campaign Slug"
                      value={
                        attribution?.campaignSlug
                      }
                      mono
                    />

                    <Row
                      label="Visitor ID"
                      value={
                        attribution?.visitorId
                      }
                      mono
                    />

                    <Row
                      label="Session ID"
                      value={
                        attribution?.sessionId
                      }
                      mono
                    />

                    <Row
                      label="FBCLID"
                      value={
                        attribution
                          ?.clickIds
                          ?.fbclid
                      }
                      mono
                    />

                    <Row
                      label="GCLID"
                      value={
                        attribution
                          ?.clickIds
                          ?.gclid
                      }
                      mono
                    />

                    <Row
                      label="Device"
                      value={
                        attribution
                          ?.device
                          ?.type
                      }
                    />

                    <Row
                      label="Browser"
                      value={
                        attribution
                          ?.device
                          ?.browser
                      }
                    />

                    <Row
                      label="OS"
                      value={
                        attribution
                          ?.device
                          ?.os
                      }
                    />

                    <Row
                      label="IP"
                      value={
                        attribution
                          ?.device
                          ?.ip
                      }
                      mono
                    />

                    <Row
                      label="Landing URL"
                      value={
                        attribution?.landingUrl
                      }
                    />
                  </div>
                </Card>
              </div>

              {/* =================================================
                  RIGHT COLUMN
              ================================================= */}

              <div className="space-y-4 xl:col-span-4">
                {/* ACTIONS */}

                <Card
                  title="Quick Actions"
                  icon={ShieldCheck}
                  accent="success"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Btn
                        onClick={
                          handleConfirm
                        }
                        disabled={
                          !canConfirm ||
                          actionBusy ||
                          cancelLoading
                        }
                      >
                        {actionBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}

                        Confirm
                      </Btn>

                      <Btn
                        onClick={
                          markPacked
                        }
                        disabled={
                          !canPack ||
                          actionBusy ||
                          cancelLoading
                        }
                        variant="indigo"
                      >
                        <Package className="h-4 w-4" />
                        Packed
                      </Btn>
                    </div>

                    {/* FULFILLMENT */}

                    <div className="space-y-2 bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Fulfillment
                      </div>

                      <Select
                        value={
                          nextFulfillment
                        }
                        onChange={
                          setNextFulfillment
                        }
                        options={
                          FULFILLMENT_OPTIONS
                        }
                      />

                      <Btn
                        onClick={
                          applyFulfillmentStatus
                        }
                        disabled={
                          actionBusy ||
                          cancelLoading
                        }
                        className="w-full"
                      >
                        Apply Status
                      </Btn>
                    </div>

                    {/* PAYMENT */}

                    <div className="space-y-2 bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        Payment
                      </div>

                      <Select
                        value={
                          nextPaymentStatus
                        }
                        onChange={
                          setNextPaymentStatus
                        }
                        options={
                          PAYMENT_STATUS_OPTIONS
                        }
                      />

                      <Btn
                        onClick={
                          applyPaymentStatus
                        }
                        disabled={
                          actionBusy
                        }
                        variant="light"
                        className="w-full"
                      >
                        <BadgeIndianRupee className="h-4 w-4" />
                        Update Payment
                      </Btn>

                      <Btn
                        onClick={
                          markCodPaid
                        }
                        disabled={
                          actionBusy ||
                          !canMarkCodPaid
                        }
                        variant="light"
                        className="w-full"
                      >
                        <ReceiptText className="h-4 w-4" />
                        Mark COD Paid
                      </Btn>

                      <Btn
                        onClick={
                          sendRecoveryEmail
                        }
                        disabled={
                          actionBusy ||
                          !canRecoverPayment
                        }
                        variant="light"
                        className="w-full"
                      >
                        <Send className="h-4 w-4" />
                        Send Recovery Email
                      </Btn>
                    </div>

                    {/* NOTES */}

                    <div className="space-y-2 bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Support
                      </div>

                      <Select
                        value={
                          nextPriority
                        }
                        onChange={
                          setNextPriority
                        }
                        options={
                          PRIORITY_OPTIONS
                        }
                      />

                      <textarea
                        value={
                          supportRemark
                        }
                        onChange={(e) =>
                          setSupportRemark(
                            e.target
                              .value,
                          )
                        }
                        rows={3}
                        placeholder="Customer support remark..."
                        className="w-full resize-none bg-white px-3 py-2 text-sm outline-none ring-1 ring-zinc-200 focus:ring-zinc-400"
                      />

                      <Btn
                        onClick={
                          saveOrderMeta
                        }
                        disabled={
                          actionBusy
                        }
                        variant="light"
                        className="w-full"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Btn>
                    </div>

                    {/* SHIPPING */}

                    <div className="grid grid-cols-2 gap-2">
                      <Btn
                        onClick={
                          bookShiprocket
                        }
                        disabled={
                          actionBusy ||
                          cancelLoading
                        }
                        variant="light"
                      >
                        <Truck className="h-4 w-4" />
                        Book
                      </Btn>

                      <Btn
                        onClick={
                          syncTrackingNow
                        }
                        disabled={
                          actionBusy
                        }
                        variant="light"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Sync Track
                      </Btn>
                    </div>

                    <Btn
                      onClick={
                        openCancel
                      }
                      disabled={
                        actionBusy ||
                        cancelLoading ||
                        fulfillmentStatus ===
                        "cancelled"
                      }
                      variant="danger"
                      className="w-full"
                    >
                      <Ban className="h-4 w-4" />
                      Cancel Order
                    </Btn>
                  </div>
                </Card>

                {/* CUSTOMER */}

                <Card
                  title="Customer"
                  icon={User}
                >
                  <Row
                    label="Customer ID"
                    value={
                      customerId
                    }
                    mono
                  />

                  <Row
                    label="Name"
                    value={
                      customerName
                    }
                  />

                  <Row
                    label="Phone"
                    value={
                      customerPhone ? (
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              customerPhone,
                              "Phone copied",
                            )
                          }
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />

                          {
                            customerPhone
                          }
                        </button>
                      ) : (
                        ""
                      )
                    }
                  />

                  <Row
                    label="Email"
                    value={
                      customerEmail ? (
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              customerEmail,
                              "Email copied",
                            )
                          }
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Mail className="h-3 w-3" />

                          {
                            customerEmail
                          }
                        </button>
                      ) : (
                        ""
                      )
                    }
                  />

                  <Row
                    label="Customer Message"
                    value={
                      order?.customerMessage
                    }
                  />

                  <Row
                    label="Support Remark"
                    value={
                      order?.customerSupportRemark
                    }
                  />

                  <Row
                    label="Admin Remarks"
                    value={
                      order?.adminRemarks
                    }
                  />

                  <Row
                    label="Query Ref"
                    value={
                      order?.queryRef
                    }
                    mono
                  />
                </Card>

                {/* ADDRESS */}

                <Card
                  title="Shipping Address"
                  icon={MapPin}
                >
                  {order
                    ?.shippingAddressSnapshot
                    ?.fullName ? (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-900">
                            {
                              order
                                .shippingAddressSnapshot
                                .fullName
                            }
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {
                              order
                                .shippingAddressSnapshot
                                .phone
                            }
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              fullAddress,
                              "Address copied",
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-black"
                        >
                          <Copy className="h-3.5 w-3.5" />

                          Copy
                        </button>
                      </div>

                      <div className="mt-3 whitespace-pre-line bg-zinc-50 p-3 text-xs leading-5 text-zinc-700 ring-1 ring-zinc-200/70">
                        {safe(
                          order
                            ?.shippingAddressSnapshot
                            ?.line1,
                        )}

                        {order
                          ?.shippingAddressSnapshot
                          ?.line2
                          ? `\n${order.shippingAddressSnapshot.line2}`
                          : ""}

                        {"\n"}

                        {safe(
                          order
                            ?.shippingAddressSnapshot
                            ?.city,
                        )}

                        {order
                          ?.shippingAddressSnapshot
                          ?.state
                          ? `, ${order.shippingAddressSnapshot.state}`
                          : ""}

                        {"\n"}

                        {safe(
                          order
                            ?.shippingAddressSnapshot
                            ?.pincode,
                        )}{" "}
                        {safe(
                          order
                            ?.shippingAddressSnapshot
                            ?.country,
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      No shipping
                      address found.
                    </div>
                  )}
                </Card>

                {/* SHIPPING */}

                <Card
                  title="Shipment Snapshot"
                  icon={Truck}
                  accent="info"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Provider"
                      value={
                        shipProvider
                      }
                    />

                    <MiniStat
                      label="Status"
                      value={
                        shipment?.status ||
                        "pending"
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <Row
                      label="Courier"
                      value={
                        courierName
                      }
                    />

                    <Row
                      label="AWB"
                      value={
                        trackingId ? (
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                trackingId,
                                "AWB copied",
                              )
                            }
                            className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
                          >
                            {
                              trackingId
                            }

                            <Copy className="h-3 w-3" />
                          </button>
                        ) : (
                          ""
                        )
                      }
                    />

                    <Row
                      label="Shipment Order ID"
                      value={
                        shipment?.orderId ||
                        providerShipment?.orderId
                      }
                      mono
                    />

                    <Row
                      label="Shipment ID"
                      value={
                        shipment?.shipmentId ||
                        providerShipment?.shipmentId
                      }
                      mono
                    />

                    <Row
                      label="Raw Status"
                      value={
                        shipment?.rawStatus ||
                        providerShipment?.rawStatus
                      }
                    />

                    <Row
                      label="Status Code"
                      value={
                        shipment?.statusCode ||
                        providerShipment?.statusCode
                      }
                    />

                    <Row
                      label="Last Synced"
                      value={dtIST(
                        shipment?.lastSyncedAt,
                      )}
                    />

                    <Row
                      label="Last Webhook"
                      value={dtIST(
                        shipment?.lastWebhookAt,
                      )}
                    />

                    <Row
                      label="Last Track"
                      value={dtIST(
                        shipment?.lastTrackAt,
                      )}
                    />
                  </div>

                  {trackingUrl ? (
                    <a
                      href={
                        trackingUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 hover:underline"
                    >
                      Open Tracking
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </Card>

                {/* TRACKING COMPONENT */}

                <OrderSearchTrackingCard
                  orderId={
                    order?._id
                  }
                  orderNumber={
                    order?.orderNumber
                  }
                  shipment={
                    order?.shipment
                  }
                  trackingDetails={
                    order?.trackingDetails
                  }
                  onRefresh={
                    refresh
                  }
                  compact
                />

                {/* PRINT */}

                <Card
                  title="Documents"
                  icon={FileText}
                  accent="indigo"
                >
                  <div className="mb-3 text-xs text-zinc-500">
                    Invoice and packing
                    slip.
                  </div>

                  <div className="overflow-hidden ring-1 ring-zinc-200">
                    <UniversalOrderPrintPanel
                      order={order}
                      courierName={
                        courierName
                      }
                      trackingId={
                        trackingId
                      }
                      title={`Documents • ${safe(
                        order?.orderNumber,
                      )}`}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <CancelOrderModal
        open={cancelModalOpen}
        order={
          cancelTargetOrder
        }
        loading={
          cancelLoading ||
          actionBusy
        }
        onClose={() => {
          closeCancelModal();

          syncEditableState(
            order,
          );
        }}
        onConfirm={
          handleCancelConfirm
        }
      />
    </>
  );
}
