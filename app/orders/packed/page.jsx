// app/orders/packed/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare2,
  Download,
  FileText,
  Loader2,
  Copy,
  PackageSearch,
  RefreshCw,
  Search,
  Tags,
  Truck,
  XCircle,
} from "lucide-react";

import PackedOrderRow, {
  getPackedShippingMeta,
} from "@/components/dispatching/PackedOrderRow";

import PackedOrdersReconcileModal from "@/components/dispatching/PackedOrdersReconcileModal";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderStore } from "@/store/orderStore";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import { toast } from "react-hot-toast";

/* ---------------------------------------------
   ✅ Small UI helpers
--------------------------------------------- */
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </div>
);

/* ---------------------------------------------
   ✅ CSV helpers
--------------------------------------------- */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const formatDateISO = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
};

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : "";
};

const safe = (v) => (v === null || v === undefined ? "" : v);
const getOrderId = (order) => String(order?._id || order?.id || "");
const getPackedTime = (order) => {
  const packedAt = order?.fulfillmentDates?.packedAt;

  if (packedAt) {
    const time = new Date(packedAt).getTime();
    if (Number.isFinite(time)) return time;
  }

  // Old orders fallback
  const fallback = new Date(
    order?.updatedAt || order?.createdAt || order?.orderDate || 0
  ).getTime();

  return Number.isFinite(fallback) ? fallback : 0;
};

const getShippingLabelUrl = (order) =>
  String(
    order?.shipment?.shiprocket?.labelUrl ||
    order?.shipment?.shiprocket?.label_url ||
    order?.shipment?.labelUrl ||
    order?.shipment?.label_url ||
    order?.shippingLabelUrl ||
    order?.labelUrl ||
    order?.trackingDetails?.labelUrl ||
    ""
  ).trim();


/* ---------------------------------------------
   Page: Packed Orders
   - ✅ Only Searchbar (no filters)
   - ✅ Backend: fulfillmentStatus=packed + customerName=search
--------------------------------------------- */
export default function PackedOrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const ordersMeta = useOrderStore((s) => s.ordersMeta);

  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const fetchNextOrdersPage = useOrderStore((s) => s.fetchNextOrdersPage);
  const syncOrderInList = useOrderStore((s) => s._syncOrderInList);
  const fetchInvoiceByOrderNumber = useOrderStore((s) => s.fetchInvoiceByOrderNumber);
  const fetchInvoiceByOrderId = useOrderStore((s) => s.fetchInvoiceByOrderId);
  const updateOrderStatus = useOrderStore(
    (s) => s.updateOrderStatus
  );
  const syncTracking = useShiprocketStore((s) => s.syncTracking);

  const invoiceBatchRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkInvoices, setBulkInvoices] = useState([]);

  // Search (button based)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState("all");
  const [reconcileOpen, setReconcileOpen] = useState(false);

  // pagination
  const [pageSize] = useState(500);
  const [loadingMore, setLoadingMore] = useState(false);

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  /* ---------------------------------------------
     ✅ Backend filters
  --------------------------------------------- */
  const backendFilters = useMemo(() => {
    const f = {
      fulfillmentStatus: "packed",
      page: 1,
      limit: pageSize,
    };
    if (search) f.customerName = search;
    return f;
  }, [search, pageSize]);

  const loadOrders = useCallback(async () => {
    try {
      await fetchAllOrders(backendFilters);
    } catch (e) {
      console.log("Packed Orders Fetch Error:", e);
    }
  }, [fetchAllOrders, backendFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const packedOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).filter(
      (order) =>
        String(order?.fulfillmentStatus || "").toLowerCase() === "packed"
    );
  }, [orders]);

  const shippingCounts = useMemo(() => {
    const counts = {
      all: packedOrders.length,
      serviceable: 0,
      missing_awb: 0,
      unserviceable: 0,
      failed: 0,
    };

    packedOrders.forEach((order) => {
      const meta = getPackedShippingMeta(order);

      if (meta?.key && Object.prototype.hasOwnProperty.call(counts, meta.key)) {
        counts[meta.key] += 1;
      }
    });

    return counts;
  }, [packedOrders]);

  const filteredOrders = useMemo(() => {
    let data = [...packedOrders];

    if (shippingFilter !== "all") {
      data = data.filter(
        (order) =>
          getPackedShippingMeta(order)?.key === shippingFilter
      );
    }

    const q = search.trim().toLowerCase();

    if (!q) return data;

    return data.filter((order) => {
      const orderNumber = String(
        order?.orderNumber || ""
      ).toLowerCase();

      const name = String(
        order?.customerId?.name ||
        order?.shippingAddressSnapshot?.fullName ||
        ""
      ).toLowerCase();

      const email = String(
        order?.customerId?.email ||
        order?.shippingAddressSnapshot?.email ||
        ""
      ).toLowerCase();

      const phone = String(
        order?.customerId?.phone ||
        order?.shippingAddressSnapshot?.phone ||
        ""
      ).toLowerCase();

      const awb = String(
        order?.shipment?.awb ||
        order?.shipment?.shiprocket?.awb ||
        order?.trackingDetails?.trackingId ||
        ""
      ).toLowerCase();

      return (
        orderNumber.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        awb.includes(q)
      );
    });
  }, [packedOrders, search, shippingFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Oldest packed order first
      const timeDifference = getPackedTime(a) - getPackedTime(b);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      // Same packed time fallback
      return String(a?.orderNumber || "").localeCompare(
        String(b?.orderNumber || ""),
        undefined,
        { numeric: true }
      );
    });
  }, [filteredOrders]);

  const selectedOrders = useMemo(() => {
    const selected = new Set(selectedIds);

    return sortedOrders.filter((order) =>
      selected.has(getOrderId(order))
    );
  }, [sortedOrders, selectedIds]);

  const allVisibleSelected =
    sortedOrders.length > 0 &&
    sortedOrders.every((order) =>
      selectedIds.includes(getOrderId(order))
    );

  const toggleOrder = useCallback((orderId, checked) => {
    if (!orderId) return;
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, orderId]))
        : current.filter((id) => id !== orderId)
    );
  }, []);

  const toggleAllVisible = useCallback(() => {
    const visibleIds = filteredOrders.map(getOrderId).filter(Boolean);
    setSelectedIds((current) => {
      const currentSet = new Set(current);
      const shouldClear = visibleIds.every((id) => currentSet.has(id));
      return shouldClear
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]));
    });
  }, [filteredOrders]);


  const copySelectedOrderNumbers = async () => {
    if (!selectedOrders.length) {
      toast.error("No orders selected");
      return;
    }

    const text = selectedOrders
      .map((order) => String(order?.orderNumber || "").trim())
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${selectedOrders.length} order numbers copied`);
    } catch {
      toast.error("Failed to copy order numbers");
    }
  };

  const runBulkSync = async () => {
    if (!selectedOrders.length || bulkAction) return;

    setBulkAction("sync");

    let successCount = 0;
    let failedCount = 0;
    const failedOrders = [];

    try {
      for (const order of selectedOrders) {
        const orderId = getOrderId(order);
        const orderNumber = order?.orderNumber;

        try {
          const result = await syncTracking({
            orderId,
            orderNumber,
          });

          const updatedOrder =
            result?.order ||
            result?.data?.order ||
            result?.updatedOrder ||
            result?.data;

          if (updatedOrder?._id || updatedOrder?.id) {
            syncOrderInList(updatedOrder);
          }

          successCount += 1;
        } catch (error) {
          failedCount += 1;

          failedOrders.push({
            orderNumber: orderNumber || orderId,
            message:
              error?.message ||
              "Tracking sync failed",
          });

          console.warn(
            `Tracking sync failed for ${orderNumber || orderId}:`,
            error
          );

          // IMPORTANT:
          // do NOT throw here.
          // Continue with next selected order.
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} order${successCount === 1 ? "" : "s"
          } synced successfully`
        );
      }

      if (failedCount > 0) {
        toast.error(
          `${failedCount} order${failedCount === 1 ? "" : "s"
          } could not be synced`,
          {
            duration: 5000,
          }
        );
      }

      console.table(failedOrders);

      await loadOrders();
    } catch (error) {
      console.error("Bulk tracking sync error:", error);

      toast.error(
        error?.message ||
        "Bulk tracking sync failed"
      );
    } finally {
      setBulkAction("");
    }
  };

  const runBulkMarkAsShipped = async () => {
    if (!selectedOrders.length || bulkAction) return;

    const confirmed = window.confirm(
      `Mark ${selectedOrders.length} selected order${selectedOrders.length === 1 ? "" : "s"
      } as shipped?`
    );

    if (!confirmed) return;

    setBulkAction("shipped");

    let successCount = 0;
    let failedCount = 0;

    try {
      for (const order of selectedOrders) {
        const orderId = getOrderId(order);

        if (!orderId) {
          failedCount += 1;
          continue;
        }

        try {
          const result = await updateOrderStatus(orderId, {
            fulfillmentStatus: "shipped",
          });

          const updatedOrder =
            result?.order ||
            result?.data?.order ||
            result?.updatedOrder ||
            result?.data;

          if (updatedOrder?._id) {
            syncOrderInList(updatedOrder);
          }

          successCount += 1;
        } catch (error) {
          console.error(
            `Failed to mark ${order?.orderNumber || orderId} as shipped:`,
            error
          );

          failedCount += 1;
        }
      }

      if (successCount) {
        toast.success(
          `${successCount} order${successCount === 1 ? "" : "s"
          } marked as shipped`
        );
      }

      if (failedCount) {
        toast.error(
          `${failedCount} order${failedCount === 1 ? "" : "s"
          } failed to update`
        );
      }

      setSelectedIds([]);
      await loadOrders();
    } catch (error) {
      toast.error(
        error?.message || "Failed to mark selected orders as shipped"
      );
    } finally {
      setBulkAction("");
    }
  };

  const runBulkInvoiceDownload = async () => {
    if (!selectedOrders.length || bulkAction) return;
    setBulkAction("invoice");

    try {
      const invoices = [];
      for (const order of selectedOrders) {
        const orderNumber = String(order?.orderNumber || "").trim();
        const orderId = getOrderId(order);
        const invoice = orderNumber
          ? await fetchInvoiceByOrderNumber(orderNumber, { silent: true })
          : await fetchInvoiceByOrderId(orderId, { silent: true });
        if (invoice) invoices.push(invoice);
      }

      if (!invoices.length) throw new Error("No invoice data received");
      setBulkInvoices(invoices);
    } catch (error) {
      setBulkAction("");
      toast.error(error?.message || "Failed to prepare invoices");
    }
  };

  useEffect(() => {
    if (bulkAction !== "invoice" || !bulkInvoices.length) return;

    const timer = window.setTimeout(async () => {
      try {
        const element = invoiceBatchRef.current;
        if (!element) throw new Error("Invoice content is not ready");

        const [{ default: html2canvas }, pdfModule] = await Promise.all([
          import("html2canvas-pro"),
          import("jspdf"),
        ]);
        const jsPDF =
          pdfModule.jsPDF || pdfModule.default?.jsPDF || pdfModule.default;
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const pages = Array.from(element.children);

        for (let index = 0; index < pages.length; index += 1) {
          const canvas = await html2canvas(pages[index], {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const image = canvas.toDataURL("image/jpeg", 0.96);
          const width = pdf.internal.pageSize.getWidth();
          const height = (canvas.height * width) / canvas.width;
          if (index > 0) pdf.addPage();
          pdf.addImage(image, "JPEG", 0, 0, width, height, undefined, "FAST");
        }

        pdf.save(`Packed-Invoices-${Date.now()}.pdf`);
        toast.success(`${bulkInvoices.length} invoices downloaded`);
      } catch (error) {
        toast.error(error?.message || "Failed to download invoices");
      } finally {
        setBulkInvoices([]);
        setBulkAction("");
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [bulkAction, bulkInvoices]);

  const runBulkLabelDownload = () => {
    if (!selectedOrders.length || bulkAction) return;

    const labels = selectedOrders
      .map((order) => ({
        url: getShippingLabelUrl(order),
        name: order?.orderNumber || getOrderId(order),
      }))
      .filter((item) => item.url);

    if (!labels.length) {
      toast.error("Selected orders have no shipping labels");
      return;
    }

    setBulkAction("label");

    try {
      // Must run directly inside the button click. Delayed clicks are blocked by Chrome.
      const blockedLabels = [];

      labels.forEach((label) => {
        const labelWindow = window.open(
          label.url,
          "_blank",
          "noopener,noreferrer"
        );

        if (!labelWindow) blockedLabels.push(label);
      });

      // When Chrome blocks multiple tabs, open one fallback page containing
      // direct links so no selected label is lost.
      if (blockedLabels.length) {
        const launcher = window.open("", "_blank");

        if (launcher) {
          const links = blockedLabels
            .map(
              (label) => `
                <a href="${label.url}" target="_blank" rel="noopener noreferrer">
                  Open Shipping Label — ${label.name}
                </a>
              `
            )
            .join("");

          launcher.document.write(`
            <!doctype html>
            <html>
              <head>
                <title>OATCLUB Shipping Labels</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                  body { font-family: Arial, sans-serif; padding: 24px; background: #f6f7fb; }
                  h1 { margin: 0 0 8px; font-size: 22px; }
                  p { color: #666; margin-bottom: 20px; }
                  a { display: block; margin: 10px 0; padding: 14px 16px; color: #fff;
                      background: #111; border-radius: 10px; text-decoration: none; font-weight: 700; }
                </style>
              </head>
              <body>
                <h1>Shipping Labels</h1>
                <p>Your browser blocked multiple tabs. Open the remaining labels below.</p>
                ${links}
              </body>
            </html>
          `);
          launcher.document.close();
        }

        toast.error(
          `${blockedLabels.length} label tab${blockedLabels.length === 1 ? " was" : "s were"} blocked. Allow pop-ups for localhost.`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `${labels.length} shipping label${labels.length === 1 ? "" : "s"} opened`
        );
      }

      const skipped = selectedOrders.length - labels.length;
      if (skipped) toast(`${skipped} order${skipped === 1 ? "" : "s"} had no label`);
    } catch (error) {
      toast.error(error?.message || "Failed to open labels");
    } finally {
      setBulkAction("");
    }
  };

  /* ---------------------------------------------
     ✅ CSV export
  --------------------------------------------- */
  const buildCsvRows = (ordersArr) => {
    const rows = [];
    for (const order of ordersArr || []) {
      const orderId = safe(order?._id || order?.id);
      const orderNumber = safe(order?.orderNumber);
      const orderDate = formatDateISO(order?.createdAt || order?.orderDate);

      const customerName = safe(
        order?.customerId?.name || order?.shippingAddressSnapshot?.fullName
      );
      const customerEmail = safe(
        order?.customerId?.email || order?.shippingAddressSnapshot?.email
      );
      const customerPhone = safe(
        order?.customerId?.phone || order?.shippingAddressSnapshot?.phone
      );

      const subtotal = money(order?.subtotal);
      const discount = money(order?.discount);
      const shippingFee = money(order?.shippingFee);
      const tax = money(order?.tax);
      const totalAmount = money(order?.totalAmount);
      const finalPayable = money(order?.finalPayable);

      const fulfillmentStatus = safe(order?.fulfillmentStatus);
      const isConfirmed = order?.isConfirmed === true ? "YES" : "NO";

      const payMethod = safe(order?.paymentMethod);
      const payStatus = safe(order?.paymentStatus);

      const items = Array.isArray(order?.items) ? order.items : [];

      if (!items.length) {
        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          paymentMethod: payMethod,
          paymentStatus: payStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: "",
          itemTitle: "",
          itemProductCode: "",
          itemSku: "",
          itemSize: "",
          itemQuantity: "",
          itemPrice: "",
        });
        continue;
      }

      items.forEach((item, idx) => {
        const snap = item?.productSnapshot || {};
        const itemProductCode = safe(snap?.productCode || "");
        const attrs = Array.isArray(item?.variant?.attributes)
          ? item.variant.attributes
          : [];
        const attrSize =
          attrs.find((a) => String(a?.key || "").toLowerCase() === "size")?.value ||
          attrs.find((a) => String(a?.key || "").toLowerCase() === "sizes")?.value ||
          "";
        const itemSku = safe(item?.variant?.sku || snap?.sku || "");
        const itemSize = safe(item?.selectedSize || attrSize || "");

        rows.push({
          orderId,
          orderNumber,
          orderDate,
          customerName,
          customerEmail,
          customerPhone,
          isConfirmed,
          fulfillmentStatus,
          paymentMethod: payMethod,
          paymentStatus: payStatus,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          finalPayable,
          itemIndex: idx + 1,
          itemTitle: safe(snap?.title),
          itemProductCode,
          itemSku,
          itemSize,
          itemQuantity: money(item?.quantity),
          itemPrice: money(item?.price),
        });
      });
    }
    return rows;
  };

  const exportToCSV = () => {
    if (!filteredOrders?.length) return alert("No packed orders to export.");

    const rows = buildCsvRows(filteredOrders);

    const headers = [
      "Order DB Id",
      "Order #",
      "Order Date (ISO)",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Is Confirmed",
      "Fulfillment Status",
      "Payment Method",
      "Payment Status",
      "Subtotal",
      "Discount",
      "Shipping Fee",
      "Tax",
      "Total Amount",
      "Final Payable",
      "Item #",
      "Item Title",
      "Product Code",
      "Item SKU",
      "Item Size",
      "Item Quantity",
      "Item Price",
    ];

    const csvLines = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r) =>
        [
          r.orderId,
          r.orderNumber,
          r.orderDate,
          r.customerName,
          r.customerEmail,
          r.customerPhone,
          r.isConfirmed,
          r.fulfillmentStatus,
          r.paymentMethod,
          r.paymentStatus,
          r.subtotal,
          r.discount,
          r.shippingFee,
          r.tax,
          r.totalAmount,
          r.finalPayable,
          r.itemIndex,
          r.itemTitle,
          r.itemProductCode,
          r.itemSku,
          r.itemSize,
          r.itemQuantity,
          r.itemPrice,
        ]
          .map(escapeCSV)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.setAttribute("download", `packed-orders-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    const metaCount = Number(ordersMeta?.totalCount);
    const metaSum = Number(ordersMeta?.totalSum);

    const count =
      Number.isFinite(metaCount) && metaCount >= 0 ? metaCount : filteredOrders.length;

    const sum =
      Number.isFinite(metaSum) && metaSum >= 0
        ? metaSum
        : filteredOrders.reduce((acc, o) => acc + (Number(o?.finalPayable) || 0), 0);

    return { count, sum };
  }, [ordersMeta, filteredOrders]);

  const hasMore = !!ordersMeta?.hasMore;

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      await fetchNextOrdersPage({ ...backendFilters, page: undefined });
    } catch (e) {
      console.log("Load more error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#f6f7fb] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Packed Orders
            </h1>

            <p className="mt-1 text-gray-500">
              Search, reconcile and manage only <b>packed</b> orders.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                {totals.count} Orders
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                Total ₹{totals.sum}
              </span>

              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                Status: packed
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col flex-wrap gap-3 sm:flex-row md:w-auto">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:w-80">
              <Search size={18} className="text-gray-400" />

              <input
                type="text"
                placeholder="Order # / name / phone / AWB..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
            >
              <Search size={18} />
              Search
            </button>

            <button
              onClick={clearSearch}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-200 active:scale-[0.98]"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setReconcileOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-yellow-950 shadow-sm transition hover:bg-yellow-300 active:scale-[0.98]"
            >
              <PackageSearch size={18} />
              Reconcile Orders
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Shipping Filters */}
        <Card className="!p-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                key: "all",
                label: "All",
                count: shippingCounts.all,
                icon: null,
              },
              {
                key: "serviceable",
                label: "Ready",
                count: shippingCounts.serviceable,
                icon: CheckCircle2,
              },
              {
                key: "missing_awb",
                label: "Missing AWB",
                count: shippingCounts.missing_awb,
                icon: AlertTriangle,
              },
              {
                key: "unserviceable",
                label: "Unserviceable",
                count: shippingCounts.unserviceable,
                icon: AlertTriangle,
              },
              {
                key: "failed",
                label: "Failed",
                count: shippingCounts.failed,
                icon: XCircle,
              },
            ].map((filter) => {
              const active = shippingFilter === filter.key;
              const Icon = filter.icon;

              const isWarning =
                filter.key === "missing_awb" ||
                filter.key === "unserviceable";

              const isFailed = filter.key === "failed";
              const isReady = filter.key === "serviceable";

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setShippingFilter(filter.key);
                    setSelectedIds([]);
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition",

                    active
                      ? isWarning
                        ? "border-yellow-400 bg-yellow-400 text-yellow-950"
                        : isFailed
                          ? "border-red-600 bg-red-600 text-white"
                          : isReady
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-black bg-black text-white"
                      : isWarning
                        ? "border-yellow-300 bg-yellow-50 text-yellow-900 hover:bg-yellow-100"
                        : isFailed
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : isReady
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {Icon ? <Icon size={14} /> : null}

                  {filter.label}

                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      active ? "bg-white/20" : "bg-black/[0.06]",
                    ].join(" ")}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Bulk Actions */}
        <Card className="!p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAllVisible}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <CheckSquare2 size={16} />

                {allVisibleSelected ? "Clear visible" : "Select visible"}
              </button>

              <span className="text-sm font-semibold text-gray-700">
                {selectedOrders.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["copy", "Copy Order #", Copy, copySelectedOrderNumbers],
                ["shipped", "Mark as Shipped", Truck, runBulkMarkAsShipped],
                ["sync", "Bulk Sync", RefreshCw, runBulkSync],
                ["invoice", "Invoices", FileText, runBulkInvoiceDownload],
                ["label", "Labels", Tags, runBulkLabelDownload],
              ].map(([key, label, Icon, handler]) => (
                <button
                  key={key}
                  type="button"
                  onClick={handler}
                  disabled={!selectedOrders.length || Boolean(bulkAction)}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
                    key === "shipped" ? "bg-emerald-600" : "bg-black",
                  ].join(" ")}
                >
                  {bulkAction === key ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Icon size={16} />
                  )}

                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Load More / Refresh */}
        <Card>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-xs text-gray-500">
              {ordersMeta?.page
                ? `Page ${ordersMeta.page} • Showing ${orders.length} orders`
                : `Showing ${orders.length} orders`}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadOrders}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 active:scale-[0.98]"
              >
                Refresh
              </button>

              <button
                disabled={!hasMore || loadingMore}
                onClick={loadMore}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${!hasMore || loadingMore
                  ? "cursor-not-allowed bg-gray-200 text-gray-500"
                  : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
                  }`}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </span>
                ) : hasMore ? (
                  "Load More"
                ) : (
                  "No More"
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Packed Dispatch Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-600">
                <tr>
                  <th className="w-12 px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible packed orders"
                      className="h-4 w-4 rounded border-gray-300 accent-black"
                    />
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Order
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Items
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Shipping
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    AWB
                  </th>

                  <th className="px-5 py-4 text-left font-semibold">
                    Packed At
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {sortedOrders.length ? (
                  sortedOrders.map((order, idx) => {
                    const rowKey =
                      order?._id ||
                      order?.id ||
                      order?.orderNumber ||
                      `packed-${idx}`;

                    return (
                      <PackedOrderRow
                        key={String(rowKey)}
                        order={order}
                        selectable
                        selected={selectedIds.includes(getOrderId(order))}
                        onSelect={toggleOrder}
                        onUpdated={(updatedOrder) => {
                          if (updatedOrder?._id || updatedOrder?.id) {
                            syncOrderInList(updatedOrder);
                          }
                        }}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        {shippingFilter === "unserviceable" ||
                          shippingFilter === "missing_awb" ? (
                          <AlertTriangle
                            size={28}
                            className="text-yellow-500"
                          />
                        ) : (
                          <PackageSearch
                            size={28}
                            className="text-gray-300"
                          />
                        )}

                        <div className="mt-2 text-sm font-bold text-gray-600">
                          No packed orders found
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                          Try another shipping filter or search.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {bulkInvoices.length ? (
        <div className="fixed left-[-100000px] top-0 w-[794px] bg-white">
          <div ref={invoiceBatchRef}>
            {bulkInvoices.map((invoice, index) => (
              <div
                key={invoice?._id || invoice?.orderNumber || index}
                className="w-[794px] bg-white"
              >
                <InvoiceTemplate data={invoice} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <PackedOrdersReconcileModal
        open={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        orders={packedOrders}
        onSelectOrders={(ids) => {
          setSelectedIds(Array.from(new Set(ids.map(String))));
        }}
      />

      {/* Global loading overlay */}
      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg">
            <Loader2 size={18} className="animate-spin text-gray-700" />

            <span className="text-sm font-semibold text-gray-800">
              Loading...
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
