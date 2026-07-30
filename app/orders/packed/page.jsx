// app/orders/packed/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare2, Download, FileText, Loader2, RefreshCw, Search, Tags } from "lucide-react";
import OrderRow from "@/components/orders/OrderRow";
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
  const syncTracking = useShiprocketStore((s) => s.syncTracking);

  const invoiceBatchRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkInvoices, setBulkInvoices] = useState([]);

  // Search (button based)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  /* ---------------------------------------------
     ✅ Client-side search fallback
  --------------------------------------------- */
  const filteredOrders = useMemo(() => {
    let data = Array.isArray(orders) ? [...orders] : [];

    // Safety: keep only packed
    data = data.filter(
      (o) => String(o?.fulfillmentStatus || "").toLowerCase() === "packed"
    );

    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((o) => {
      const orderNumber = String(o?.orderNumber || "").toLowerCase();
      const name = String(
        o?.customerId?.name || o?.shippingAddressSnapshot?.fullName || ""
      ).toLowerCase();
      const email = String(
        o?.customerId?.email || o?.shippingAddressSnapshot?.email || ""
      ).toLowerCase();
      const phone = String(
        o?.customerId?.phone || o?.shippingAddressSnapshot?.phone || ""
      ).toLowerCase();
      return (
        orderNumber.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [orders, search]);

  const selectedOrders = useMemo(() => {
    const selected = new Set(selectedIds);
    return filteredOrders.filter((order) => selected.has(getOrderId(order)));
  }, [filteredOrders, selectedIds]);

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedIds.includes(getOrderId(order)));

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

  const runBulkSync = async () => {
    if (!selectedOrders.length || bulkAction) return;
    setBulkAction("sync");

    let success = 0;
    try {
      for (const order of selectedOrders) {
        const result = await syncTracking({
          orderId: getOrderId(order),
          orderNumber: order?.orderNumber,
        });
        const updatedOrder =
          result?.order || result?.data?.order || result?.updatedOrder;
        if (updatedOrder) syncOrderInList(updatedOrder);
        success += 1;
      }
      toast.success(`${success} order${success === 1 ? "" : "s"} synced`);
      await loadOrders();
    } catch (error) {
      toast.error(error?.message || `Bulk sync stopped after ${success} orders`);
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

  const runBulkLabelDownload = async () => {
    if (!selectedOrders.length || bulkAction) return;
    setBulkAction("label");

    try {
      const labels = selectedOrders
        .map((order) => ({
          url: getShippingLabelUrl(order),
          name: order?.orderNumber || getOrderId(order),
        }))
        .filter((item) => item.url);

      if (!labels.length) throw new Error("Selected orders have no shipping labels");

      labels.forEach((label, index) => {
        window.setTimeout(() => {
          const anchor = document.createElement("a");
          anchor.href = label.url;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.download = `Shipping-Label-${label.name}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }, index * 250);
      });

      const skipped = selectedOrders.length - labels.length;
      toast.success(
        `${labels.length} label${labels.length === 1 ? "" : "s"} started${
          skipped ? ` • ${skipped} skipped` : ""
        }`
      );
    } catch (error) {
      toast.error(error?.message || "Failed to download labels");
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
    <section className="min-h-screen bg-[#f6f7fb] px-4 sm:px-6 lg:px-10 py-10">
      <div className="mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Packed Orders
            </h1>
            <p className="text-gray-500 mt-1">
              Search and manage only <b>packed</b> orders.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                {totals.count} Orders
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                Total ₹{totals.sum}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold">
                Status: packed
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 w-full md:w-80">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search order # / name / email / phone..."
                className="outline-none w-full bg-transparent text-sm placeholder:text-gray-400"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition"
            >
              <Search size={18} /> Search
            </button>

            <button
              onClick={clearSearch}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-200 active:scale-[0.98] transition"
            >
              Clear
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

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
                ["sync", "Bulk Sync", RefreshCw, runBulkSync],
                ["invoice", "Invoices", FileText, runBulkInvoiceDownload],
                ["label", "Labels", Tags, runBulkLabelDownload],
              ].map(([key, label, Icon, handler]) => (
                <button
                  key={key}
                  type="button"
                  onClick={handler}
                  disabled={!selectedOrders.length || Boolean(bulkAction)}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {ordersMeta?.page
                ? `Page ${ordersMeta.page} • Showing ${orders.length} orders`
                : `Showing ${orders.length} orders`}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadOrders}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
              >
                Refresh
              </button>

              <button
                disabled={!hasMore || loadingMore}
                onClick={loadMore}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  !hasMore || loadingMore
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Loading...
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

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
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
                  <th className="py-4 px-5 text-left font-semibold">Order #</th>
                  <th className="py-4 px-5 text-left font-semibold">Customer</th>
                  <th className="py-4 px-5 text-left font-semibold">Payment</th>
                  <th className="py-4 px-5 text-left font-semibold">Method</th>
                  <th className="py-4 px-5 text-left font-semibold">Fulfillment</th>
                  <th className="py-4 px-5 text-left font-semibold">Amount</th>
                  <th className="py-4 px-5 text-left font-semibold">Date</th>
                  <th className="py-4 px-5 text-left font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length ? (
                  [...filteredOrders]
                    .sort((a, b) => {
                      const getNum = (o) => {
                        const m = String(o?.orderNumber || "").match(/(\d+)$/);
                        return m ? Number(m[1]) : 0;
                      };
                      const an = getNum(a);
                      const bn = getNum(b);
                      if (bn !== an) return bn - an;
                      const ad = new Date(a?.createdAt || a?.orderDate || 0).getTime();
                      const bd = new Date(b?.createdAt || b?.orderDate || 0).getTime();
                      return bd - ad;
                    })
                    .map((order, idx) => {
                      const rowKey =
                        order?._id || order?.id || order?.orderNumber || `order-${idx}`;

                      return (
                        <OrderRow
                          key={String(rowKey)}
                          order={order}
                          selectable
                          selected={selectedIds.includes(getOrderId(order))}
                          onSelect={toggleOrder}
                          onUpdated={(updatedOrder) => {
                            if (updatedOrder?._id) syncOrderInList(updatedOrder);
                          }}
                        />
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      No packed orders found.
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
              <div key={invoice?._id || invoice?.orderNumber || index} className="w-[794px] bg-white">
                <InvoiceTemplate data={invoice} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Global loading overlay */}
      {loading ? (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-gray-700" />
            <span className="text-sm font-semibold text-gray-800">Loading...</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}