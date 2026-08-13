"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Loader2,
  PackageSearch,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import { toast } from "react-hot-toast";

const safe = (value) => String(value ?? "").trim();

const normalizeOrderNumber = (value = "") => {
  const raw = safe(value);

  if (!raw) return "";

  const cleaned = raw
    .replace(/^#+/, "")
    .trim();

  if (/^\d+$/.test(cleaned)) {
    return cleaned.padStart(6, "0");
  }

  return cleaned;
};

const parseOrderNumbers = (input = "") => {
  const tokens = String(input)
    .split(/[\n,\s\t,;|]+/)
    .map(safe)
    .filter(Boolean);

  const valid = [];
  const duplicates = [];
  const seen = new Set();

  tokens.forEach((token) => {
    const normalized =
      normalizeOrderNumber(token);

    if (!normalized) return;

    if (seen.has(normalized)) {
      duplicates.push(normalized);
      return;
    }

    seen.add(normalized);
    valid.push(normalized);
  });

  return {
    pasted: tokens.length,
    valid,
    duplicates: [...new Set(duplicates)],
  };
};

const getOrderId = (order = {}) =>
  safe(order?._id || order?.id);

const getShippingState = (order = {}) => {
  const shipment = order?.shipment || {};
  const serviceability =
    shipment?.serviceability || {};

  const awb = safe(
    shipment?.awb ||
    shipment?.shiprocket?.awb ||
    order?.trackingId ||
    order?.trackingDetails?.trackingId ||
    order?.trackingDetails?.awb
  );

  const shipmentStatus = safe(
    shipment?.status
  ).toLowerCase();

  const serviceabilityStatus = safe(
    serviceability?.status
  ).toLowerCase();

  if (
    serviceabilityStatus ===
    "unserviceable"
  ) {
    return {
      key: "unserviceable",
      label: "Unserviceable",
      awb,
    };
  }

  if (
    shipmentStatus === "failed" ||
    serviceabilityStatus === "error"
  ) {
    return {
      key: "failed",
      label: "Booking Failed",
      awb,
    };
  }

  if (awb) {
    return {
      key: "ready",
      label: "Ready",
      awb,
    };
  }

  return {
    key: "missing_awb",
    label: "Missing AWB",
    awb: "",
  };
};

const statusMeta = {
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
  },

  missing_awb: {
    label: "Missing AWB",
    icon: AlertTriangle,
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-900",
  },

  unserviceable: {
    label: "Unserviceable",
    icon: AlertTriangle,
    className:
      "border-yellow-300 bg-yellow-100 text-yellow-950",
  },

  failed: {
    label: "Booking Failed",
    icon: XCircle,
    className:
      "border-red-200 bg-red-50 text-red-700",
  },

  not_found: {
    label: "Not Found",
    icon: Search,
    className:
      "border-gray-200 bg-gray-50 text-gray-700",
  },
};

export default function PackedOrdersReconcileModal({
  open,
  onClose,
  orders = [],
  onSelectOrders,
}) {
  const [input, setInput] = useState("");
  const [pasting, setPasting] =
    useState(false);
  const [activeTab, setActiveTab] =
    useState("all");

  const parsed = useMemo(
    () => parseOrderNumbers(input),
    [input]
  );

  const orderMap = useMemo(() => {
    const map = new Map();

    (Array.isArray(orders) ? orders : []).forEach(
      (order) => {
        const normalized =
          normalizeOrderNumber(
            order?.orderNumber
          );

        if (!normalized) return;

        map.set(normalized, order);
      }
    );

    return map;
  }, [orders]);

  const reconciliation = useMemo(() => {
    const matched = [];
    const ready = [];
    const missingAwb = [];
    const unserviceable = [];
    const failed = [];
    const notFound = [];

    parsed.valid.forEach((orderNumber) => {
      const order =
        orderMap.get(orderNumber);

      if (!order) {
        notFound.push({
          orderNumber,
          state: "not_found",
          order: null,
        });
        return;
      }

      const shipping =
        getShippingState(order);

      const row = {
        orderNumber,
        state: shipping.key,
        awb: shipping.awb,
        order,
      };

      matched.push(row);

      if (shipping.key === "ready") {
        ready.push(row);
      }

      if (
        shipping.key === "missing_awb"
      ) {
        missingAwb.push(row);
      }

      if (
        shipping.key ===
        "unserviceable"
      ) {
        unserviceable.push(row);
      }

      if (shipping.key === "failed") {
        failed.push(row);
      }
    });

    return {
      matched,
      ready,
      missingAwb,
      unserviceable,
      failed,
      notFound,
    };
  }, [parsed.valid, orderMap]);

  const allRows = useMemo(
    () => [
      ...reconciliation.matched,
      ...reconciliation.notFound,
    ],
    [reconciliation]
  );

  const visibleRows = useMemo(() => {
    if (activeTab === "all") {
      return allRows;
    }

    if (activeTab === "ready") {
      return reconciliation.ready;
    }

    if (
      activeTab === "missing_awb"
    ) {
      return reconciliation.missingAwb;
    }

    if (
      activeTab === "unserviceable"
    ) {
      return reconciliation.unserviceable;
    }

    if (activeTab === "failed") {
      return reconciliation.failed;
    }

    if (activeTab === "not_found") {
      return reconciliation.notFound;
    }

    return allRows;
  }, [
    activeTab,
    allRows,
    reconciliation,
  ]);

  const handlePaste = async () => {
    try {
      setPasting(true);

      const text =
        await navigator.clipboard.readText();

      setInput((current) =>
        safe(current)
          ? `${current}\n${text}`
          : text
      );
    } catch {
      toast.error(
        "Clipboard access failed"
      );
    } finally {
      setPasting(false);
    }
  };

  const copyNumbers = async (rows = []) => {
    const text = rows
      .map((row) => row.orderNumber)
      .filter(Boolean)
      .join("\n");

    if (!text) {
      toast.error(
        "No order numbers to copy"
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        text
      );

      toast.success(
        `${rows.length} order numbers copied`
      );
    } catch {
      toast.error("Copy failed");
    }
  };

  const selectRows = (rows = []) => {
    const ids = rows
      .map((row) =>
        getOrderId(row?.order)
      )
      .filter(Boolean);

    if (!ids.length) {
      toast.error(
        "No matching packed orders found"
      );
      return;
    }

    onSelectOrders?.(ids);

    toast.success(
      `${ids.length} orders selected`
    );

    onClose?.();
  };

  if (!open) return null;

  const tabs = [
    {
      key: "all",
      label: "All",
      count:
        allRows.length,
    },
    {
      key: "ready",
      label: "Ready",
      count:
        reconciliation.ready.length,
    },
    {
      key: "missing_awb",
      label: "Missing AWB",
      count:
        reconciliation.missingAwb.length,
    },
    {
      key: "unserviceable",
      label: "Unserviceable",
      count:
        reconciliation.unserviceable
          .length,
    },
    {
      key: "failed",
      label: "Failed",
      count:
        reconciliation.failed.length,
    },
    {
      key: "not_found",
      label: "Not Found",
      count:
        reconciliation.notFound.length,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <PackageSearch
                size={20}
                className="text-gray-900"
              />

              <h2 className="text-xl font-black tracking-tight text-gray-950">
                Reconcile Packed Orders
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Paste Excel / Shiprocket
              order numbers and instantly
              find missing AWBs,
              unserviceable or unmatched
              orders.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-950"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-gray-950">
                      Paste order numbers
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500">
                      83 automatically becomes
                      000083.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={pasting}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {pasting ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <ClipboardPaste
                        size={14}
                      />
                    )}

                    Paste
                  </button>
                </div>

                <textarea
                  rows={14}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  placeholder={`83
87
111
136
137
150`}
                  className="mt-3 w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-black"
                />

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat
                    label="Pasted"
                    value={parsed.pasted}
                  />

                  <MiniStat
                    label="Unique"
                    value={
                      parsed.valid.length
                    }
                  />

                  <MiniStat
                    label="Duplicates"
                    value={
                      parsed.duplicates
                        .length
                    }
                    warning
                  />
                </div>

                {parsed.duplicates
                  .length ? (
                  <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-black text-yellow-900">
                      <AlertTriangle
                        size={14}
                      />
                      Duplicate entries
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.duplicates.map(
                        (number) => (
                          <span
                            key={number}
                            className="rounded-lg border border-yellow-200 bg-white px-2 py-1 font-mono text-xs font-bold text-yellow-900"
                          >
                            {number}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SummaryCard
                  label="Ready"
                  value={
                    reconciliation.ready
                      .length
                  }
                  tone="green"
                />

                <SummaryCard
                  label="Missing AWB"
                  value={
                    reconciliation.missingAwb
                      .length
                  }
                  tone="yellow"
                />

                <SummaryCard
                  label="Unserviceable"
                  value={
                    reconciliation
                      .unserviceable.length
                  }
                  tone="yellow"
                />

                <SummaryCard
                  label="Not Found"
                  value={
                    reconciliation.notFound
                      .length
                  }
                />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    selectRows([
                      ...reconciliation.missingAwb,
                      ...reconciliation.unserviceable,
                      ...reconciliation.failed,
                    ])
                  }
                  disabled={
                    !reconciliation
                      .missingAwb.length &&
                    !reconciliation
                      .unserviceable.length &&
                    !reconciliation.failed
                      .length
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-black text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <AlertTriangle
                    size={16}
                  />
                  Select Problem Orders
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyNumbers([
                      ...reconciliation.missingAwb,
                      ...reconciliation.unserviceable,
                      ...reconciliation.failed,
                      ...reconciliation.notFound,
                    ])
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50"
                >
                  <Copy size={16} />
                  Copy Problem Numbers
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const active =
                    tab.key === activeTab;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          tab.key
                        )
                      }
                      className={[
                        "rounded-xl border px-3 py-2 text-xs font-black transition",
                        active
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {tab.label}{" "}
                      <span
                        className={
                          active
                            ? "text-white/70"
                            : "text-gray-400"
                        }
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                <div className="max-h-[580px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">
                          Order
                        </th>
                        <th className="px-4 py-3">
                          Status
                        </th>
                        <th className="px-4 py-3">
                          AWB
                        </th>
                        <th className="px-4 py-3">
                          Customer
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {visibleRows.length ? (
                        visibleRows.map(
                          (row) => {
                            const meta =
                              statusMeta[
                              row.state
                              ] ||
                              statusMeta.not_found;

                            const Icon =
                              meta.icon;

                            return (
                              <tr
                                key={`${row.orderNumber}-${row.state}`}
                                className={
                                  row.state ===
                                    "unserviceable" ||
                                    row.state ===
                                    "missing_awb"
                                    ? "bg-yellow-50/40"
                                    : "bg-white"
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="font-mono font-black text-gray-950">
                                    {
                                      row.orderNumber
                                    }
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black ${meta.className}`}
                                  >
                                    <Icon
                                      size={
                                        13
                                      }
                                    />

                                    {
                                      meta.label
                                    }
                                  </span>
                                </td>

                                <td className="px-4 py-3">
                                  {row.awb ? (
                                    <span className="font-mono text-xs font-bold text-gray-900">
                                      {
                                        row.awb
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      —
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="max-w-[220px] truncate text-xs font-semibold text-gray-700">
                                    {safe(
                                      row
                                        ?.order
                                        ?.customerId
                                        ?.name ||
                                      row
                                        ?.order
                                        ?.shippingAddressSnapshot
                                        ?.fullName
                                    ) ||
                                      "—"}
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-16 text-center"
                          >
                            <PackageSearch
                              size={28}
                              className="mx-auto text-gray-300"
                            />

                            <div className="mt-2 text-sm font-bold text-gray-500">
                              No orders in this
                              section
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-xs leading-5 text-yellow-900">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0"
                />

                Missing AWB is shown as a
                yellow warning because the
                shipment still needs attention.
                A confirmed unserviceable result
                also appears yellow, but remains
                separately classified.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  warning = false,
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        warning
          ? "border-yellow-200 bg-yellow-50"
          : "border-gray-200 bg-white",
      ].join(" ")}
    >
      <div className="text-[10px] font-black uppercase tracking-wide text-gray-400">
        {label}
      </div>

      <div
        className={[
          "mt-1 text-xl font-black",
          warning
            ? "text-yellow-900"
            : "text-gray-950",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}) {
  const tones = {
    default:
      "border-gray-200 bg-white text-gray-950",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    yellow:
      "border-yellow-300 bg-yellow-50 text-yellow-900",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${tones[tone] || tones.default
        }`}
    >
      <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black">
        {value}
      </div>
    </div>
  );
}
