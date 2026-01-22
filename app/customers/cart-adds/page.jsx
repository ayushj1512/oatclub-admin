"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const API_ROOT = BASE_URL ? `${BASE_URL}/api` : "/api";

/**
 * Try multiple endpoints + (optionally) pagination.
 * NOTE: Many backends return only 10/20 records by default.
 */
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
  const src = candidates.find((x) => typeof x === "string" && x.trim().length);
  return src || "";
};

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: "include" });

  // safer parsing (some APIs return empty body on errors)
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed: ${res.status}`;
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
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.docs)) return payload.docs; // mongoose paginate style
  return [];
}

/**
 * Detect pagination fields commonly used across APIs.
 * If supported, we keep fetching pages until exhausted.
 */
function getPaginationMeta(payload) {
  // common shapes:
  // { page, totalPages } or { page, pages } or { pagination: { page, totalPages } }
  const p = payload?.pagination || payload?.meta?.pagination || payload?.meta;
  const page =
    Number(payload?.page ?? p?.page ?? payload?.currentPage ?? p?.currentPage) ||
    null;

  const totalPages =
    Number(
      payload?.totalPages ??
        p?.totalPages ??
        payload?.pages ??
        p?.pages ??
        payload?.lastPage ??
        p?.lastPage
    ) || null;

  const limit =
    Number(payload?.limit ?? p?.limit ?? payload?.perPage ?? p?.perPage) || null;

  const hasNext =
    typeof payload?.hasNext === "boolean"
      ? payload.hasNext
      : typeof p?.hasNext === "boolean"
      ? p.hasNext
      : null;

  const nextPage =
    Number(payload?.nextPage ?? p?.nextPage ?? payload?.next ?? p?.next) || null;

  return { page, totalPages, limit, hasNext, nextPage };
}

function withParams(url, params) {
  const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null) return;
    u.searchParams.set(k, String(v));
  });
  // keep original absolute/relative behavior
  if (url.startsWith("http")) return u.toString();
  return u.pathname + (u.search || "");
}

async function fetchAllPages(url) {
  // Try “big limit” first (most APIs respect this).
  // If the API is non-paginated, we just return the first list.
  const firstUrl = withParams(url, { limit: 1000, perPage: 1000, page: 1 });
  const first = await fetchJSON(firstUrl);
  const firstList = normalizeCustomerList(first);

  // single-customer response
  if (!firstList.length && first?._id) return [first];

  const meta = getPaginationMeta(first);

  // If API doesn’t indicate pagination, return what we got.
  // (Still good because we asked for limit=1000.)
  if (!meta.totalPages && meta.hasNext == null && !meta.nextPage) {
    return firstList;
  }

  const all = [...firstList];

  // Determine next page strategy
  let page = meta.page || 1;
  const totalPages = meta.totalPages || null;

  while (true) {
    const next =
      meta.nextPage
        ? meta.nextPage
        : meta.hasNext === true
        ? page + 1
        : totalPages && page < totalPages
        ? page + 1
        : null;

    if (!next) break;
    if (totalPages && next > totalPages) break;

    const pageUrl = withParams(url, { limit: 1000, perPage: 1000, page: next });
    const data = await fetchJSON(pageUrl);
    const list = normalizeCustomerList(data);
    if (!list.length) break;

    all.push(...list);
    page = next;

    const m = getPaginationMeta(data);
    if (m.hasNext === false) break;
    if (m.totalPages && page >= m.totalPages) break;
    if (!m.totalPages && m.hasNext == null && !m.nextPage) {
      // pagination info disappeared; stop
      break;
    }
  }

  return all;
}

async function fetchCustomersSmart() {
  let lastErr = null;

  for (const url of CUSTOMER_LIST_CANDIDATES) {
    try {
      const list = await fetchAllPages(url);
      return { url, list: Array.isArray(list) ? list : [] };
    } catch (e) {
      lastErr = e;
      // If 404, try next candidate; otherwise stop
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
  const [productsById, setProductsById] = useState({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);

        const { list } = await fetchCustomersSmart();
        if (cancelled) return;

        setCustomers(list);

        // ✅ collect product identifiers from embedded cartAdds
        // Some backends store productId, some store productCode.
        const ids = Array.from(
          new Set(
            list
              .flatMap((c) => (Array.isArray(c?.cartAdds) ? c.cartAdds : []))
              .map((x) => safe(x?.productId || x?.product || x?.productCode))
              .filter(Boolean)
          )
        );

        if (!ids.length) return;

        setLoadingProducts(true);

        // fetchProductsByIds might accept IDs OR codes; we pass whatever we have.
        const products = await fetchProductsByIds?.(ids);

        if (cancelled) return;

        const mapByCode = {};
        const mapById = {};

        (Array.isArray(products) ? products : []).forEach((p) => {
          const code = safe(p?.productCode);
          const id = safe(p?._id || p?.id);

          if (code) mapByCode[code] = p;
          if (id) mapById[id] = p;
        });

        setProductsByCode(mapByCode);
        setProductsById(mapById);
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
          const t = new Date(it?.lastAddedAt || it?.createdAt || 0).getTime();
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

  const productCount = useMemo(() => {
    const byCode = Object.keys(productsByCode || {}).length;
    const byId = Object.keys(productsById || {}).length;
    return Math.max(byCode, byId);
  }, [productsByCode, productsById]);

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
            <b className="text-gray-900">
              {loading ? "…" : totals.customerCount}
            </b>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Total Adds:{" "}
            <b className="text-gray-900">{loading ? "…" : totals.totalAdds}</b>
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Products:{" "}
            <b className="text-gray-900">{loadingProducts ? "…" : productCount}</b>
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
                  new Date(b?.lastAddedAt || b?.createdAt || 0).getTime() -
                  new Date(a?.lastAddedAt || a?.createdAt || 0).getTime()
              );

            return (
              <div
                key={g.customerId || Math.random()}
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
                      <div>
                        Last: <span className="text-gray-800">{last}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* table */}
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
                          const pid = safe(it?.productId || it?.product);

                          // lookup by code first, then by id
                          const p =
                            (code && productsByCode?.[code]) ||
                            (pid && productsById?.[pid]) ||
                            null;

                          const title = safe(p?.title || p?.name || "");
                          const img = pickImage(p);
                          const price = p?.price != null ? money(p.price) : "-";
                          const lastAdded = fmtDateTime(it?.lastAddedAt || it?.createdAt);

                          return (
                            <tr
                              key={`${g.customerId}-${code || pid || "p"}-${idx}`}
                              className="border-b border-gray-100"
                            >
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-9 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
                                    {img ? (
                                      <img
                                        src={img}
                                        alt={title || code || pid || "Product"}
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
                                        : title || code || pid || "-"}
                                    </div>
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
