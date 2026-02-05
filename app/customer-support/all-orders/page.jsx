"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Loader2, Search } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import OrderRow from "@/components/orders/OrderRow";

const safe = (v) => (v == null ? "" : String(v));

export default function AllOrdersPage() {
  const fetchAllOrders = useOrderStore((s) => s.fetchAllOrders);
  const storeOrders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);

  const [orders, setOrders] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");

  /* ---------------- load orders ---------------- */
  const load = async () => {
    try {
      await fetchAllOrders({});
    } catch {}
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOrders(Array.isArray(storeOrders) ? storeOrders : []);
  }, [storeOrders]);

  /* ---------------- local patch after update ---------------- */
  const onUpdated = (updated) => {
    if (!updated?._id) return;
    setOrders((prev) =>
      prev.map((o) => (String(o._id) === String(updated._id) ? updated : o))
    );
  };

  /* ---------------- search filter ---------------- */
  const filtered = useMemo(() => {
    const ono = orderNo.trim().toLowerCase();
    const ph = phone.replace(/[^\d]/g, "");

    return orders.filter((o) => {
      const orderMatch = ono
        ? safe(o?.orderNumber).toLowerCase().includes(ono)
        : true;

      const phoneVal =
        safe(o?.customerId?.phone) ||
        safe(o?.shippingAddressSnapshot?.phone);

      const phoneMatch = ph
        ? phoneVal.replace(/[^\d]/g, "").includes(ph)
        : true;

      return orderMatch && phoneMatch;
    });
  }, [orders, orderNo, phone]);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            All Orders
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered.length} orders
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          type="button"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="Search by Order Number"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:border-black/20"
          />
        </div>

        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Search by Phone Number"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:border-black/20"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {String(error)}
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr className="text-left text-[11px] font-bold text-gray-600">
                <th className="py-3 px-5">Order</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Payment</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    Loading orders…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    No matching orders
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <OrderRow
                    key={String(order?._id)}
                    order={order}
                    onUpdated={onUpdated}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Tip: Expand ▾ to see full order details. Priority can be changed directly
        from dropdown.
      </p>
    </div>
  );
}
