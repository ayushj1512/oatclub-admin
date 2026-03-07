"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2, RefreshCw, Search } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useOrderStore } from "@/store/orderStore";

const IST = "Asia/Kolkata";

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const Button = ({
  children,
  className = "",
  variant = "default",
  disabled = false,
  ...props
}) => {
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "bg-black text-white hover:bg-gray-900";

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-black ${className}`}
    {...props}
  />
);

const Select = ({ className = "", children, ...props }) => (
  <select
    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-black ${className}`}
    {...props}
  >
    {children}
  </select>
);

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDateTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    timeZone: IST,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ymdInIST = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const statusBadgeClasses = (status = "") => {
  const s = String(status).toLowerCase();

  if (s === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (s === "rto") return "border-orange-200 bg-orange-50 text-orange-700";
  if (s === "delivered") return "border-green-200 bg-green-50 text-green-700";

  return "border-gray-200 bg-gray-50 text-gray-700";
};

const cancellationTypeClasses = (type = "") => {
  const s = String(type).toLowerCase();
  if (s === "admin") return "border-purple-200 bg-purple-50 text-purple-700";
  if (s === "customer") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
};

const getCancellationType = (order) => {
  const adminRemarks = String(order?.adminRemarks || "").trim().toLowerCase();
  const customerMessage = String(order?.customerMessage || "").trim().toLowerCase();

  if (adminRemarks === "cancelled_by_admin") return "admin";
  if (customerMessage === "cancelled_by_customer") return "customer";
  return "unknown";
};

const buildExcelRows = (orders = []) =>
  orders.map((o, idx) => {
    const shipping = o.shippingAddressSnapshot || {};
    const shipment = o.shipment || {};
    const shiprocket = shipment.shiprocket || {};
    const xpressbees = shipment.xpressbees || {};
    const tracking = o.trackingDetails || {};
    const items = Array.isArray(o.items) ? o.items : [];

    return {
      SrNo: idx + 1,
      OrderNumber: o.orderNumber || "",
      CancellationType:
        getCancellationType(o) === "admin"
          ? "Cancelled by Admin"
          : getCancellationType(o) === "customer"
          ? "Cancelled by Customer"
          : "Unknown",

      OrderDate: o.orderDate ? fmtDateTime(o.orderDate) : "",
      CreatedAt: o.createdAt ? fmtDateTime(o.createdAt) : "",

      CustomerName: shipping.fullName || "",
      Phone: shipping.phone || "",
      Email: shipping.email || "",
      City: shipping.city || "",
      State: shipping.state || "",
      Pincode: shipping.pincode || "",

      PaymentMethod: o.paymentMethod || "",
      PaymentStatus: o.paymentStatus || "",
      FulfillmentStatus: o.fulfillmentStatus || "",
      ShipmentStatus: shipment.status || "",

      CourierName:
        shiprocket.courierName ||
        xpressbees.courierName ||
        tracking.courierName ||
        "",

      AWB:
        shiprocket.awb ||
        xpressbees.awb ||
        tracking.trackingId ||
        "",

      TrackingURL:
        shiprocket.trackingUrl ||
        xpressbees.trackingUrl ||
        tracking.trackingUrl ||
        "",

      FinalPayable: Number(o.finalPayable || 0),
      Currency: o.currency || "INR",

      ItemCount: items.reduce((sum, it) => sum + Number(it.quantity || 0), 0),

      ProductCodes: items
        .map((it) => it?.productSnapshot?.productCode || "")
        .filter(Boolean)
        .join(", "),

      ProductTitles: items
        .map((it) => it?.productSnapshot?.title || "")
        .filter(Boolean)
        .join(", "),

      AdminRemarks: o.adminRemarks || "",
      CustomerSupportRemark: o.customerSupportRemark || "",
      CustomerMessage: o.customerMessage || "",
    };
  });

export default function CancellationReportPage() {
  const { orders, ordersMeta, loading, fetchAllOrders, clearOrders } = useOrderStore();

  const today = useMemo(() => ymdInIST(new Date()), []);
  const monthStart = useMemo(() => {
    const now = new Date();
    return ymdInIST(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [cancellationFilter, setCancellationFilter] = useState("all"); // all | admin | customer
  const [downloading, setDownloading] = useState(false);

  const loadReport = useCallback(async () => {
    const filters = {
      fulfillmentStatus: ["cancelled"],
      page: 1,
      limit: 200,
    };

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (paymentMethod) filters.paymentMethod = [paymentMethod];
    if (appliedSearch) filters.customerName = appliedSearch;

    await fetchAllOrders(filters);
  }, [appliedSearch, endDate, fetchAllOrders, paymentMethod, startDate]);

  useEffect(() => {
    loadReport();
    return () => clearOrders();
  }, [loadReport, clearOrders]);

  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];

    if (cancellationFilter === "admin") {
      return list.filter((o) => getCancellationType(o) === "admin");
    }

    if (cancellationFilter === "customer") {
      return list.filter((o) => getCancellationType(o) === "customer");
    }

    return list;
  }, [orders, cancellationFilter]);

  const summary = useMemo(() => {
    const list = filteredOrders;
    return {
      totalOrders: list.length,
      totalValue: list.reduce((sum, o) => sum + Number(o.finalPayable || 0), 0),
      adminCount: list.filter((o) => getCancellationType(o) === "admin").length,
      customerCount: list.filter((o) => getCancellationType(o) === "customer").length,
    };
  }, [filteredOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(String(search || "").trim());
  };

  const handleReset = () => {
    setSearch("");
    setAppliedSearch("");
    setPaymentMethod("");
    setStartDate(monthStart);
    setEndDate(today);
    setCancellationFilter("all");
  };

  const handleExport = async () => {
    try {
      setDownloading(true);

      const rows = buildExcelRows(filteredOrders);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Cancellation Report");

      if (!rows.length) {
        sheet.addRow(["No data found"]);
      } else {
        const headers = Object.keys(rows[0]);
        sheet.columns = headers.map((key) => ({
          header: key,
          key,
          width: Math.max(14, Math.min(36, key.length + 4)),
        }));

        rows.forEach((row) => sheet.addRow(row));

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };

        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.autoFilter = {
          from: "A1",
          to: `${sheet.getColumn(sheet.columnCount).letter}1`,
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const suffix =
        cancellationFilter === "admin"
          ? "Admin"
          : cancellationFilter === "customer"
          ? "Customer"
          : "All";

      saveAs(
        blob,
        `Cancellation_Report_${suffix}_${startDate || "all"}_${endDate || "all"}.xlsx`
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert(err?.message || "Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              <h1 className="text-2xl font-bold tracking-tight">Cancellation Report</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Cancelled by admin and cancelled by customer both included.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadReport} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>

            <Button onClick={handleExport} disabled={downloading || loading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total Cancelled
            </p>
            <p className="mt-2 text-2xl font-bold">{summary.totalOrders}</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total Value
            </p>
            <p className="mt-2 text-2xl font-bold">{fmtMoney(summary.totalValue)}</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cancelled by Admin
            </p>
            <p className="mt-2 text-2xl font-bold">{summary.adminCount}</p>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cancelled by Customer
            </p>
            <p className="mt-2 text-2xl font-bold">{summary.customerCount}</p>
          </Card>
        </div>

        <Card className="p-4 md:p-5">
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6"
          >
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Order number / customer / email / phone"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Cancellation Type
              </label>
              <Select
                value={cancellationFilter}
                onChange={(e) => setCancellationFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="admin">Cancelled by Admin</option>
                <option value="customer">Cancelled by Customer</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Payment Method
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">All</option>
                <option value="cod">COD</option>
                <option value="razorpay">Razorpay</option>
                <option value="exchange">Exchange</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-2 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Apply Filters
              </Button>

              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-red-200 bg-red-50 text-red-700">
                Cancelled Orders
              </Badge>

              <Badge className={cancellationTypeClasses(cancellationFilter)}>
                {cancellationFilter === "admin"
                  ? "Cancelled by Admin"
                  : cancellationFilter === "customer"
                  ? "Cancelled by Customer"
                  : "All Cancellation Types"}
              </Badge>

              {ordersMeta?.totalCount != null && (
                <Badge className="border-gray-200 bg-gray-50 text-gray-700">
                  API Count: {ordersMeta.totalCount}
                </Badge>
              )}

              <Badge className="border-gray-200 bg-gray-50 text-gray-700">
                Showing: {filteredOrders.length}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading report...
              </div>
            </div>
          ) : !filteredOrders.length ? (
            <div className="flex min-h-[260px] items-center justify-center px-4 text-center text-sm text-gray-500">
              No cancelled orders found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Order
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Cancellation Type
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Payment
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      AWB / Courier
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Products
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((o) => {
                    const shipping = o.shippingAddressSnapshot || {};
                    const shipment = o.shipment || {};
                    const shiprocket = shipment.shiprocket || {};
                    const xpressbees = shipment.xpressbees || {};
                    const tracking = o.trackingDetails || {};
                    const items = Array.isArray(o.items) ? o.items : [];
                    const cancellationType = getCancellationType(o);

                    const awb =
                      shiprocket.awb ||
                      xpressbees.awb ||
                      tracking.trackingId ||
                      "-";

                    const courier =
                      shiprocket.courierName ||
                      xpressbees.courierName ||
                      tracking.courierName ||
                      "-";

                    const productCodes = items
                      .map((it) => it?.productSnapshot?.productCode || "")
                      .filter(Boolean)
                      .join(", ");

                    const productTitles = items
                      .map((it) => it?.productSnapshot?.title || "")
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <tr key={o._id} className="align-top hover:bg-gray-50/70">
                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="font-semibold text-gray-900">
                            {o.orderNumber || "-"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {fmtDateTime(o.createdAt)}
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="font-medium text-gray-900">
                            {shipping.fullName || "-"}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {shipping.phone || "-"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {shipping.city || "-"}, {shipping.state || "-"} {shipping.pincode || ""}
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <Badge className={statusBadgeClasses(o.fulfillmentStatus)}>
                              {o.fulfillmentStatus || "-"}
                            </Badge>
                            <Badge className={cancellationTypeClasses(cancellationType)}>
                              {cancellationType === "admin"
                                ? "Cancelled by Admin"
                                : cancellationType === "customer"
                                ? "Cancelled by Customer"
                                : "Unknown"}
                            </Badge>
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="font-medium uppercase text-gray-900">
                            {o.paymentMethod || "-"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {o.paymentStatus || "-"}
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="font-semibold text-gray-900">
                            {fmtMoney(o.finalPayable)}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            subtotal: {fmtMoney(o.subtotal)}
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="font-medium text-gray-900">{awb}</div>
                          <div className="mt-1 text-xs text-gray-500">{courier}</div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="max-w-[280px]">
                            <div className="text-xs font-medium text-gray-700">
                              {productCodes || "-"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 line-clamp-3">
                              {productTitles || "-"}
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-gray-100 px-4 py-4">
                          <div className="max-w-[260px] space-y-1 text-xs text-gray-600">
                            <div>
                              <span className="font-semibold text-gray-800">Admin:</span>{" "}
                              {o.adminRemarks || "-"}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">Support:</span>{" "}
                              {o.customerSupportRemark || "-"}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">Message:</span>{" "}
                              {o.customerMessage || "-"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}