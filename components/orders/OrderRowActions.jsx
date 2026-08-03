"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Download,
  Loader2,
  Megaphone,
  MoreVertical,
  PackageOpen,
  Printer,
  RefreshCw,
  Truck,
  MessageCircle,
  Split,

} from "lucide-react";

import {
  buildTwoWayOrderSplit,
  canSplitOrder,
  canMarkAsTestingOrder,
} from "@/services/order.service";

import { toast } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { createPortal } from "react-dom";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderStore } from "@/store/orderStore";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const safe = (value) => String(value ?? "").trim();

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getCustomerName = (order = {}) =>
  safe(
    order?.customerId?.name ||
    order?.customer?.name ||
    order?.customerName ||
    order?.shippingAddressSnapshot?.fullName ||
    "Customer"
  );

const getCustomerPhone = (order = {}) =>
  safe(
    order?.customerId?.phone ||
    order?.customer?.phone ||
    order?.customerPhone ||
    order?.shippingAddressSnapshot?.phone ||
    order?.billingAddressSnapshot?.phone
  );

const normalizeWhatsAppPhone = (value) => {
  let phone = safe(value)
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  return phone.startsWith("91") && phone.length === 12
    ? phone
    : "";
};

const getOrderNumber = (order = {}) =>
  safe(order?.orderNumber || order?._id || "-");

const getFinalPayable = (order = {}) =>
  Number(
    order?.finalPayable ??
    order?.pricing?.finalPayable ??
    order?.pricing?.grandTotal ??
    order?.grandTotal ??
    order?.totalAmount ??
    order?.total ??
    0
  );

const getPaymentLabel = (order = {}) => {
  const method = safe(order?.paymentMethod).toLowerCase();

  if (method === "cod") return "COD";
  if (method === "razorpay") return "Online";
  if (method === "wallet") return "Wallet";
  if (method === "exchange") return "Exchange";

  return method || "-";
};

const getItems = (order = {}) =>
  Array.isArray(order?.items) ? order.items : [];

const getItemTitle = (item = {}) =>
  safe(
    item?.productSnapshot?.title ||
    item?.productId?.title ||
    item?.title ||
    "Product"
  );

const getItemSize = (item = {}) =>
  safe(
    item?.selectedSize ||
    item?.variant?.size ||
    item?.variant?.attributes?.find(
      (attribute) =>
        safe(attribute?.key).toLowerCase() === "size"
    )?.value
  );

const getItemSummary = (order = {}) => {
  const items = getItems(order);

  if (!items.length) {
    return "Your selected OATCLUB items";
  }

  const visibleItems = items.slice(0, 3).map((item) => {
    const title = getItemTitle(item);
    const size = getItemSize(item);
    const quantity = Math.max(
      1,
      Number(item?.quantity || 1)
    );

    return `${title}${size ? ` (${size})` : ""}${quantity > 1 ? ` × ${quantity}` : ""
      }`;
  });

  const remaining = items.length - visibleItems.length;

  return remaining > 0
    ? `${visibleItems.join(", ")} and ${remaining} more item${remaining > 1 ? "s" : ""
    }`
    : visibleItems.join(", ");
};

const getShippingDetails = (order = {}) => {
  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};
  const xpressbees = shipment?.xpressbees || {};

  return {
    awb: safe(
      shipment?.awb ||
      shiprocket?.awb ||
      xpressbees?.awb ||
      order?.trackingId ||
      order?.trackingDetails?.trackingId ||
      order?.trackingDetails?.awb
    ),

    courierName: safe(
      shipment?.courierName ||
      shiprocket?.courierName ||
      xpressbees?.courierName ||
      order?.courierName ||
      order?.trackingDetails?.courierName
    ),

    trackingUrl: safe(
      shipment?.trackingUrl ||
      shiprocket?.trackingUrl ||
      xpressbees?.trackingUrl ||
      order?.trackingUrl ||
      order?.trackingDetails?.trackingUrl
    ),
  };
};
const getShippingLabelUrl = (order) =>
  safe(
    order?.shipment?.shiprocket?.labelUrl ||
    order?.shipment?.shiprocket?.label_url ||
    order?.shipment?.labelUrl ||
    order?.shipment?.label_url ||
    order?.shippingLabelUrl ||
    order?.labelUrl ||
    order?.trackingDetails?.labelUrl
  );

const createConfirmationMessage = (order = {}) => `Hi ${getCustomerName(order)},

Welcome to *OATCLUB*

Before we process your order, please confirm the details below:

*Order:* #${getOrderNumber(order)}
*Product:* ${getItemSummary(order)}
*Final Payable:* ${formatCurrency(getFinalPayable(order))}
*Payment:* ${getPaymentLabel(order)}

Each order is carefully quality-checked before dispatch and will be shipped within *7 business days*.

Please reply with:

*YES* – Confirm my order
*NO* – Cancel my order

Thank you for choosing *OATCLUB*.

*Team OATCLUB*
Own All Trends`;

const createShippingMessage = (order = {}) => {
  const {
    awb,
    courierName,
    trackingUrl,
  } = getShippingDetails(order);

  return `Hi ${getCustomerName(order)},

Great news! 🎉

Your *OATCLUB* order *#${getOrderNumber(order)}* has been shipped and is on its way.

*Shipping Details*
Courier: *${courierName || "Assigned Courier"}*
AWB: *${awb || "Available shortly"}*

*Track your order:*
${trackingUrl || "Tracking link will be updated shortly."}

Please keep your phone available for courier and delivery updates.

Thank you for shopping with *OATCLUB*. We can't wait for you to receive your order!

*Team OATCLUB*
Own All Trends`;
};

const createWhatsAppLink = (order, type) => {
  const phone = normalizeWhatsAppPhone(
    getCustomerPhone(order)
  );

  if (!phone) return "";

  const message =
    type === "shipping"
      ? createShippingMessage(order)
      : createConfirmationMessage(order);

  return `https://wa.me/${phone}?text=${encodeURIComponent(
    message
  )}`;
};

export default function OrderRowActions({
  order,
  courierName = "",
  trackingId = "",
  onRefresh,
  onUpdated,
  openUp = false,
}) {
  const menuRef = useRef(null);
  const menuPanelRef = useRef(null);
  const triggerRef = useRef(null);
  const invoiceRef = useRef(null);

  const fetchInvoiceByOrderNumber = useOrderStore(
    (state) => state.fetchInvoiceByOrderNumber
  );

  const fetchInvoiceByOrderId = useOrderStore(
    (state) => state.fetchInvoiceByOrderId
  );

  const markOrderAsInfluencer = useOrderStore(
    (state) => state.markOrderAsInfluencer
  );

  const markOrderAsTesting = useOrderStore(
    (state) => state.markOrderAsTesting,
  );

  const confirmOrder = useOrderStore(
    (state) => state.confirmOrder
  );

  const splitOrderIntoShipments = useOrderStore(
    (state) => state.splitOrderIntoShipments,
  );

  const syncTracking = useShiprocketStore(
    (state) => state.syncTracking
  );

  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [splitLoading, setSplitLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] =
    useState(false);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const [
    influencerLoading,
    setInfluencerLoading,
  ] = useState(false);

  const [syncing, setSyncing] = useState(false);

  const [pendingInvoiceAction, setPendingInvoiceAction] =
    useState(null);

  const [isConfirmed, setIsConfirmed] = useState(
    order?.isConfirmed === true
  );

  const [isInfluencerOrder, setIsInfluencerOrder] =
    useState(order?.isInfluencerOrder === true);

  const [testingLoading, setTestingLoading] = useState(false);

  const [isTestingOrder, setIsTestingOrder] = useState(
    order?.isTestingOrder === true,
  );

  const orderId = safe(order?._id || order?.id);
  const orderNumber = safe(order?.orderNumber);

  const invoiceTitle =
    orderNumber || orderId || "order";

  const shippingLabelUrl = getShippingLabelUrl(order);
  const hasShippingLabel = Boolean(shippingLabelUrl);

  const whatsappPhone = normalizeWhatsAppPhone(
    getCustomerPhone(order)
  );

  const hasWhatsAppPhone = Boolean(whatsappPhone);

  const {
    awb: shippingAwb,
    trackingUrl: shippingTrackingUrl,
  } = getShippingDetails(order);

  const fulfillmentStatus = safe(
    order?.fulfillmentStatus
  ).toLowerCase();

  const splitAvailable = canSplitOrder(order);
  const testingAvailable = canMarkAsTestingOrder(order);
  const isSplitParent =
    safe(order?.orderType).toLowerCase() === "parent";

  const canSendShippingMessage =
    hasWhatsAppPhone &&
    Boolean(shippingAwb || shippingTrackingUrl) &&
    [
      "packed",
      "picked",
      "shipped",
      "out_for_delivery",
      "delivered",
    ].includes(fulfillmentStatus);

  useEffect(() => {
    setIsConfirmed(order?.isConfirmed === true);
  }, [order?.isConfirmed]);

  useEffect(() => {
    setIsInfluencerOrder(
      order?.isInfluencerOrder === true
    );
  }, [order?.isInfluencerOrder]);

  useEffect(() => {
    setIsTestingOrder(order?.isTestingOrder === true);
  }, [order?.isTestingOrder]);

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,

    documentTitle: `Invoice-${invoiceTitle}`,

    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const loadInvoice = useCallback(async () => {
    if (!orderNumber && !orderId) {
      throw new Error(
        "Order number or order ID is missing."
      );
    }

    const result = orderNumber
      ? await fetchInvoiceByOrderNumber(
        orderNumber,
        {
          silent: true,
        }
      )
      : await fetchInvoiceByOrderId(orderId, {
        silent: true,
      });

    if (!result) {
      throw new Error(
        "Backend did not return invoice data."
      );
    }

    return {
      ...result,

      courier: {
        ...(result?.courier || {}),

        name:
          safe(result?.courier?.name) ||
          safe(result?.courier?.courierName) ||
          safe(courierName) ||
          "-",

        courierName:
          safe(result?.courier?.courierName) ||
          safe(result?.courier?.name) ||
          safe(courierName) ||
          "-",

        awb:
          safe(result?.courier?.awb) ||
          safe(result?.courier?.trackingId) ||
          safe(trackingId) ||
          "-",

        trackingId:
          safe(result?.courier?.trackingId) ||
          safe(result?.courier?.awb) ||
          safe(trackingId) ||
          "-",
      },
    };
  }, [
    orderNumber,
    orderId,
    courierName,
    trackingId,
    fetchInvoiceByOrderNumber,
    fetchInvoiceByOrderId,
  ]);

  const prepareInvoice = async (action) => {
    if (invoiceLoading) return;

    setOpen(false);
    setError("");
    setInvoiceLoading(true);
    setPendingInvoiceAction(action);

    try {
      const result = await loadInvoice();
      setInvoice(result);
    } catch (fetchError) {
      console.error(
        "OrderRowActions invoice error:",
        fetchError
      );

      const message =
        fetchError?.message ||
        "Failed to load invoice.";

      setError(message);
      setPendingInvoiceAction(null);
      toast.error(message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    prepareInvoice("print");
  };

  const handleDownloadInvoice = () => {
    prepareInvoice("download");
  };

  useEffect(() => {
    if (!invoice || !pendingInvoiceAction) {
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        // Print Invoice
        if (pendingInvoiceAction === "print") {
          printInvoice?.();
          return;
        }

        // Direct Download Invoice
        if (pendingInvoiceAction === "download") {
          const element = invoiceRef.current;

          if (!element) {
            throw new Error("Invoice content is not ready.");
          }

          const [canvasModule, pdfModule] =
            await Promise.all([
              import("html2canvas-pro"),
              import("jspdf"),
            ]);

          const html2canvas =
            canvasModule.default || canvasModule;

          const jsPDF =
            pdfModule.jsPDF ||
            pdfModule.default?.jsPDF ||
            pdfModule.default;

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
          });

          const imageData = canvas.toDataURL(
            "image/jpeg",
            0.98
          );

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true,
          });

          const pageWidth =
            pdf.internal.pageSize.getWidth();

          const pageHeight =
            pdf.internal.pageSize.getHeight();

          const margin = 8;
          const usableWidth =
            pageWidth - margin * 2;

          const renderedHeight =
            (canvas.height * usableWidth) /
            canvas.width;

          const usablePageHeight =
            pageHeight - margin * 2;

          let remainingHeight = renderedHeight;
          let position = margin;

          pdf.addImage(
            imageData,
            "JPEG",
            margin,
            position,
            usableWidth,
            renderedHeight,
            undefined,
            "FAST"
          );

          remainingHeight -= usablePageHeight;

          while (remainingHeight > 0) {
            pdf.addPage();

            position =
              margin -
              (renderedHeight - remainingHeight);

            pdf.addImage(
              imageData,
              "JPEG",
              margin,
              position,
              usableWidth,
              renderedHeight,
              undefined,
              "FAST"
            );

            remainingHeight -= usablePageHeight;
          }

          pdf.save(`Invoice-${invoiceTitle}.pdf`);

          toast.success(
            "Invoice downloaded successfully"
          );
        }
      } catch (invoiceError) {
        console.error(
          "Invoice action error:",
          invoiceError
        );

        toast.error(
          invoiceError?.message ||
          "Failed to download invoice"
        );
      } finally {
        setPendingInvoiceAction(null);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    invoice,
    invoiceTitle,
    pendingInvoiceAction,
    printInvoice,
  ]);
  const handleConfirmOrder = async () => {
    if (
      !orderId ||
      confirmLoading ||
      isConfirmed
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Confirm order ${orderNumber || ""}?`
    );

    if (!confirmed) return;

    setOpen(false);
    setConfirmLoading(true);

    const previousValue = isConfirmed;

    setIsConfirmed(true);

    try {
      await confirmOrder(orderId);

      toast.success("Order confirmed successfully");

      await onRefresh?.();
    } catch (confirmError) {
      console.error(
        "Order confirmation error:",
        confirmError
      );

      setIsConfirmed(previousValue);

      toast.error(
        confirmError?.message ||
        "Failed to confirm order"
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleTestingOrderToggle = async () => {
    if (!orderId || testingLoading || !testingAvailable) return;

    const previousValue = isTestingOrder;
    const nextValue = !previousValue;

    setOpen(false);
    setTestingLoading(true);
    setIsTestingOrder(nextValue);

    try {
      const updatedOrder = await markOrderAsTesting(orderId, nextValue);

      if (updatedOrder) {
        onUpdated?.(updatedOrder);
      }
      toast.success(
        nextValue
          ? "Marked as testing order"
          : "Removed from testing orders",
      );

      await onRefresh?.();
    } catch (error) {
      console.error("Testing order update error:", error);

      setIsTestingOrder(previousValue);

      toast.error(
        error?.message || "Failed to update testing order",
      );
    } finally {
      setTestingLoading(false);
    }
  };

  const handleSplitOrder = async () => {
    if (!orderId || splitLoading || !splitAvailable) {
      return;
    }

    let shipments;

    try {
      shipments = buildTwoWayOrderSplit(order);
    } catch (splitError) {
      toast.error(splitError?.message || "Order cannot be split");
      return;
    }

    const shipmentASummary = shipments[0]?.items
      ?.map((item) => {
        const orderItem = getItems(order).find(
          (currentItem) =>
            safe(currentItem?.lineId) === safe(item?.lineId),
        );

        return `${getItemTitle(orderItem)} × ${item.quantity}`;
      })
      .join(", ");

    const shipmentBSummary = shipments[1]?.items
      ?.map((item) => {
        const orderItem = getItems(order).find(
          (currentItem) =>
            safe(currentItem?.lineId) === safe(item?.lineId),
        );

        return `${getItemTitle(orderItem)} × ${item.quantity}`;
      })
      .join(", ");

    const confirmed = window.confirm(
      `Split order ${orderNumber}?\n\n` +
      `${orderNumber}-A: ${shipmentASummary}\n` +
      `${orderNumber}-B: ${shipmentBSummary}\n\n` +
      `The original order will become the parent order.`,
    );

    if (!confirmed) return;

    setOpen(false);
    setSplitLoading(true);

    try {
      const result = await splitOrderIntoShipments(
        orderId,
        shipments,
      );

      toast.success(
        `Order split into ${orderNumber}-A and ${orderNumber}-B`,
      );

      if (result?.parent) {
        onUpdated?.(result.parent);
      }

      await onRefresh?.();
    } catch (splitError) {
      console.error("Split order error:", splitError);

      toast.error(
        splitError?.message || "Failed to split order",
      );
    } finally {
      setSplitLoading(false);
    }
  };

  const handleWhatsAppConfirmation = () => {
    const whatsappLink = createWhatsAppLink(
      order,
      "confirmation"
    );

    if (!whatsappLink) {
      toast.error(
        "Valid customer WhatsApp number is unavailable"
      );
      return;
    }

    window.open(
      whatsappLink,
      "_blank",
      "noopener,noreferrer"
    );

    setOpen(false);
    toast.success("Confirmation message opened");
  };

  const handleWhatsAppShipping = () => {
    const whatsappLink = createWhatsAppLink(
      order,
      "shipping"
    );

    if (!whatsappLink) {
      toast.error(
        "Valid customer WhatsApp number is unavailable"
      );
      return;
    }

    window.open(
      whatsappLink,
      "_blank",
      "noopener,noreferrer"
    );

    setOpen(false);
    toast.success("Shipping message opened");
  };

  const handleInfluencerToggle = async () => {
    if (!orderId || influencerLoading) return;

    const previousValue = isInfluencerOrder;
    const nextValue = !previousValue;

    setOpen(false);
    setInfluencerLoading(true);
    setIsInfluencerOrder(nextValue);

    try {
      await markOrderAsInfluencer(
        orderId,
        nextValue
      );

      toast.success(
        nextValue
          ? "Marked as influencer order"
          : "Removed from influencer orders"
      );

      await onRefresh?.();
    } catch (updateError) {
      console.error(
        "Influencer order update error:",
        updateError
      );

      setIsInfluencerOrder(previousValue);

      toast.error(
        updateError?.message ||
        "Failed to update influencer order"
      );
    } finally {
      setInfluencerLoading(false);
    }
  };

  const handleSyncOrder = async () => {
    if ((!orderId && !orderNumber) || syncing) return;

    setOpen(false);
    setSyncing(true);

    try {
      const result = await syncTracking({
        orderId,
        orderNumber,
      });

      const updatedOrder =
        result?.order ||
        result?.data?.order ||
        result?.updatedOrder ||
        null;

      if (updatedOrder) {
        onUpdated?.(updatedOrder);
      }

      toast.success("Order tracking synced");

      await onRefresh?.();
    } catch (syncError) {
      console.error(
        "Order tracking sync error:",
        syncError
      );

      toast.error(
        syncError?.message ||
        "Failed to sync order tracking"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handlePrintShippingLabel = () => {
    if (!hasShippingLabel) return;

    window.open(
      shippingLabelUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setOpen(false);
  };

  const handleDownloadShippingLabel = () => {
    if (!hasShippingLabel) return;

    const anchor = document.createElement("a");
    anchor.href = shippingLabelUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = `Shipping-Label-${orderNumber || orderId || "order"
      }.pdf`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setOpen(false);
  };

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 256;
    const gap = 8;
    const viewportPadding = 8;
    const measuredHeight = menuPanelRef.current?.offsetHeight || 420;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding
    );

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const shouldOpenUp =
      openUp || (spaceBelow < Math.min(measuredHeight, 420) && spaceAbove > spaceBelow);

    const preferredTop = shouldOpenUp
      ? rect.top - measuredHeight - gap
      : rect.bottom + gap;

    const top = Math.min(
      Math.max(viewportPadding, preferredTop),
      Math.max(viewportPadding, window.innerHeight - measuredHeight - viewportPadding)
    );

    setMenuPosition({ top, left });
  }, [openUp]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const reposition = () => updateMenuPosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedTrigger = menuRef.current?.contains(event.target);
      const clickedMenu = menuPanelRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  if (!order) return null;

  const isBusy =
    invoiceLoading ||
    Boolean(pendingInvoiceAction) ||
    confirmLoading ||
    splitLoading ||
    influencerLoading ||
    testingLoading ||
    syncing;

  return (
    <>
      <div
        ref={menuRef}
        className="relative"
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() =>
            setOpen((current) => !current)
          }
          disabled={isBusy}
          title="Order actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <MoreVertical size={18} />
          )}
        </button>

        {open && typeof document !== "undefined" && createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[9999] w-64 max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >            {/* Confirm Order */}

            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={
                isBusy ||
                !orderId ||
                isConfirmed
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {confirmLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2
                    size={15}
                    className={
                      isConfirmed
                        ? "text-emerald-600"
                        : "text-zinc-600"
                    }
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {isConfirmed
                      ? "Order Confirmed"
                      : "Confirm Order"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {isConfirmed
                      ? "Customer order is confirmed"
                      : "Approve order for processing"}
                  </div>
                </div>
              </div>

              {isConfirmed && (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">
                  DONE
                </span>
              )}
            </button>

            {/* Split Order */}

            <button
              type="button"
              onClick={handleSplitOrder}
              disabled={
                isBusy ||
                !orderId ||
                !splitAvailable ||
                isSplitParent
              }
              title={
                isSplitParent
                  ? "Order is already split"
                  : splitAvailable
                    ? "Split order into A and B shipments"
                    : "Order cannot be split"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                {splitLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Split
                    size={15}
                    className="text-violet-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {splitLoading
                      ? "Splitting Order..."
                      : isSplitParent
                        ? "Order Split"
                        : "Split Order"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {isSplitParent
                      ? "Ship child orders separately"
                      : "Create A and B shipments"}
                  </div>
                </div>
              </div>

              {isSplitParent && (
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-700">
                  DONE
                </span>
              )}
            </button>

            {/* WhatsApp Confirmation */}

            <button
              type="button"
              onClick={handleWhatsAppConfirmation}
              disabled={isBusy || !hasWhatsAppPhone}
              title={
                hasWhatsAppPhone
                  ? "Send order confirmation message"
                  : "Customer WhatsApp number is unavailable"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <MessageCircle
                  size={15}
                  className="text-emerald-600"
                />

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    WhatsApp Confirmation
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {hasWhatsAppPhone
                      ? "Send order confirmation request"
                      : "Phone number unavailable"}
                  </div>
                </div>
              </div>

              {!hasWhatsAppPhone && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-500">
                  UNAVAILABLE
                </span>
              )}
            </button>

            {/* WhatsApp Shipped */}

            <button
              type="button"
              onClick={handleWhatsAppShipping}
              disabled={isBusy || !canSendShippingMessage}
              title={
                canSendShippingMessage
                  ? "Send shipped order message"
                  : "Shipping or tracking details are unavailable"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <Truck
                  size={15}
                  className="text-blue-600"
                />

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    WhatsApp Shipped
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {canSendShippingMessage
                      ? "Send courier and tracking details"
                      : "Tracking details unavailable"}
                  </div>
                </div>
              </div>

              {!canSendShippingMessage && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-500">
                  UNAVAILABLE
                </span>
              )}
            </button>

            <MenuDivider />

            {/* Print Invoice */}

            <button
              type="button"
              onClick={handlePrintInvoice}
              disabled={isBusy}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {invoiceLoading &&
                pendingInvoiceAction === "print" ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Printer
                  size={15}
                  className="text-zinc-600"
                />
              )}

              <div>
                <div className="text-xs font-bold text-zinc-800">
                  Print Invoice
                </div>

                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Open printable invoice
                </div>
              </div>
            </button>

            {/* Download Invoice */}

            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={isBusy}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {invoiceLoading &&
                pendingInvoiceAction ===
                "download" ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Download
                  size={15}
                  className="text-zinc-600"
                />
              )}

              <div>
                <div className="text-xs font-bold text-zinc-800">
                  Download Invoice
                </div>

                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Download Invoice (PDF)                </div>
              </div>
            </button>

            <MenuDivider />

            {/* Sync Order */}

            <button
              type="button"
              onClick={handleSyncOrder}
              disabled={
                isBusy ||
                (!orderId && !orderNumber)
              }
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={15}
                  className="text-zinc-600"
                />
              )}

              <div>
                <div className="text-xs font-bold text-zinc-800">
                  {syncing
                    ? "Syncing Order..."
                    : "Sync Order"}
                </div>

                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Refresh Shiprocket tracking
                </div>
              </div>
            </button>

            {/* Print Shipping Label */}

            <button
              type="button"
              onClick={handlePrintShippingLabel}
              disabled={isBusy || !hasShippingLabel}
              title={
                hasShippingLabel
                  ? "Open shipping label for printing"
                  : "Shipping label is not available"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <Truck
                  size={15}
                  className="text-zinc-600"
                />

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    Print Shipping Label
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {hasShippingLabel
                      ? "Open label in a new tab"
                      : "Label not generated"}
                  </div>
                </div>
              </div>

              {!hasShippingLabel && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-500">
                  UNAVAILABLE
                </span>
              )}
            </button>

            {/* Download Shipping Label */}

            <button
              type="button"
              onClick={handleDownloadShippingLabel}
              disabled={isBusy || !hasShippingLabel}
              title={
                hasShippingLabel
                  ? "Download shipping label"
                  : "Shipping label is not available"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <PackageOpen
                  size={15}
                  className="text-zinc-600"
                />

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    Download Shipping Label
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {hasShippingLabel
                      ? "Download courier label"
                      : "Label not generated"}
                  </div>
                </div>
              </div>

              {!hasShippingLabel && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-500">
                  UNAVAILABLE
                </span>
              )}
            </button>

            <MenuDivider />

            {/* Influencer */}

            <button
              type="button"
              onClick={handleInfluencerToggle}
              disabled={isBusy || !orderId}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {influencerLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : isInfluencerOrder ? (
                  <BadgeCheck
                    size={15}
                    className="text-emerald-600"
                  />
                ) : (
                  <Megaphone
                    size={15}
                    className="text-zinc-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {isInfluencerOrder
                      ? "Remove Influencer Tag"
                      : "Mark as Influencer"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {isInfluencerOrder
                      ? "Include in normal reports"
                      : "Exclude from reconciliation"}
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold ${isInfluencerOrder
                  ? "bg-black text-white"
                  : "bg-zinc-100 text-zinc-500"
                  }`}
              >
                {isInfluencerOrder
                  ? "ACTIVE"
                  : "OFF"}
              </span>
            </button>

            {/* Testing Order */}

            <button
              type="button"
              onClick={handleTestingOrderToggle}
              disabled={isBusy || !orderId || !testingAvailable}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {testingLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : isTestingOrder ? (
                  <BadgeCheck size={15} className="text-amber-600" />
                ) : (
                  <AlertCircle size={15} className="text-zinc-600" />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {isTestingOrder
                      ? "Remove Testing Order"
                      : "Mark as Testing Order"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {isTestingOrder
                      ? "Treat as a normal order"
                      : "Exclude from reports and operations"}
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold ${isTestingOrder
                  ? "bg-amber-500 text-white"
                  : "bg-zinc-100 text-zinc-500"
                  }`}
              >
                {isTestingOrder ? "TESTING" : "NORMAL"}
              </span>
            </button>
          </div>,
          document.body
        )}

        {error && (
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-red-200 bg-red-50 p-3 shadow-lg">
            <div className="flex items-start gap-2 text-xs text-red-800">
              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div>{error}</div>

                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="inline-flex items-center gap-1 font-bold hover:underline"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="font-bold hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable invoice */}

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: "210mm",
          background: "#ffffff",
          pointerEvents: "none",
        }}
      >
        <div
          ref={invoiceRef}
          style={{
            width: "210mm",
            background: "#ffffff",
          }}
        >
          {invoice ? (
            <InvoiceTemplate data={invoice} />
          ) : null}
        </div>
      </div>
    </>
  );
}

function MenuDivider() {
  return (
    <div className="mx-3 my-1 h-px bg-zinc-100" />
  );
}
