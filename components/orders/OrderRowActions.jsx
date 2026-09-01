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
  Ban,
  CheckCircle2,
  Download,
  Loader2,
  Megaphone,
  MoreVertical,
  PackageOpen,
  Copy,
  Printer,
  RefreshCw,
  Truck,
  MessageCircle,
  Split,
  Mail,
} from "lucide-react";

import {
  canSplitOrder,
  canMarkAsTestingOrder,
  canSendPaymentRecoveryEmail,
  canSendPaymentRecoveryWhatsApp,
  canSendPrepaidConfirmation,
  canSendPrepaidConfirmationEmail,
  canSendPrepaidConfirmationWhatsApp,
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


const createPaymentRecoveryMessage = (order = {}) => {
  const items = getItems(order);

  const totalQuantity = items.reduce(
    (sum, item) => sum + Math.max(1, Number(item?.quantity || 1)),
    0,
  );

  const itemLabel = totalQuantity > 1 ? "items are" : "item is";

  return `Hi ${getCustomerName(order)},

  Welcome to *OATCLUB*.

  We noticed that your payment for the order below was not successful, so your order is currently not confirmed.

  *Order:* #${getOrderNumber(order)}
  *Product:* ${getItemSummary(order)}

  *Amount Payable:* ${formatCurrency(getFinalPayable(order))}
  *Payment Status:* ❌ Failed

  Your selected ${itemLabel} currently reserved for a limited time.

  If you would still like to place this order, please visit *https://oatclub.in* and complete your purchase.

  Once your payment is received, your order will be carefully quality-checked and dispatched within *7 business days*.

  Please reply with:

  *YES* – I want to complete the payment and confirm my order.
  *NO* – Cancel my order.

  Website: https://oatclub.in

  Thank you for choosing *OATCLUB*.

  *Team OATCLUB*
  Own All Trends`;
};



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
  const phone = normalizeWhatsAppPhone(getCustomerPhone(order));

  if (!phone) return "";

  let message;

  if (type === "shipping") {
    message = createShippingMessage(order);
  } else if (type === "payment_recovery") {
    message = createPaymentRecoveryMessage(order);
  } else {
    message = createConfirmationMessage(order);
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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

  const cloneOrder = useOrderStore(
    (state) => state.cloneOrder
  );

  const splitOrderIntoShipments = useOrderStore(
    (state) => state.splitOrderIntoShipments,
  );

  const sendOrderPaymentRecoveryEmail = useOrderStore(
    (state) => state.sendOrderPaymentRecoveryEmail,
  );

  const resendPrepaidConfirmation = useOrderStore(
    (state) => state.resendPrepaidConfirmation,
  );

  const cancelChildOrder = useOrderStore(
    (state) => state.cancelChildOrder
  );

  const syncTracking = useShiprocketStore(
    (state) => state.syncTracking
  );

  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitRows, setSplitRows] = useState([]);
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
  const [paymentRecoveryLoading, setPaymentRecoveryLoading] =
    useState(false);

  const [isTestingOrder, setIsTestingOrder] = useState(
    order?.isTestingOrder === true,
  );
  const [prepaidConfirmationLoading, setPrepaidConfirmationLoading] =
    useState(false);

  const [
    childCancelLoading,
    setChildCancelLoading,
  ] = useState(false);

  const [cloneLoading, setCloneLoading] =
    useState(false);

  const prepaidConfirmationAvailable =
    canSendPrepaidConfirmation(order);

  const prepaidConfirmationEmailAvailable =
    canSendPrepaidConfirmationEmail(order);

  const prepaidConfirmationWhatsAppAvailable =
    canSendPrepaidConfirmationWhatsApp(order);

  const orderId = safe(order?._id || order?.id);
  const orderNumber = safe(order?.orderNumber);
  const isChildOrder = Boolean(
    order?.parentOrderId ||
    order?.splitSuffix ||
    (
      String(order?.orderNumber || "").match(/-[A-Z]$/i) &&
      order?.isExchangeOrder !== true &&
      String(order?.paymentMethod || "").toLowerCase() !== "exchange"
    )
  );

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
  const paymentRecoveryEmailAvailable =
    canSendPaymentRecoveryEmail(order);

  const paymentRecoveryWhatsAppAvailable =
    canSendPaymentRecoveryWhatsApp(order);

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

  const handlePrepaidConfirmation = async () => {
    if (
      !orderId ||
      prepaidConfirmationLoading ||
      !prepaidConfirmationAvailable
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Resend prepaid confirmation for order ${orderNumber || orderId
      }?`
    );

    if (!confirmed) return;

    setOpen(false);
    setPrepaidConfirmationLoading(true);

    try {
      const result =
        await resendPrepaidConfirmation(orderId);

      toast.success(
        result?.message ||
        "Confirmation email & WhatsApp triggered"
      );
    } catch (error) {
      console.error(
        "Prepaid confirmation error:",
        error
      );

      toast.error(
        error?.message ||
        "Failed to send prepaid confirmation"
      );
    } finally {
      setPrepaidConfirmationLoading(false);
    }
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

  const handleCloneOrder = async () => {
    if (!orderId || cloneLoading) return;

    const confirmed = window.confirm(
      `Clone order ${orderNumber || orderId}?\n\nA new independent order copy will be created.`
    );

    if (!confirmed) return;

    setOpen(false);
    setCloneLoading(true);

    try {
      const clonedOrder = await cloneOrder(orderId);

      if (!clonedOrder?._id) {
        throw new Error("Clone order was not returned");
      }

      toast.success(
        `Order cloned as ${clonedOrder.orderNumber}`
      );

      await onRefresh?.();

      if (typeof window !== "undefined") {
        window.open(
          `/orders/${clonedOrder._id}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (error) {
      console.error("Clone order error:", error);

      toast.error(
        error?.message || "Failed to clone order"
      );
    } finally {
      setCloneLoading(false);
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

  const handleSplitOrder = () => {
    if (!orderId || splitLoading || !splitAvailable) return;

    const items = getItems(order);

    if (!items.length) {
      toast.error("Order has no items to split");
      return;
    }

    const rows = items.map((item) => ({
      lineId: safe(item?.lineId),
      title: getItemTitle(item),
      size: getItemSize(item),
      thumbnail:
        item?.productSnapshot?.thumbnail ||
        item?.thumbnail ||
        "",
      price: Number(item?.price || 0),
      quantity: Math.max(
        1,
        Number(item?.quantity || 1),
      ),
      shipmentAQty: 0,
    }));

    if (rows.some((row) => !row.lineId)) {
      toast.error("Some order items are missing lineId");
      return;
    }

    setSplitRows(rows);
    setOpen(false);
    setSplitModalOpen(true);
  };

  const updateShipmentAQty = (lineId, value) => {
    setSplitRows((current) =>
      current.map((row) => {
        if (row.lineId !== lineId) return row;

        const requested = Number(value);

        const quantity = Math.max(
          0,
          Math.min(
            row.quantity,
            Number.isFinite(requested)
              ? requested
              : 0,
          ),
        );

        return {
          ...row,
          shipmentAQty: Math.floor(quantity),
        };
      }),
    );
  };

  const assignAllToA = (lineId) => {
    setSplitRows((current) =>
      current.map((row) =>
        row.lineId === lineId
          ? {
            ...row,
            shipmentAQty: row.quantity,
          }
          : row,
      ),
    );
  };

  const assignAllToB = (lineId) => {
    setSplitRows((current) =>
      current.map((row) =>
        row.lineId === lineId
          ? {
            ...row,
            shipmentAQty: 0,
          }
          : row,
      ),
    );
  };

  const getManualSplitPreview = () => {
    const shipmentAItems = [];
    const shipmentBItems = [];

    let shipmentASubtotal = 0;
    let shipmentBSubtotal = 0;

    let shipmentAQuantity = 0;
    let shipmentBQuantity = 0;

    for (const row of splitRows) {
      const aQty = Math.max(
        0,
        Math.min(
          row.quantity,
          Number(row.shipmentAQty || 0),
        ),
      );

      const bQty = row.quantity - aQty;

      if (aQty > 0) {
        shipmentAItems.push({
          lineId: row.lineId,
          quantity: aQty,
        });

        shipmentAQuantity += aQty;
        shipmentASubtotal += row.price * aQty;
      }

      if (bQty > 0) {
        shipmentBItems.push({
          lineId: row.lineId,
          quantity: bQty,
        });

        shipmentBQuantity += bQty;
        shipmentBSubtotal += row.price * bQty;
      }
    }

    const parentSubtotal =
      Number(order?.subtotal || 0);

    const parentFinalPayable =
      Number(order?.finalPayable || 0);

    const aRatio =
      parentSubtotal > 0
        ? shipmentASubtotal / parentSubtotal
        : 0;

    const estimatedAPayable =
      Math.round(
        parentFinalPayable * aRatio,
      );

    const estimatedBPayable =
      parentFinalPayable -
      estimatedAPayable;

    return {
      shipmentAItems,
      shipmentBItems,

      shipmentAQuantity,
      shipmentBQuantity,

      shipmentASubtotal,
      shipmentBSubtotal,

      estimatedAPayable,
      estimatedBPayable,
    };
  };

  const confirmManualSplit = async () => {
    if (
      !orderId ||
      splitLoading ||
      !splitAvailable
    ) {
      return;
    }

    const preview = getManualSplitPreview();

    if (!preview.shipmentAItems.length) {
      toast.error(
        "Shipment A must contain at least one item",
      );
      return;
    }

    if (!preview.shipmentBItems.length) {
      toast.error(
        "Shipment B must contain at least one item",
      );
      return;
    }

    const shipments = [
      {
        suffix: "A",
        items: preview.shipmentAItems,
      },
      {
        suffix: "B",
        items: preview.shipmentBItems,
      },
    ];

    setSplitLoading(true);

    try {
      const result =
        await splitOrderIntoShipments(
          orderId,
          shipments,
        );

      setSplitModalOpen(false);
      setSplitRows([]);

      toast.success(
        `Order split into ${orderNumber}-A and ${orderNumber}-B`,
      );

      if (result?.parent) {
        onUpdated?.(result.parent);
      }

      await onRefresh?.();
    } catch (splitError) {
      console.error(
        "Manual split order error:",
        splitError,
      );

      toast.error(
        splitError?.message ||
        "Failed to split order",
      );
    } finally {
      setSplitLoading(false);
    }
  };

  const handlePaymentRecoveryEmail = async () => {
    if (
      !orderId ||
      paymentRecoveryLoading ||
      !paymentRecoveryEmailAvailable
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Send payment recovery email for order ${orderNumber || orderId
      }?`,
    );

    if (!confirmed) return;

    setOpen(false);
    setPaymentRecoveryLoading(true);

    try {
      const result =
        await sendOrderPaymentRecoveryEmail(orderId);

      toast.success(
        result?.message ||
        "Payment recovery email sent successfully",
      );
    } catch (error) {
      console.error(
        "Payment recovery email error:",
        error,
      );

      toast.error(
        error?.message ||
        "Failed to send payment recovery email",
      );
    } finally {
      setPaymentRecoveryLoading(false);
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

  const handleWhatsAppPaymentRecovery = () => {
    if (!paymentRecoveryWhatsAppAvailable) {
      toast.error(
        "This order is not eligible for WhatsApp payment recovery",
      );
      return;
    }

    const whatsappLink = createWhatsAppLink(
      order,
      "payment_recovery",
    );

    if (!whatsappLink) {
      toast.error(
        "Valid customer WhatsApp number is unavailable",
      );
      return;
    }

    window.open(
      whatsappLink,
      "_blank",
      "noopener,noreferrer",
    );

    setOpen(false);
    toast.success("Payment recovery message opened");
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

  const handleCancelChildOrder = async () => {
    if (
      !orderId ||
      !isChildOrder ||
      childCancelLoading
    ) {
      return;
    }

    const status = safe(
      order?.fulfillmentStatus
    ).toLowerCase();

    if (status === "cancelled") {
      toast.error(
        "Child order is already cancelled"
      );
      return;
    }

    const confirmed = window.confirm(
      `Cancel child order ${orderNumber}?\n\nOnly this shipment will be cancelled. Parent and sibling shipments will remain unchanged.`
    );

    if (!confirmed) return;

    const reason =
      window.prompt(
        "Cancellation reason:",
        "Cancelled by admin"
      ) || "Cancelled by admin";

    setOpen(false);
    setChildCancelLoading(true);

    try {
      const updatedOrder =
        await cancelChildOrder(
          orderId,
          reason
        );

      if (updatedOrder) {
        onUpdated?.(updatedOrder);
      }

      toast.success(
        `${orderNumber} cancelled successfully`
      );

      await onRefresh?.();
    } catch (error) {
      console.error(
        "Child cancellation failed:",
        error
      );

      toast.error(
        error?.message ||
        "Failed to cancel child order"
      );
    } finally {
      setChildCancelLoading(false);
    }
  };

  const isBusy =
    invoiceLoading ||
    Boolean(pendingInvoiceAction) ||
    confirmLoading ||
    cloneLoading ||
    splitLoading ||
    influencerLoading ||
    testingLoading ||
    paymentRecoveryLoading ||
    prepaidConfirmationLoading ||
    syncing ||
    childCancelLoading;

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

            {/* Clone Order */}

            <button
              type="button"
              onClick={handleCloneOrder}
              disabled={isBusy || !orderId}
              title="Create a copy of this order"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                {cloneLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin text-blue-600"
                  />
                ) : (
                  <Copy
                    size={15}
                    className="text-blue-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {cloneLoading
                      ? "Cloning Order..."
                      : "Clone Order"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    Create independent order copy
                  </div>
                </div>
              </div>
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




{isChildOrder && (
  <>
    <MenuDivider />

    <button
      type="button"
      onClick={handleCancelChildOrder}
      disabled={
        isBusy ||
        !orderId ||
        fulfillmentStatus === "cancelled" ||
        [
          "picked",
          "shipped",
          "out_for_delivery",
          "delivered",
          "rto",
          "returned",
          "refunded",
        ].includes(fulfillmentStatus)
      }
      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex items-center gap-3">
        {childCancelLoading ? (
          <Loader2
            size={15}
            className="animate-spin text-red-600"
          />
        ) : (
          <Ban
            size={15}
            className="text-red-600"
          />
        )}

        <div>
          <div className="text-xs font-bold text-red-700">
            {fulfillmentStatus ===
            "cancelled"
              ? "Child Cancelled"
              : "Cancel Child Order"}
          </div>

          <div className="mt-0.5 text-[10px] text-zinc-500">
            Only cancel shipment{" "}
            {orderNumber}
          </div>
        </div>
      </div>

      {fulfillmentStatus ===
        "cancelled" && (
        <span className="rounded-full bg-red-100 px-2 py-1 text-[9px] font-bold text-red-700">
          DONE
        </span>
      )}
    </button>
  </>
)}

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

            {/* WhatsApp Payment Recovery */}

            <button
              type="button"
              onClick={handleWhatsAppPaymentRecovery}
              disabled={
                isBusy ||
                !hasWhatsAppPhone ||
                !paymentRecoveryWhatsAppAvailable
              }
              title={
                paymentRecoveryWhatsAppAvailable
                  ? "Send failed payment recovery message"
                  : "Only pending or failed prepaid orders are eligible"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <MessageCircle
                  size={15}
                  className="text-amber-600"
                />

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    WhatsApp Payment Recovery
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {paymentRecoveryWhatsAppAvailable
                      ? "Help customer complete failed payment"
                      : "Not eligible for payment recovery"}
                  </div>
                </div>
              </div>

              {!paymentRecoveryWhatsAppAvailable && (
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

            {/* Payment Recovery Email */}

            <button
              type="button"
              onClick={handlePaymentRecoveryEmail}
              disabled={
                isBusy ||
                !orderId ||
                !paymentRecoveryEmailAvailable
              }
              title={
                paymentRecoveryEmailAvailable
                  ? "Send payment recovery email"
                  : "Only pending or failed online-payment orders are eligible"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                {paymentRecoveryLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Mail
                    size={15}
                    className="text-amber-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {paymentRecoveryLoading
                      ? "Sending Recovery Email..."
                      : "Payment Recovery Email"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {paymentRecoveryEmailAvailable
                      ? "Help customer complete online payment"
                      : "Not eligible for payment recovery"}
                  </div>
                </div>
              </div>

              {!paymentRecoveryEmailAvailable && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-500">
                  UNAVAILABLE
                </span>
              )}
            </button>

            {/* Prepaid Confirmation */}

            <button
              type="button"
              onClick={handlePrepaidConfirmation}
              disabled={
                isBusy ||
                !orderId ||
                !prepaidConfirmationAvailable
              }
              title={
                prepaidConfirmationAvailable
                  ? "Resend paid order confirmation"
                  : "Only paid Razorpay orders are eligible"
              }
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                {prepaidConfirmationLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <BadgeCheck
                    size={15}
                    className="text-emerald-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {prepaidConfirmationLoading
                      ? "Sending Confirmation..."
                      : "Resend Prepaid Confirmation"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {prepaidConfirmationAvailable
                      ? `Email ${prepaidConfirmationEmailAvailable ? "✓" : "✕"
                      } · WhatsApp ${prepaidConfirmationWhatsAppAvailable ? "✓" : "✕"
                      }`
                      : "Paid Razorpay orders only"}
                  </div>
                </div>
              </div>

              {!prepaidConfirmationAvailable && (
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

      {splitModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/55 p-3 pt-6 backdrop-blur-sm sm:p-5 sm:pt-8"
            style={{ zIndex: 2147483647 }}
          >             <div className="my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl max-h-[calc(100dvh-48px)] sm:max-h-[calc(100dvh-64px)]">
              {/* Header */}
              <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-5 sm:py-4">                  <div>
                <h2 className="text-base font-black text-zinc-950">
                  Split Order
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  #{orderNumber} · Choose quantity for Shipment A.
                  Remaining quantity automatically goes to Shipment B.
                </p>
              </div>

                <button
                  type="button"
                  disabled={splitLoading}
                  onClick={() => {
                    setSplitModalOpen(false);
                    setSplitRows([]);
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100"
                >
                  ✕
                </button>
              </div>

              {/* Products */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-5">                  <div className="space-y-3">
                {splitRows.map((row) => {
                  const aQty = Number(
                    row.shipmentAQty || 0,
                  );

                  const bQty =
                    row.quantity - aQty;

                  return (
                    <div
                      key={row.lineId}
                      className="rounded-xl border border-zinc-200 p-3"
                    >
                      <div className="flex gap-3">

                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                          {row.thumbnail ? (
                            <img
                              src={row.thumbnail}
                              alt={row.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <PackageOpen
                                size={18}
                                className="text-zinc-400"
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-zinc-900">
                                {row.title}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {row.size
                                  ? `Size ${row.size} · `
                                  : ""}
                                ₹{Number(
                                  row.price || 0,
                                ).toLocaleString("en-IN")}
                                {" · "}
                                Qty {row.quantity}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">

                              {/* A */}
                              <div className="rounded-xl border border-violet-200 bg-violet-50 p-2">
                                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-violet-600">
                                  Shipment A
                                </p>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateShipmentAQty(
                                        row.lineId,
                                        aQty - 1,
                                      )
                                    }
                                    className="h-7 w-7 rounded-md bg-white text-sm font-black shadow-sm"
                                  >
                                    −
                                  </button>

                                  <input
                                    type="number"
                                    min="0"
                                    max={row.quantity}
                                    value={aQty}
                                    onChange={(event) =>
                                      updateShipmentAQty(
                                        row.lineId,
                                        event.target.value,
                                      )
                                    }
                                    className="h-7 w-12 rounded-md border border-violet-200 bg-white text-center text-xs font-black outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateShipmentAQty(
                                        row.lineId,
                                        aQty + 1,
                                      )
                                    }
                                    className="h-7 w-7 rounded-md bg-white text-sm font-black shadow-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* B */}
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-center">
                                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                  Shipment B
                                </p>

                                <div className="flex h-7 min-w-12 items-center justify-center rounded-md bg-white px-3 text-xs font-black text-zinc-900 shadow-sm">
                                  {bQty}
                                </div>
                              </div>

                            </div>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                assignAllToA(row.lineId)
                              }
                              className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100"
                            >
                              All → A
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                assignAllToB(row.lineId)
                              }
                              className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-200"
                            >
                              All → B
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}



              </div>
              </div>

              {/* Footer / preview */}
              {(() => {
                const preview =
                  getManualSplitPreview();

                const valid =
                  preview.shipmentAItems.length > 0 &&
                  preview.shipmentBItems.length > 0;

                return (
                  <div className="relative z-20 shrink-0 border-t border-zinc-200 bg-zinc-50 p-3 sm:p-4 md:p-5">
                    <div className="grid grid-cols-2 gap-3">

                      <div className="rounded-xl border border-violet-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-violet-700">
                            Shipment A
                          </span>

                          <span className="text-xs font-bold text-zinc-500">
                            {preview.shipmentAQuantity} qty
                          </span>
                        </div>

                        <p className="mt-2 text-lg font-black text-zinc-950">
                          ₹
                          {preview.estimatedAPayable.toLocaleString(
                            "en-IN",
                          )}
                        </p>

                        <p className="text-[10px] text-zinc-500">
                          Subtotal ₹
                          {preview.shipmentASubtotal.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-zinc-700">
                            Shipment B
                          </span>

                          <span className="text-xs font-bold text-zinc-500">
                            {preview.shipmentBQuantity} qty
                          </span>
                        </div>

                        <p className="mt-2 text-lg font-black text-zinc-950">
                          ₹
                          {preview.estimatedBPayable.toLocaleString(
                            "en-IN",
                          )}
                        </p>

                        <p className="text-[10px] text-zinc-500">
                          Subtotal ₹
                          {preview.shipmentBSubtotal.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>

                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
                      <span className="text-zinc-500">
                        Original Final Payable
                      </span>

                      <span className="font-black text-zinc-950">
                        {formatCurrency(
                          getFinalPayable(order),
                        )}
                      </span>
                    </div>

                    {!valid && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        Both Shipment A and Shipment B must contain at least one item.
                      </p>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={splitLoading}
                        onClick={() => {
                          setSplitModalOpen(false);
                          setSplitRows([]);
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={
                          splitLoading || !valid
                        }
                        onClick={confirmManualSplit}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {splitLoading ? (
                          <>
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                            Splitting...
                          </>
                        ) : (
                          <>
                            <Split size={14} />
                            Confirm Split
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}

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
