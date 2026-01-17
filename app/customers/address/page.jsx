"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomerStore } from "@/store/customerStore";
import { useAddressStore } from "@/store/addressStore";
import { useOrderStore } from "@/store/orderStore";
import {
  Search,
  Users,
  MapPin,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

const safe = (v) => String(v ?? "").trim();
const lower = (v) => safe(v).toLowerCase();

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function CustomerAddressIndexPage() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "withAddress" | "retarget"

  // Customers
  const {
    customers,
    loadingList,
    error: customerError,
    fetchCustomers,
  } = useCustomerStore();

  // Addresses (admin)
  const {
    allAddresses,
    loadingAll,
    errorAll,
    fetchAllAddresses,
  } = useAddressStore();

  // Orders (admin)
  const {
    orders,
    loading: loadingOrders,
    error: orderError,
    fetchAllOrders,
  } = useOrderStore();

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 2000 }); // increase if you have more customers
    fetchAllAddresses(); // should return all addresses (e.g. 69)
    fetchAllOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // customerId -> addresses[]
  const addressesByCustomerId = useMemo(() => {
    const map = new Map();

    for (const a of allAddresses || []) {
      const cid = safe(a?.customerId);
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(a);
    }

    // sort defaults first, then newest
    for (const [cid, list] of map.entries()) {
      list.sort((x, y) => {
        const xs = (x.isDefaultShipping ? 2 : 0) + (x.isDefaultBilling ? 1 : 0);
        const ys = (y.isDefaultShipping ? 2 : 0) + (y.isDefaultBilling ? 1 : 0);
        if (ys !== xs) return ys - xs;
        return new Date(y.createdAt || 0) - new Date(x.createdAt || 0);
      });
      map.set(cid, list);
    }

    return map;
  }, [allAddresses]);

  // customerId -> orders[]
  const ordersByCustomerId = useMemo(() => {
    const map = new Map();

    for (const o of orders || []) {
      const cid = safe(o?.customerId); // assumes order.customerId = customer mongo _id
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(o);
    }

    // newest first
    for (const [cid, list] of map.entries()) {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      map.set(cid, list);
    }

    return map;
  }, [orders]);

  // Merge ALL customers (do NOT filter out 0 address)
  const merged = useMemo(() => {
    const base = (customers || []).map((c) => {
      const cid = safe(c?._id);
      const addrs = addressesByCustomerId.get(cid) || [];
      const ords = ordersByCustomerId.get(cid) || [];
      return { customer: c, addresses: addrs, orders: ords };
    });

    const filteredByMode =
      filterMode === "withAddress"
        ? base.filter((x) => (x.addresses?.length || 0) > 0)
        : filterMode === "retarget"
        ? base.filter((x) => (x.addresses?.length || 0) > 0 && (x.orders?.length || 0) === 0)
        : base;

    const query = lower(q);
    if (!query) return filteredByMode;

    return filteredByMode.filter(({ customer, addresses, orders }) => {
      const hayCustomer =
        `${customer?.name} ${customer?.email} ${customer?.phone} ${customer?._id} ${customer?.firebaseUID}`.toLowerCase();

      if (hayCustomer.includes(query)) return true;

      const hitAddress = (addresses || []).some((a) =>
        `${a?.fullName} ${a?.phone} ${a?.addressLine1} ${a?.addressLine2} ${a?.city} ${a?.state} ${a?.postalCode} ${a?.country} ${a?.email} ${a?.firebaseUID}`
          .toLowerCase()
          .includes(query)
      );
      if (hitAddress) return true;

      const hitOrders = (orders || []).some((o) =>
        `${o?._id} ${o?.orderNumber} ${o?.paymentStatus} ${o?.fulfillmentStatus}`.toLowerCase().includes(query)
      );
      return hitOrders;
    });
  }, [customers, addressesByCustomerId, ordersByCustomerId, q, filterMode]);

  const loading = loadingList || loadingAll || loadingOrders;
  const error = customerError || errorAll || orderError;

  // IMPORTANT: address total should match backend count (e.g. 69)
  const totalAddresses = useMemo(() => (allAddresses?.length || 0), [allAddresses]);

  const stats = useMemo(() => {
    const totalCustomers = customers?.length || 0;

    const customersWithAddress = merged.filter((x) => (x.addresses?.length || 0) > 0).length;
    const retargetCount = merged.filter(
      (x) => (x.addresses?.length || 0) > 0 && (x.orders?.length || 0) === 0
    ).length;

    // how many addresses are represented in CURRENT filtered list
    const shownAddressesCount = merged.reduce((acc, x) => acc + (x.addresses?.length || 0), 0);

    return { totalCustomers, customersWithAddress, retargetCount, shownAddressesCount };
  }, [customers, merged]);

  return (
   <div className="p-6 space-y-5 bg-gray-50">
  {/* Header */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold flex items-center gap-2 text-gray-900">
        <Users className="h-6 w-6 text-gray-900" /> Customers / Address / Orders
      </h1>
      <p className="text-sm text-gray-500">
        Total addresses fetched: <span className="font-medium text-gray-900">{totalAddresses}</span>
        {totalAddresses ? " (should match your 69)" : ""}
      </p>
    </div>

    <div className="w-full sm:w-[520px] space-y-2">
      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.06)]">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, address, or order..."
          className="w-full outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Filter className="h-4 w-4 text-gray-700" />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded-xl bg-white px-3 py-2 text-sm text-gray-900 shadow-[0_1px_0_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.06)] outline-none"
          >
            <option value="all">All customers</option>
            <option value="withAddress">Only customers with address</option>
            <option value="retarget">Retarget: address ✔ + order 0</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          Customers: <span className="font-medium text-gray-900">{stats.totalCustomers}</span> • With address:{" "}
          <span className="font-medium text-gray-900">{stats.customersWithAddress}</span> • Retarget:{" "}
          <span className="font-medium text-gray-900">{stats.retargetCount}</span> • Addresses shown:{" "}
          <span className="font-medium text-gray-900">{stats.shownAddressesCount}</span>
        </div>
      </div>
    </div>
  </div>

  {/* Error */}
  {error ? (
    <div className="rounded-2xl bg-gray-900 text-white p-4 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      {error}
    </div>
  ) : null}

  {/* Loading */}
  {loading ? (
    <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-[0_1px_0_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.06)]">
      Loading customers, addresses & orders...
    </div>
  ) : (
    <div className="grid gap-4">
      {merged.map(({ customer, addresses, orders }) => {
        const cid = safe(customer?._id);
        const isOpen = openId === cid;
        const addressCount = addresses?.length || 0;
        const orderCount = orders?.length || 0;
        const lastOrder = orderCount ? orders[0] : null;

        return (
          <div
            key={cid}
            className="rounded-3xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_18px_50px_rgba(0,0,0,0.10)] hover:shadow-[0_1px_0_rgba(0,0,0,0.06),0_26px_70px_rgba(0,0,0,0.14)] transition"
          >
            {/* Customer row */}
            <button
              onClick={() => setOpenId(isOpen ? null : cid)}
              className="w-full text-left p-5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">
                    {customer?.name || "—"}
                  </p>

                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full ${
                      customer?.isActive
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {customer?.isActive ? "Active" : "Inactive"}
                  </span>

                  {addressCount > 0 && orderCount === 0 && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-200 text-gray-900">
                      Retarget
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 truncate">
                  {customer?.email || "—"} • {customer?.phone || "—"}
                </p>

                <p className="text-xs text-gray-500 mt-1 truncate">
                  Mongo: {cid || "—"} • UID: {customer?.firebaseUID || "—"}
                </p>

                {lastOrder && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Last order: {safe(lastOrder?.orderNumber) || safe(lastOrder?._id)} •{" "}
                    {fmtDate(lastOrder?.createdAt)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-800 inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-700" />
                  {addressCount}
                </span>
                <span className="text-xs text-gray-800 inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-gray-700" />
                  {orderCount}
                </span>

                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-700" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-700" />
                )}
              </div>
            </button>

            {/* Details */}
            {isOpen && (
              <div className="px-5 pb-5 space-y-5">
                {/* Addresses */}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Addresses <span className="text-gray-500">({addressCount})</span>
                  </p>

                  {addressCount === 0 ? (
                    <div className="text-sm text-gray-600">No addresses.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {addresses.map((a) => (
                        <div
                          key={a._id}
                          className="rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.06),0_14px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_1px_0_rgba(0,0,0,0.06),0_20px_55px_rgba(0,0,0,0.10)] transition relative"
                        >
                          <div className="absolute top-3 right-3 flex gap-1">
                            {a.isDefaultShipping && (
                              <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded-full">
                                Default Ship
                              </span>
                            )}
                            {a.isDefaultBilling && (
                              <span className="text-[10px] bg-gray-700 text-white px-2 py-0.5 rounded-full">
                                Default Bill
                              </span>
                            )}
                          </div>

                          <p className="font-semibold text-gray-900">
                            {a.fullName || "—"}
                          </p>
                          <p className="text-sm text-gray-700">{a.phone || "—"}</p>

                          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                            {a.addressLine1}
                            {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                            {a.landmark ? `, ${a.landmark}` : ""}
                            <br />
                            {a.city}, {a.state} – {a.postalCode}
                            <br />
                            {a.country}
                          </p>

                          <p className="text-[11px] text-gray-500 mt-2">
                            Type:{" "}
                            <span className="capitalize text-gray-900">{a.addressType || "—"}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orders */}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Orders <span className="text-gray-500">({orderCount})</span>
                  </p>

                  {orderCount === 0 ? (
                    <div className="text-sm text-gray-600">No orders yet.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {orders.slice(0, 6).map((o) => (
                        <div
                          key={o._id}
                          className="rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.06),0_14px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_1px_0_rgba(0,0,0,0.06),0_20px_55px_rgba(0,0,0,0.10)] transition"
                        >
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {safe(o?.orderNumber) || o._id}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Created: {fmtDate(o?.createdAt)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Payment:{" "}
                            <span className="font-medium text-gray-900">
                              {safe(o?.paymentStatus) || "—"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Fulfillment:{" "}
                            <span className="font-medium text-gray-900">
                              {safe(o?.fulfillmentStatus) || "—"}
                            </span>
                          </p>
                          {o?.totalAmount != null && (
                            <p className="text-xs text-gray-600 mt-1">
                              Total:{" "}
                              <span className="font-medium text-gray-900">{String(o.totalAmount)}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!merged.length && !loading && (
        <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-[0_1px_0_rgba(0,0,0,0.06),0_10px_30px_rgba(0,0,0,0.06)]">
          No results found.
        </div>
      )}
    </div>
  )}
</div>

  );
}
