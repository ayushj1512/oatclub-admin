"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  Hash,
  MapPin,
  PackageCheck,
  PackageSearch,
  RefreshCcw,
  Search,
  Shirt,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { normalizeOrderNumberInput } from "@/utils/formatters";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const isDigitsOnly = (value) =>
  /^\d+$/.test(String(value || "").trim());

const normalizeProductCode = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (!isDigitsOnly(raw)) return raw;

  return raw.padStart(5, "0");
};

const normalizeOrderNumber = (value) =>
  normalizeOrderNumberInput(value);

const formatLabel = (value = "") => {
  const text = String(value || "")
    .trim()
    .replace(/_/g, " ");

  if (!text) return "Unknown";

  return text.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
};

const formatPaymentMethod = (value = "") => {
  const method = String(value || "")
    .trim()
    .toLowerCase();

  const labels = {
    cod: "COD",
    razorpay: "Razorpay",
    wallet: "Wallet",
    exchange: "Exchange",
    manual_prepaid: "Manual Prepaid",
  };

  return labels[method] || formatLabel(method);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const csvEscape = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadCSV = (
  rows,
  filename = "product-order-search.csv",
) => {
  const headers = [
    "search_term",
    "fulfillment_status",
    "order_number",
    "order_date",
    "customer_name",
    "city",
    "state",
    "payment_method",
    "payment_status",
    "product_code",
    "product_name",
    "size",
    "color",
    "quantity",
    "final_payable",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => csvEscape(row?.[header]))
        .join(","),
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const fulfillmentStyles = {
  processing: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    header:
      "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50",
    icon: Boxes,
  },
  packed: {
    badge:
      "border-blue-200 bg-blue-50 text-blue-700",
    header:
      "border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50",
    icon: PackageCheck,
  },
  picked: {
    badge:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    header:
      "border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50",
    icon: PackageCheck,
  },
  shipped: {
    badge:
      "border-violet-200 bg-violet-50 text-violet-700",
    header:
      "border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50",
    icon: Truck,
  },
  out_for_delivery: {
    badge:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    header:
      "border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-pink-50",
    icon: Truck,
  },
  delivered: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    header:
      "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50",
    icon: CheckCircle2,
  },
  cancelled: {
    badge: "border-red-200 bg-red-50 text-red-700",
    header:
      "border-red-200 bg-gradient-to-r from-red-50 to-rose-50",
    icon: XCircle,
  },
  rto: {
    badge:
      "border-orange-200 bg-orange-50 text-orange-700",
    header:
      "border-orange-200 bg-gradient-to-r from-orange-50 to-red-50",
    icon: XCircle,
  },
  returned: {
    badge: "border-pink-200 bg-pink-50 text-pink-700",
    header:
      "border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50",
    icon: RefreshCcw,
  },
  refunded: {
    badge:
      "border-teal-200 bg-teal-50 text-teal-700",
    header:
      "border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50",
    icon: CircleDollarSign,
  },
  failed: {
    badge: "border-red-200 bg-red-50 text-red-700",
    header:
      "border-red-200 bg-gradient-to-r from-red-50 to-zinc-50",
    icon: AlertCircle,
  },
  unknown: {
    badge:
      "border-zinc-200 bg-zinc-100 text-zinc-700",
    header:
      "border-zinc-200 bg-gradient-to-r from-zinc-50 to-slate-50",
    icon: PackageSearch,
  },
};

const paymentMethodStyles = {
  cod: "border-orange-200 bg-orange-50 text-orange-700",
  razorpay:
    "border-indigo-200 bg-indigo-50 text-indigo-700",
  wallet:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  exchange:
    "border-purple-200 bg-purple-50 text-purple-700",
  manual_prepaid:
    "border-blue-200 bg-blue-50 text-blue-700",
};

const paymentStatusStyles = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-teal-200 bg-teal-50 text-teal-700",
  refund_pending:
    "border-orange-200 bg-orange-50 text-orange-700",
  partially_refunded:
    "border-cyan-200 bg-cyan-50 text-cyan-700",
  not_applicable:
    "border-zinc-200 bg-zinc-100 text-zinc-700",
};

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  className = "",
  iconClassName = "",
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {label}
          </p>

          <p className="mt-1 truncate text-xl font-bold text-zinc-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusSummaryCard({ item }) {
  const status = String(
    item?.fulfillmentStatus || "unknown",
  ).toLowerCase();

  const style =
    fulfillmentStyles[status] ||
    fulfillmentStyles.unknown;

  const Icon = style.icon;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${style.header}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white/80 ${style.badge}`}
        >
          <Icon size={18} />
        </div>

        <Badge className={style.badge}>
          {Number(item?.totalOrders || 0)} Orders
        </Badge>
      </div>

      <p className="mt-4 text-sm font-bold text-zinc-950">
        {formatLabel(status)}
      </p>

      <p className="mt-1 text-xs font-medium text-zinc-600">
        Matching Quantity:{" "}
        <span className="font-bold text-zinc-900">
          {Number(item?.totalQuantity || 0)}
        </span>
      </p>
    </div>
  );
}

function ProductCell({ product }) {
  return (
    <div className="min-w-[220px]">
      <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
        {product?.productName || "Product unavailable"}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className="border-violet-200 bg-violet-50 text-violet-700">
          {product?.productCode || "No code"}
        </Badge>

        {product?.sku ? (
          <Badge className="border-zinc-200 bg-zinc-100 text-zinc-600">
            SKU: {product.sku}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function OrderTable({ orders = [], status }) {
  const style =
    fulfillmentStyles[status] ||
    fulfillmentStyles.unknown;

  const Icon = style.icon;

  const rows = orders.flatMap((order) => {
    const products = Array.isArray(order?.matchedProducts)
      ? order.matchedProducts
      : [];

    if (!products.length) {
      return [
        {
          order,
          product: {
            productName: order?.productName || "",
            productCode: order?.productCode || "",
            size: order?.size || "",
            quantity: 0,
            color: "",
          },
          rowKey: `${order?.orderNumber}-fallback`,
        },
      ];
    }

    return products.map((product, index) => ({
      order,
      product,
      rowKey: `${order?.orderNumber}-${product?.productCode}-${product?.size}-${index}`,
    }));
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div
        className={`flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${style.header}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white ${style.badge}`}
          >
            <Icon size={18} />
          </div>

          <div>
            <h2 className="text-base font-bold text-zinc-950">
              {formatLabel(status)}
            </h2>

            <p className="mt-0.5 text-xs font-medium text-zinc-600">
              {orders.length} orders · {rows.length} product rows
            </p>
          </div>
        </div>

        <Badge className={style.badge}>
          {orders.length} Orders
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1500px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-950 text-left text-xs font-bold uppercase tracking-[0.08em] text-white">
              <th className="sticky left-0 z-20 bg-zinc-950 px-4 py-4">
                #
              </th>

              <th className="sticky left-[54px] z-20 bg-zinc-950 px-4 py-4">
                Order
              </th>

              <th className="px-4 py-4">Product</th>
              <th className="px-4 py-4">Size</th>
              <th className="px-4 py-4">Qty</th>
              <th className="px-4 py-4">Customer</th>
              <th className="px-4 py-4">Location</th>
              <th className="px-4 py-4">Payment</th>
              <th className="px-4 py-4">Pay Status</th>
              <th className="px-4 py-4">Amount</th>
              <th className="px-4 py-4">Order Date</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(({ order, product, rowKey }, index) => {
              const paymentMethod = String(
                order?.paymentMethod || "",
              ).toLowerCase();

              const paymentStatus = String(
                order?.paymentStatus || "",
              ).toLowerCase();

              return (
                <tr
                  key={rowKey}
                  className={`border-b border-zinc-100 transition hover:bg-violet-50/60 ${index % 2 === 0
                      ? "bg-white"
                      : "bg-zinc-50/70"
                    }`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-4 text-sm font-semibold text-zinc-400">
                    {index + 1}
                  </td>

                  <td className="sticky left-[54px] z-10 bg-inherit px-4 py-4">
                    <div className="min-w-[120px]">
                      <p className="text-sm font-bold text-violet-700">
                        #{order?.orderNumber || "—"}
                      </p>

                      <Badge className={`mt-2 ${style.badge}`}>
                        {formatLabel(status)}
                      </Badge>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <ProductCell product={product} />
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <Badge className="w-fit border-blue-200 bg-blue-50 text-blue-700">
                        {product?.size || "—"}
                      </Badge>

                      {product?.color ? (
                        <span className="text-xs font-medium text-zinc-500">
                          {product.color}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700">
                      {Number(product?.quantity || 0)}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex min-w-[170px] items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <UserRound size={15} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {order?.name || "Name unavailable"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex min-w-[170px] items-start gap-2">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0 text-rose-500"
                      />

                      <div>
                        <p className="text-sm font-medium text-zinc-800">
                          {order?.city || "—"}
                        </p>

                        <p className="mt-0.5 text-xs text-zinc-500">
                          {order?.state || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <Badge
                      className={
                        paymentMethodStyles[paymentMethod] ||
                        "border-zinc-200 bg-zinc-100 text-zinc-700"
                      }
                    >
                      <Banknote size={12} className="mr-1.5" />
                      {formatPaymentMethod(paymentMethod)}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <Badge
                      className={
                        paymentStatusStyles[paymentStatus] ||
                        "border-zinc-200 bg-zinc-100 text-zinc-700"
                      }
                    >
                      {formatLabel(paymentStatus)}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="whitespace-nowrap text-sm font-bold text-emerald-700">
                      {formatCurrency(order?.finalPayable)}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="whitespace-nowrap text-sm font-medium text-zinc-700">
                      {formatDate(order?.orderDate)}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SearchOrderByNameOrCodePage() {
  const [input, setInput] = useState("");
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] =
    useState({});
  const [summary, setSummary] = useState([]);
  const [orderNumbers, setOrderNumbers] =
    useState([]);

  const normalizedInput = useMemo(
    () => normalizeProductCode(input),
    [input],
  );

  const groupedEntries = useMemo(() => {
    return Object.entries(groupedOrders).sort(
      ([statusA], [statusB]) => {
        const order = [
          "processing",
          "packed",
          "picked",
          "shipped",
          "out_for_delivery",
          "delivered",
          "returned",
          "refunded",
          "cancelled",
          "rto",
          "failed",
        ];

        const indexA = order.indexOf(statusA);
        const indexB = order.indexOf(statusB);

        return (
          (indexA === -1 ? 999 : indexA) -
          (indexB === -1 ? 999 : indexB)
        );
      },
    );
  }, [groupedOrders]);

  const csvRows = useMemo(() => {
    return orders.flatMap((order) => {
      const products = Array.isArray(
        order?.matchedProducts,
      )
        ? order.matchedProducts
        : [];

      if (!products.length) {
        return [
          {
            search_term: searched || "",
            fulfillment_status:
              order?.fulfillmentStatus || "",
            order_number: order?.orderNumber || "",
            order_date: formatDate(order?.orderDate),
            customer_name: order?.name || "",
            city: order?.city || "",
            state: order?.state || "",
            payment_method: formatPaymentMethod(
              order?.paymentMethod,
            ),
            payment_status: formatLabel(
              order?.paymentStatus,
            ),
            product_code: order?.productCode || "",
            product_name: order?.productName || "",
            size: order?.size || "",
            color: "",
            quantity: "",
            final_payable: Number(
              order?.finalPayable || 0,
            ),
          },
        ];
      }

      return products.map((product) => ({
        search_term: searched || "",
        fulfillment_status:
          order?.fulfillmentStatus || "",
        order_number: order?.orderNumber || "",
        order_date: formatDate(order?.orderDate),
        customer_name: order?.name || "",
        city: order?.city || "",
        state: order?.state || "",
        payment_method: formatPaymentMethod(
          order?.paymentMethod,
        ),
        payment_status: formatLabel(
          order?.paymentStatus,
        ),
        product_code: product?.productCode || "",
        product_name: product?.productName || "",
        size: product?.size || "",
        color: product?.color || "",
        quantity: Number(product?.quantity || 0),
        final_payable: Number(
          order?.finalPayable || 0,
        ),
      }));
    });
  }, [orders, searched]);

  const totalMatchingQuantity = useMemo(() => {
    return summary.reduce(
      (total, item) =>
        total + Number(item?.totalQuantity || 0),
      0,
    );
  }, [summary]);

  const totalRevenue = useMemo(() => {
    return orders.reduce(
      (total, order) =>
        total + Number(order?.finalPayable || 0),
      0,
    );
  }, [orders]);

  const handleSearch = async (event) => {
    event?.preventDefault?.();

    const q = normalizeProductCode(input);

    if (!q) {
      setError(
        "Please enter product name or product code",
      );
      setSearched("");
      setOrders([]);
      setGroupedOrders({});
      setSummary([]);
      setOrderNumbers([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(q);

      const response = await fetch(
        `${BASE_URL}/api/orders/product-order-search?q=${encodeURIComponent(
          q,
        )}`,
        {
          cache: "no-store",
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to search",
        );
      }

      const cleanOrders = Array.isArray(data?.orders)
        ? data.orders
        : [];

      const cleanGroupedOrders =
        data?.groupedOrders &&
          typeof data.groupedOrders === "object"
          ? data.groupedOrders
          : {};

      const cleanSummary = Array.isArray(data?.summary)
        ? data.summary
        : [];

      const cleanOrderNumbers = Array.isArray(
        data?.orderNumbers,
      )
        ? [
          ...new Set(
            data.orderNumbers
              .map(normalizeOrderNumber)
              .filter(Boolean),
          ),
        ]
        : [
          ...new Set(
            cleanOrders
              .map((order) =>
                normalizeOrderNumber(
                  order?.orderNumber,
                ),
              )
              .filter(Boolean),
          ),
        ];

      setOrders(cleanOrders);
      setGroupedOrders(cleanGroupedOrders);
      setSummary(cleanSummary);
      setOrderNumbers(cleanOrderNumbers);
    } catch (err) {
      setError(
        err?.message || "Something went wrong",
      );
      setOrders([]);
      setGroupedOrders({});
      setSummary([]);
      setOrderNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setSearched("");
    setError("");
    setOrders([]);
    setGroupedOrders({});
    setSummary([]);
    setOrderNumbers([]);
  };

  const handleExportCSV = () => {
    if (!csvRows.length) return;

    const safeSearch = String(
      searched || "search",
    ).replace(/[^\w-]+/g, "_");

    downloadCSV(
      csvRows,
      `product-order-search-${safeSearch}.csv`,
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-zinc-900">
      <div className="w-full px-4 py-6 md:px-8 lg:px-12">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-zinc-950 via-violet-950 to-indigo-950 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur">
                <PackageSearch size={14} />
                Product Order Intelligence
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-4xl">
                Product Order Search
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                Search a product and view customer,
                payment, size, quantity and fulfillment
                information in grouped tables.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!csvRows.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="relative z-10 -mt-5 px-2 md:px-5">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-lg md:p-5">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 lg:flex-row lg:items-end"
            >
              <div className="flex-1">
                <label className="mb-2 block text-sm font-bold text-zinc-800">
                  Product Name / Product Code
                </label>

                <div className="group flex h-12 items-center gap-3 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 transition focus-within:border-violet-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100">
                  <Search
                    size={18}
                    className="text-zinc-400 group-focus-within:text-violet-600"
                  />

                  <input
                    type="text"
                    value={input}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
                    placeholder="Example: 00564 or product name"
                    className="h-full w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-zinc-400"
                  />
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  Normalized:{" "}
                  <span className="font-bold text-violet-700">
                    {normalizedInput || "—"}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search size={16} />
                  {loading
                    ? "Searching..."
                    : "Search Orders"}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
                >
                  <RefreshCcw size={16} />
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <div>{error}</div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Searched Product"
            value={searched || "—"}
            className="border-violet-200"
            iconClassName="bg-violet-100 text-violet-700"
          />

          <StatCard
            icon={PackageSearch}
            label="Orders Found"
            value={orders.length}
            className="border-blue-200"
            iconClassName="bg-blue-100 text-blue-700"
          />

          <StatCard
            icon={Shirt}
            label="Matching Quantity"
            value={totalMatchingQuantity}
            className="border-amber-200"
            iconClassName="bg-amber-100 text-amber-700"
          />

          <StatCard
            icon={CircleDollarSign}
            label="Combined Payable"
            value={formatCurrency(totalRevenue)}
            className="border-emerald-200"
            iconClassName="bg-emerald-100 text-emerald-700"
          />
        </div>

        {summary.length ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {summary.map((item) => (
              <StatusSummaryCard
                key={item?.fulfillmentStatus}
                item={item}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <RefreshCcw
                  size={24}
                  className="animate-spin"
                />
              </div>

              <p className="mt-4 text-sm font-bold text-zinc-800">
                Searching matching orders...
              </p>
            </div>
          ) : !orders.length ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-5 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
                <PackageSearch size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-zinc-900">
                No matching orders
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Search using a product name or product
                code to see grouped fulfillment tables.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEntries.map(
                ([status, statusOrders]) => (
                  <OrderTable
                    key={status}
                    status={status}
                    orders={
                      Array.isArray(statusOrders)
                        ? statusOrders
                        : []
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
