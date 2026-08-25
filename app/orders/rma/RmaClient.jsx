  // app/orders/rma/RmaClient.jsx
  "use client";

  import React, { useCallback, useEffect, useMemo, useState } from "react";
  import {
    Check,
    CheckCheck,
    ChevronDown,
    Download,
    Loader2,
    RotateCcw,
    PackagePlus
  } from "lucide-react";
  import axios from "axios";

  import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
  import { useRmaStore } from "@/store/useRmaStore";
  import {
    formatCurrency,
    formatOrderNumber,
    formatRmaNumber,
  } from "@/utils/formatters";
  import { useOrderStore } from "@/store/orderStore";
import RmaRow from "@/components/orders/RmaRow";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import RmaRefundModal from "@/components/orders/RmaRefundModal";

  const API_BASE =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000";

  const str = (v) => (v == null ? "" : String(v));
  const norm = (v) => str(v).trim().toLowerCase();
  const pick = (...values) => values.find((v) => str(v).trim()) || "";
  const safeArray = (value) =>
    Array.isArray(value) ? value : [];

  const parseDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const formatDate = (value) => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-IN") : "-";
  };

  const endOfDay = (value) => {
    const date = parseDate(value);
    if (!date) return null;
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const statusBadge = (status) => {
    const value = norm(status);

    if (value === "requested")
      return "bg-purple-50 text-purple-700 ring-purple-100";

    if (value === "approved")
      return "bg-green-50 text-green-700 ring-green-100";

    if (value === "rejected")
      return "bg-red-50 text-red-700 ring-red-100";

    return "bg-gray-100 text-gray-700 ring-gray-200";
  };

  const typeBadge = (type) => {
    const value = norm(type);

    if (value === "exchange")
      return "bg-amber-50 text-amber-800 ring-amber-100";

    if (value === "return")
      return "bg-sky-50 text-sky-700 ring-sky-100";

    return "bg-gray-100 text-gray-700 ring-gray-200";
  };

  const fulfilledBadge = (fulfilled) =>
    fulfilled
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-orange-50 text-orange-700 ring-orange-200";

  export default function RmaClient() {
    const [expanded, setExpanded] = useState(null);
    const [selected, setSelected] = useState([]);

    const [orderSearch, setOrderSearch] = useState("");
    const [mobileSearch, setMobileSearch] = useState("");
    const [fulfilledFilter, setFulfilledFilter] = useState("all");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortDir, setSortDir] = useState("desc");
    const [updating, setUpdating] = useState([]);
    const [creatingPickup, setCreatingPickup] = useState([]);
    const duplicateExchangeOrder =
      useOrderStore((s) => s.duplicateExchangeOrder);

    const syncReversePickup =
      useShiprocketStore((s) => s.syncReversePickup);

    const [syncingReverse, setSyncingReverse] = useState([]);
    const [bulkSyncingReverse, setBulkSyncingReverse] = useState(false);

    const [creatingExchange, setCreatingExchange] = useState([]);
    const [creditAmount, setCreditAmount] = useState({});
    const [creditNote, setCreditNote] = useState({});
    const [creditLoading, setCreditLoading] = useState([]);
    const [refundRma, setRefundRma] = useState(null);

    const {
      rmas,
      loading,
      error,
      fetchAllRmas,
    } = useRmaStore();

    useEffect(() => {
      fetchAllRmas();
    }, [fetchAllRmas]);

    const statusOptions = useMemo(
      () => [
        "all",
        ...new Set(
          (rmas || [])
            .map((rma) => norm(rma?.status))
            .filter(Boolean)
        ),
      ],
      [rmas]
    );

    const typeOptions = useMemo(
      () => [
        "all",
        ...new Set(
          (rmas || [])
            .map((rma) => norm(rma?.type))
            .filter(Boolean)
        ),
      ],
      [rmas]
    );

    const filteredRmas = useMemo(() => {
      const orderQ = norm(orderSearch);
      const mobileQ = norm(mobileSearch);

      const from = parseDate(fromDate);
      const to = endOfDay(toDate);

      return [...(rmas || [])]
        .filter((rma) => {
          const address = rma?.shippingAddressSnapshot || {};
          const customer = rma?.customer || {};

          if (
            orderQ &&
            !norm(rma?.orderNumber).includes(orderQ) &&
            !norm(rma?.rmaNumber).includes(orderQ)
          ) {
            return false;
          }

          const mobile = pick(
            address?.phone,
            customer?.phone
          );

          if (
            mobileQ &&
            !norm(mobile).includes(mobileQ)
          ) {
            return false;
          }

          if (
            fulfilledFilter === "fulfilled" &&
            rma?.isFulfilled !== true
          ) {
            return false;
          }

          if (
            fulfilledFilter === "pending" &&
            rma?.isFulfilled === true
          ) {
            return false;
          }

          if (
            statusFilter !== "all" &&
            norm(rma?.status) !== norm(statusFilter)
          ) {
            return false;
          }

          if (
            typeFilter !== "all" &&
            norm(rma?.type) !== norm(typeFilter)
          ) {
            return false;
          }




          const createdAt = parseDate(rma?.createdAt);

          if ((from || to) && !createdAt) return false;
          if (from && createdAt < from) return false;
          if (to && createdAt > to) return false;

          return true;
        })
        .sort((a, b) => {
          const aTime = parseDate(a?.createdAt)?.getTime() || 0;
          const bTime = parseDate(b?.createdAt)?.getTime() || 0;

          return sortDir === "asc"
            ? aTime - bTime
            : bTime - aTime;
        });
    }, [
      rmas,
      orderSearch,
      mobileSearch,
      fulfilledFilter,
      fromDate,
      toDate,
      statusFilter,
      typeFilter,
      sortDir,
    ]);

    const getKey = (rma) =>
      `${rma?.orderId || ""}:${rma?.rmaNumber || ""}`;

    const toggleExpand = useCallback((key) => {
      setExpanded((current) =>
        current === key ? null : key
      );
    }, []);

    const toggleSelected = (rma) => {
      const key = getKey(rma);

      setSelected((current) =>
        current.includes(key)
          ? current.filter((x) => x !== key)
          : [...current, key]
      );
    };

    const allVisibleSelected =
      filteredRmas.length > 0 &&
      filteredRmas.every((rma) =>
        selected.includes(getKey(rma))
      );

    const toggleSelectAll = () => {
      const visibleKeys = filteredRmas.map(getKey);

      if (allVisibleSelected) {
        setSelected((current) =>
          current.filter(
            (key) => !visibleKeys.includes(key)
          )
        );
      } else {
        setSelected((current) => [
          ...new Set([
            ...current,
            ...visibleKeys,
          ]),
        ]);
      }
    };

    const updateFulfilled = async (
      rma,
      isFulfilled
    ) => {
      const key = getKey(rma);

      try {
        setUpdating((current) => [
          ...current,
          key,
        ]);

        await axios.patch(
          `${API_BASE}/api/orders/${rma.orderId}/rma/${encodeURIComponent(
            rma.rmaNumber
          )}`,
          {
            isFulfilled,
          },
          {
            withCredentials: true,
          }
        );

        await fetchAllRmas();
      } catch (error) {
        console.error(
          "Failed to update RMA fulfilled status:",
          error
        );

        alert(
          error?.response?.data?.message ||
          "Failed to update RMA"
        );
      } finally {
        setUpdating((current) =>
          current.filter((x) => x !== key)
        );
      }
    };

    const createReturnPickup = async (rma) => {
      const key = getKey(rma);

      if (!rma?.orderId || !rma?.rmaNumber) {
        alert("Order ID or RMA number missing");
        return;
      }

      try {
        setCreatingPickup((current) => [...current, key]);

        const { data } = await axios.post(
          `${API_BASE}/api/shiprocket/return/${rma.orderId}/${encodeURIComponent(
            rma.rmaNumber
          )}`,
          {},
          {
            withCredentials: true,
          }
        );

        await fetchAllRmas();

        alert(
          data?.message ||
          "Return pickup created successfully"
        );
      } catch (error) {
        console.error(
          "Create return pickup failed:",
          error
        );

        alert(
          error?.response?.data?.message ||
          "Failed to create return pickup"
        );
      } finally {
        setCreatingPickup((current) =>
          current.filter((x) => x !== key)
        );
      }
    };
    const handleReverseSync = async (rma) => {
      const key = getKey(rma);

      if (!rma?.orderId || !rma?.rmaNumber) {
        return alert("Order ID or RMA number missing");
      }

      try {
        setSyncingReverse((s) => [...s, key]);

        const data = await syncReversePickup(
          rma.orderId,
          rma.rmaNumber
        );

        await fetchAllRmas();

        alert(
          data?.message ||
          "Reverse shipment synced"
        );
      } catch (err) {
        alert(
          err?.message ||
          "Reverse shipment sync failed"
        );
      } finally {
        setSyncingReverse((s) =>
          s.filter((x) => x !== key)
        );
      }
    };

    const bulkSyncReversePickups = async () => {
      const targets = filteredRmas.filter(
        (rma) =>
          !rma?.returnPickupCompleted &&
          (
            rma?.reverseShipment?.shipmentId ||
            rma?.reverseShipment?.orderId
          )
      );

      if (!targets.length) {
        return alert("No pending reverse pickups to sync");
      }

      try {
        setBulkSyncingReverse(true);

        const keys = targets.map(getKey);
        setSyncingReverse(keys);

        let synced = 0;
        let completed = 0;
        let failed = 0;

        // sequential = safer for Shiprocket rate limits
        for (const rma of targets) {
          try {
            const data = await syncReversePickup(
              rma.orderId,
              rma.rmaNumber
            );

            synced++;

            if (data?.reverseShipment?.pickupCompleted) {
              completed++;
            }
          } catch (err) {
            failed++;

            console.error(
              `Reverse sync failed: ${rma?.rmaNumber}`,
              err
            );
          }
        }

        await fetchAllRmas();

        alert(
          `Sync complete\nSynced: ${synced}\nPickup completed: ${completed}\nFailed: ${failed}`
        );
      } finally {
        setBulkSyncingReverse(false);
        setSyncingReverse([]);
      }
    };


    const createExchangeOrder = async (rma) => {
      const key = getKey(rma);

      const exchange =
        rma?.exchangeTo ||
        rma?.exchangeRequest ||
        {};

      if (!exchange?.productId || !exchange?.variantId) {
        return alert("Exchange product or size missing");
      }

      try {
        setCreatingExchange((s) => [...s, key]);

        const order = await duplicateExchangeOrder(
          rma.orderId,
          {
            rmaNumber: rma.rmaNumber,
            reason: rma?.reason || "other",
            items: [
              {
                productId: exchange.productId,
                variantId: exchange.variantId,
                quantity: Math.max(
                  1,
                  (rma?.items || []).reduce(
                    (sum, item) =>
                      sum + Number(item?.quantity || 1),
                    0
                  )
                ),
              },
            ],
          }
        );

        await fetchAllRmas();

        alert(
          `Exchange order created: ${formatOrderNumber(
            order?.orderNumber
          )}`
        );
      } catch (e) {
        alert(e?.message || "Failed to create exchange order");
      } finally {
        setCreatingExchange((s) =>
          s.filter((x) => x !== key)
        );
      }
    };

    const addRefundCredit = async (rma) => {
      const key = getKey(rma);

      const amount =
        Number(creditAmount[key]) ||
        Number(rma?.refundEligibleAmount || 0);

      const note = String(
        creditNote[key] || ""
      ).trim();

      if (!rma?.customer?._id) {
        return alert("Customer missing");
      }

      if (!amount || amount <= 0) {
        return alert("Enter valid amount");
      }

      if (!note) {
        return alert("Credit note is required");
      }

      try {
        setCreditLoading((s) => [...s, key]);

        const { data } = await axios.post(
          `${API_BASE}/api/customers/${rma.customer._id}/credits/add`,
          {
            amount,
            type: "refund",

            reason: note,
            notes: `RMA ${rma.rmaNumber}`,

            orderId: rma.orderId,
            orderNumber: rma.orderNumber,

            addedBy: "admin",
          },
          {
            withCredentials: true,
          }
        );

        alert(
          data?.message ||
          "Customer credit added"
        );

        setCreditAmount((s) => ({
          ...s,
          [key]: "",
        }));

        setCreditNote((s) => ({
          ...s,
          [key]: "",
        }));

        await fetchAllRmas();
      } catch (err) {
        alert(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to add credit"
        );
      } finally {
        setCreditLoading((s) =>
          s.filter((x) => x !== key)
        );
      }
    };

    const bulkMarkFulfilled = async () => {
      const targets = filteredRmas.filter(
        (rma) =>
          selected.includes(getKey(rma)) &&
          rma?.isFulfilled !== true
      );

      if (!targets.length) return;

      try {
        const keys = targets.map(getKey);

        setUpdating((current) => [
          ...new Set([...current, ...keys]),
        ]);

        await Promise.all(
          targets.map((rma) =>
            axios.patch(
              `${API_BASE}/api/orders/${rma.orderId}/rma/${encodeURIComponent(
                rma.rmaNumber
              )}`,
              {
                isFulfilled: true,
              },
              {
                withCredentials: true,
              }
            )
          )
        );

        setSelected([]);
        await fetchAllRmas();
      } catch (error) {
        console.error(
          "Bulk fulfilled update failed:",
          error
        );

        alert(
          error?.response?.data?.message ||
          "Bulk update failed"
        );
      } finally {
        setUpdating([]);
      }
    };

    const downloadExcel = () => {
      if (!filteredRmas.length) return;

      const getSizeFromAttributes = (attributes = []) =>
        pick(
          ...safeArray(attributes)
            .filter((attr) => norm(attr?.key) === "size")
            .map((attr) => attr?.value)
        );

      const rows = filteredRmas.flatMap((rma) => {
        const address =
          rma?.shippingAddressSnapshot || {};

        const customer =
          rma?.customer || {};

        const orderItems =
          safeArray(rma?.orderItems);

        const rmaItems =
          safeArray(rma?.items);

        const newSize =
          norm(rma?.type) === "exchange"
            ? getSizeFromAttributes(
              rma?.exchangeTo?.attributes
            )
            : "";

        const baseRow = {
          "Order Number": rma?.orderNumber || "",
          "RMA Number": rma?.rmaNumber || "",
          Type: rma?.type || "",
          "RMA Status": rma?.status || "",
          Fulfilled: rma?.isFulfilled
            ? "Yes"
            : "No",
          Customer:
            address?.fullName ||
            customer?.name ||
            "",
          Mobile:
            address?.phone ||
            customer?.phone ||
            "",
          Email:
            address?.email ||
            customer?.email ||
            "",
          Reason: rma?.reason || "",
          Note: rma?.customerNote || "",
          Amount:
            rma?.finalPayable ??
            rma?.totalAmount ??
            0,
          "Payment Method":
            rma?.paymentMethod || "",
          "Payment Status":
            rma?.paymentStatus || "",
          "Fulfillment Status":
            rma?.fulfillmentStatus || "",
          City: address?.city || "",
          State: address?.state || "",
          Pincode: address?.pincode || "",
          "RMA Created":
            formatDate(rma?.createdAt),
          "Order Date":
            formatDate(rma?.orderDate),
        };

        if (!rmaItems.length) {
          return [{
            ...baseRow,
            "Product Code": "",
            "Previous Size / Size": "",
            "New Size": newSize,
            Qty: "",
          }];
        }

        return rmaItems.map((item) => {
          const matchedOrderItem =
            orderItems.find(
              (orderItem) =>
                str(orderItem?.lineId) ===
                str(item?.orderLineId)
            ) ||
            orderItems[item?.orderItemIndex] ||
            null;

          const previousSize = pick(
            item?.selectedSize,
            matchedOrderItem?.selectedSize,
            matchedOrderItem?.size,
            getSizeFromAttributes(
              matchedOrderItem?.variant?.attributes
            ),
            getSizeFromAttributes(
              matchedOrderItem?.attributes
            )
          );

          const productCode = pick(
            item?.productCode,
            matchedOrderItem?.productSnapshot
              ?.productCode,
            matchedOrderItem?.productCode,
            matchedOrderItem?.code
          );

          return {
            ...baseRow,
            "Product Code": productCode,
            "Previous Size / Size": previousSize,
            "New Size":
              norm(rma?.type) === "exchange"
                ? newSize
                : "",
            Qty: item?.quantity || 1,
          };
        });
      });

      const headers = Object.keys(rows[0]);

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
          </head>
          <body>
            <table border="1">
              <thead>
                <tr>
                  ${headers
          .map(
            (header) =>
              `<th>${header}</th>`
          )
          .join("")}
                </tr>
              </thead>

              <tbody>
                ${rows
          .map(
            (row) => `
                      <tr>
                        ${headers
                .map(
                  (header) =>
                    `<td>${str(
                      row[header]
                    )
                      .replaceAll("&", "&amp;")
                      .replaceAll("<", "&lt;")
                      .replaceAll(">", "&gt;")}</td>`
                )
                .join("")}
                      </tr>
                    `
          )
          .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel",
      });

      const url = URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = `rma-production-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
      setOrderSearch("");
      setMobileSearch("");
      setFulfilledFilter("all");
      setFromDate("");
      setToDate("");
      setStatusFilter("all");
      setTypeFilter("all");
      setSortDir("desc");
    };

    return (
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              RMA Requests
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage return and exchange requests.
            </p>
          </div>



          <div className="flex flex-wrap gap-2">
            {selected.length > 0 && (
              <button
                onClick={bulkMarkFulfilled}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <CheckCheck size={16} />
                Mark Fulfilled ({selected.length})
              </button>
            )}

            <button
              onClick={bulkSyncReversePickups}
              disabled={bulkSyncingReverse}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {bulkSyncingReverse ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}

              {bulkSyncingReverse
                ? "Syncing Reverse..."
                : "Sync All Reverse"}
            </button>

            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="xl:col-span-2">
              <label className="text-xs text-gray-500">
                Order / RMA Number
              </label>

              <input
                value={orderSearch}
                onChange={(e) =>
                  setOrderSearch(e.target.value)
                }
                placeholder="000205 / RMA-..."
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">
                Mobile
              </label>

              <input
                value={mobileSearch}
                onChange={(e) =>
                  setMobileSearch(e.target.value)
                }
                placeholder="9876543210"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">
                Fulfilled
              </label>

              <select
                value={fulfilledFilter}
                onChange={(e) =>
                  setFulfilledFilter(e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">
                  Pending
                </option>
                <option value="fulfilled">
                  Fulfilled
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">
                From
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">
                To
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">
                RMA Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize"
              >
                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">
                Type
              </label>

              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize"
              >
                {typeOptions.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filteredRmas.length} requests
            </p>

            <button
              onClick={clearFilters}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-gray-500">
            Loading RMA requests...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {str(error)}
          </div>
        )}

        {!loading &&
          filteredRmas.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="w-10 p-4">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>

                      <th className="w-10 p-4" />

                      <th className="p-4 text-left">
                        Order #
                      </th>

                      <th className="p-4 text-left">
                        RMA #
                      </th>

                      <th className="p-4 text-left">
                        Type
                      </th>

                      <th className="p-4 text-left">
                        Status
                      </th>

                      <th className="p-4 text-left">
                        Fulfilled
                    </th>
                    <th className="p-4 text-left">Pickup</th>

                    <th className="p-4 text-left">
                      Reverse Shipment
                    </th>

                    <th className="p-4 text-left">Refund Eligible</th>
                    <th className="p-4 text-left">Refunded</th>


                      <th className="p-4 text-left">
                        Customer
                      </th>

                      <th className="p-4 text-left">
                        Mobile
                      </th>

                      <th className="p-4 text-left">
                        Created
                      </th>

                      <th className="p-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                  {filteredRmas.map((rma, index) => {
                    const rowKey =
                      getKey(rma) || `${index}`;

                    return (
                      <RmaRow
                        key={rowKey}
                        rma={rma}
                        rowKey={rowKey}

                        isOpen={expanded === rowKey}
                        selected={selected}
                        toggleSelected={toggleSelected}
                        toggleExpand={toggleExpand}

                        updating={updating}
                        creatingPickup={creatingPickup}
                        creatingExchange={creatingExchange}

                        syncingReverse={syncingReverse}
                        syncReversePickup={handleReverseSync}

                        createReturnPickup={createReturnPickup}
                        createExchangeOrder={createExchangeOrder}
                        updateFulfilled={updateFulfilled}

                        openRefundModal={setRefundRma}

                        fetchAllRmas={fetchAllRmas}

                        creditAmount={creditAmount}
                        setCreditAmount={setCreditAmount}

                        creditNote={creditNote}
                        setCreditNote={setCreditNote}

                        creditLoading={creditLoading}
                        addRefundCredit={addRefundCredit}
                      />
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        <RmaRefundModal
          rma={refundRma}
          open={Boolean(refundRma)}
          onClose={() => setRefundRma(null)}
          onSuccess={async () => {
            setRefundRma(null);
            await fetchAllRmas();
          }}
        />
      </div>
    );
  }
