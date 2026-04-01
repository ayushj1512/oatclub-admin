"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Download,
  Phone,
  MapPin,
  Package2,
  Clock3,
  CreditCard,
  Search,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safe = (v) => String(v ?? "").trim();

const DuplicateOrders = () => {
  const {
    loading,
    error,
    fetchDuplicateOrderAlerts,
    markDuplicateOrderAlerts,
  } = useOrderStore();

  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [marking, setMarking] = useState(false);

  const loadDuplicates = async () => {
    try {
      const res = await fetchDuplicateOrderAlerts();
      setGroups(Array.isArray(res?.duplicateGroups) ? res.duplicateGroups : []);
    } catch (err) {
      console.error("fetchDuplicateOrderAlerts error:", err);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = safe(search).toLowerCase();
    if (!q) return groups;

    return groups.filter((group) =>
      (group?.orders || []).some((o) => {
        const values = [
          o?.orderNumber,
          o?.phone,
          o?.pincode,
          o?.paymentMethod,
          o?.fulfillmentStatus,
        ]
          .map((x) => safe(x).toLowerCase())
          .join(" ");

        return values.includes(q);
      })
    );
  }, [groups, search]);

  const summary = useMemo(() => {
    const totalGroups = filteredGroups.length;
    const totalOrders = filteredGroups.reduce(
      (sum, g) => sum + Number(g?.count || g?.orders?.length || 0),
      0
    );

    return { totalGroups, totalOrders };
  }, [filteredGroups]);

  const exportCsv = () => {
    const rows = [];

    filteredGroups.forEach((group, index) => {
      (group?.orders || []).forEach((order) => {
        rows.push({
          groupNo: index + 1,
          groupCount: group?.count || 0,
          reasons: (group?.reasons || []).join(", "),
          orderNumber: safe(order?.orderNumber),
          phone: safe(order?.phone),
          pincode: safe(order?.pincode),
          paymentMethod: safe(order?.paymentMethod),
          fulfillmentStatus: safe(order?.fulfillmentStatus),
          createdAt: fmtDate(order?.createdAt),
        });
      });
    });

    const headers = [
      "Group No",
      "Group Count",
      "Reasons",
      "Order Number",
      "Phone",
      "Pincode",
      "Payment Method",
      "Fulfillment Status",
      "Created At",
    ];

    const escapeCsv = (value) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.groupNo,
          row.groupCount,
          row.reasons,
          row.orderNumber,
          row.phone,
          row.pincode,
          row.paymentMethod,
          row.fulfillmentStatus,
          row.createdAt,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `duplicate-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleMark = async () => {
    try {
      setMarking(true);
      const res = await markDuplicateOrderAlerts();
      setGroups(Array.isArray(res?.duplicateGroups) ? res.duplicateGroups : []);
    } catch (err) {
      console.error("markDuplicateOrderAlerts error:", err);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-black">
      <div className="w-full px-4 py-4 sm:px-5 lg:px-6">
        {/* Header */}
        <div className="mb-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-800">
                <ShieldAlert className="h-4 w-4" />
                Duplicate Order Alerts
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Duplicate Orders
              </h1>

              <p className="mt-1 text-sm text-neutral-600">
                Groups based on same phone, pincode and items for processing
                orders.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <button
                onClick={loadDuplicates}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Check
              </button>

              <button
                onClick={handleMark}
                disabled={marking}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-4 w-4" />
                {marking ? "Marking..." : "Mark Alerts"}
              </button>

              <button
                onClick={exportCsv}
                disabled={!filteredGroups.length}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-900 bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats + Search */}
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Duplicate Groups
              </div>
              <div className="text-3xl font-semibold">{summary.totalGroups}</div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <Package2 className="h-4 w-4 text-red-600" />
                Orders in Groups
              </div>
              <div className="text-3xl font-semibold">{summary.totalOrders}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order number, phone, pincode..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {/* Empty */}
        {!loading && !filteredGroups.length ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-200 bg-yellow-50 text-yellow-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No duplicate groups found</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Try running a fresh duplicate check.
            </p>
          </div>
        ) : null}

        {/* Groups */}
        <div className="space-y-5">
          {filteredGroups.map((group, groupIndex) => (
            <div
              key={`group-${groupIndex}`}
              className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
            >
              {/* Group Header */}
              <div className="border-b border-neutral-200 bg-gradient-to-r from-yellow-50 via-white to-red-50 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        Group {groupIndex + 1}
                      </span>

                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {group?.count || group?.orders?.length || 0} Orders
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-black">
                      Possible duplicate order cluster
                    </h3>

                    <p className="mt-1 text-sm text-neutral-600">
                      Match reasons: {(group?.reasons || []).join(", ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(group?.reasons || []).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700"
                      >
                        {reason.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 xl:grid-cols-2 2xl:grid-cols-3">
                {(group?.orders || []).map((order) => (
                  <div
                    key={order?._id}
                    className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:bg-white"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Order Number
                        </div>
                        <div className="truncate text-lg font-semibold text-black">
                          {order?.orderNumber || "-"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Alert
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
                        <Phone className="h-4 w-4 text-neutral-500" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Phone
                          </div>
                          <div className="truncate text-sm font-medium text-black">
                            {order?.phone || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
                        <MapPin className="h-4 w-4 text-neutral-500" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Pincode
                          </div>
                          <div className="truncate text-sm font-medium text-black">
                            {order?.pincode || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
                        <CreditCard className="h-4 w-4 text-neutral-500" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Payment Method
                          </div>
                          <div className="truncate text-sm font-medium capitalize text-black">
                            {order?.paymentMethod || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
                        <Clock3 className="h-4 w-4 text-neutral-500" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Created At
                          </div>
                          <div className="truncate text-sm font-medium text-black">
                            {fmtDate(order?.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-3 text-sm text-yellow-900">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                          <ShieldAlert className="h-4 w-4" />
                          Warning
                        </div>
                        <p>
                          Same phone, pincode and item combination found in this
                          processing group.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DuplicateOrders;