"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const API_ROOT = BASE_URL ? `${BASE_URL}/api` : "/api";

const CUSTOMER_LIST_CANDIDATES = [
  `${API_ROOT}/customers`,
  `${API_ROOT}/customer`,
  `${API_ROOT}/users`,
];

const safe = (v) => String(v ?? "").trim();

const fmtDateTime = (d) => {
  const dt = d ? new Date(d) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return `₹${num.toLocaleString("en-IN")}`;
};

const pickImage = (p) => {
  const candidates = [
    p?.thumbnail,
    p?.image,
    ...(Array.isArray(p?.images) ? p.images : []),
  ];
  const src = candidates.find(
    (x) => typeof x === "string" && x.trim().length > 0
  );
  return src || "";
};

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return data;
}

function normalizeCustomerList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function fetchCustomersSmart() {
  let lastErr = null;

  for (const url of CUSTOMER_LIST_CANDIDATES) {
    try {
      const data = await fetchJSON(url);
      const list = normalizeCustomerList(data);
      if (!list.length && data?._id) return { url, list: [data] };
      return { url, list };
    } catch (e) {
      lastErr = e;
      if (e?.status !== 404) break;
    }
  }

  throw lastErr || new Error("Failed to fetch customers");
}

export default function CustomerCartAddsPage() {
  const fetchProductsByIds = useAdminProductStore((s) => s.fetchProductsByIds);

  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [productsByCode, setProductsByCode] = useState({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);

        const { list } = await fetchCustomersSmart();
        if (cancelled) return;

        setCustomers(list);

        // ✅ collect product codes from embedded cartAdds
        const codes = Array.from(
          new Set(
            list
              .flatMap((c) => (Array.isArray(c?.cartAdds) ? c.cartAdds : []))
              .map((x) => safe(x?.productCode))
              .filter(Boolean)
          )
        );

        if (!codes.length) return;

        setLoadingProducts(true);
        const products = await fetchProductsByIds?.(codes);

        if (cancelled) return;

        const map = {};
        (Array.isArray(products) ? products : []).forEach((p) => {
          const code = safe(p?.productCode);
          if (code) map[code] = p;
        });

        setProductsByCode(map);
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "Failed to load cart adds");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingProducts(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchProductsByIds]);

  // ✅ build groups + remove customers with null/empty cartAdds
  const groups = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];

    const rows = list
      .map((c) => {
        const cartAdds = Array.isArray(c?.cartAdds) ? c.cartAdds : [];

        const lastAddedAt = cartAdds.reduce((acc, it) => {
          const t = new Date(it?.lastAddedAt || 0).getTime();
          return t > acc ? t : acc;
        }, 0);

        return {
          customer: c,
          customerId: safe(c?._id || c?.id),
          cartAdds,
          total: cartAdds.length,
          lastAddedAt,
        };
      })
      .filter((g) => g.total > 0);

    rows.sort((a, b) => (b.lastAddedAt || 0) - (a.lastAddedAt || 0));
    return rows;
  }, [customers]);

  const totals = useMemo(() => {
    const customerCount = groups.length;
    const totalAdds = groups.reduce((acc, g) => acc + (Number(g.total) || 0), 0);
    return { customerCount, totalAdds };
  }, [groups]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cart Adds</h1>
          <p className="text-sm text-gray-600">
            Customers who added products to cart.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-700">
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Customers:{" "}
            <b className="text-gray-900">{loading ? "…" : totals.customerCount}</b>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Total Adds:{" "}
            <b className="text-gray-900">{loading ? "…" : totals.totalAdds}</b>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Products:{" "}
            <b className="text-gray-900">
              {loadingProducts ? "…" : Object.keys(productsByCode || {}).length}
            </b>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          No cart adds found.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const c = g.customer || {};
            const name = safe(c?.name || c?.fullName || c?.firstName || "");
            const email = safe(c?.email || "");
            const phone = safe(c?.phone || c?.mobile || "");

            const total = Number(g.total) || 0;
            const last = g.lastAddedAt ? fmtDateTime(g.lastAddedAt) : "-";

            const cartAddsSorted = g.cartAdds
              .slice()
              .sort(
                (a, b) =>
                  new Date(b?.lastAddedAt || 0).getTime() -
                  new Date(a?.lastAddedAt || 0).getTime()
              );

            return (
              <div
                key={g.customerId}
                className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
              >
                {/* header */}
                <div className="px-4 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {name || email || phone || "Customer"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
                        {email ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            {email}
                          </span>
                        ) : null}
                        {phone ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            {phone}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-0 text-right text-xs text-gray-600">
                      <div>
                        <span className="text-gray-900 font-semibold">{total}</span>{" "}
                        adds
                      </div>
                      <div>Last: <span className="text-gray-800">{last}</span></div>
                    </div>
                  </div>
                </div>

                {/* table (always visible) */}
                <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-[11px] font-semibold text-gray-500">
                            Product
                          </th>
                          <th className="py-2 text-left text-[11px] font-semibold text-gray-500">
                            Product Code
                          </th>
                          <th className="py-2 text-left text-[11px] font-semibold text-gray-500">
                            Price
                          </th>
                          <th className="py-2 text-left text-[11px] font-semibold text-gray-500">
                            Last Added
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {cartAddsSorted.map((it, idx) => {
                          const code = safe(it?.productCode);
                          const p = code ? productsByCode?.[code] : null;

                          const title = safe(p?.title || p?.name || "");
                          const img = pickImage(p);
                          const price = p?.price != null ? money(p.price) : "-";
                          const lastAdded = fmtDateTime(it?.lastAddedAt);

                          return (
                            <tr
                              key={`${g.customerId}-${code || "pc"}-${idx}`}
                              className="border-b border-gray-100"
                            >
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-9 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
                                    {img ? (
                                      <img
                                        src={img}
                                        alt={title || code}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                                        No image
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-gray-900">
                                      {loadingProducts && !p
                                        ? "Loading..."
                                        : title || code || "-"}
                                    </div>
                                    {/* ✅ ID removed, only code is primary */}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 pr-3 text-sm font-semibold text-gray-900">
                                {code || "-"}
                              </td>

                              <td className="py-3 pr-3 text-sm text-gray-800">
                                {loadingProducts && !p ? "-" : price}
                              </td>

                              <td className="py-3 text-sm text-gray-700">
                                {lastAdded}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
