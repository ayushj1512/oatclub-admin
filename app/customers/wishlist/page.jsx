"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCustomerStore } from "@/store/customerStore";
import { useAdminProductStore } from "@/store/adminProductStore"; // ✅ use product store

const fmt = (n) => new Intl.NumberFormat("en-IN").format(Number(n || 0));
const money = (n) => `₹${fmt(n)}`;

// try best-guess for product display fields (safe for different schemas)
const getProductName = (p) =>
  (p?.name || p?.title || p?.productName || "").trim() || "Unnamed Product";

const getProductPrice = (p) => {
  // common fields
  if (p?.price != null) return Number(p.price) || 0;
  if (p?.sellingPrice != null) return Number(p.sellingPrice) || 0;

  // sometimes stored on variants
  if (Array.isArray(p?.variants) && p.variants.length) {
    const v = p.variants[0];
    if (v?.price != null) return Number(v.price) || 0;
  }
  return 0;
};

const getProductImage = (p) => {
  // common patterns
  if (typeof p?.image === "string" && p.image) return p.image;
  if (typeof p?.thumbnail === "string" && p.thumbnail) return p.thumbnail;
  if (typeof p?.mainImage === "string" && p.mainImage) return p.mainImage;

  if (Array.isArray(p?.images) && p.images.length) {
    const first = p.images[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }

  if (Array.isArray(p?.productImages) && p.productImages.length) {
    const first = p.productImages[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }

  return "";
};

function ProductMiniCard({ productId, product }) {
  const img = getProductImage(product);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-2 py-2">
      <div className="h-11 w-11 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={getProductName(product)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] text-neutral-500">No image</span>
        )}
      </div>

      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-neutral-900 truncate">
          {product ? getProductName(product) : productId}
        </div>
        <div className="text-[11px] text-neutral-600">
          {product ? money(getProductPrice(product)) : "Loading…"}
        </div>
      </div>
    </div>
  );
}

export default function CustomerWishlistPage() {
  const wishlistStore = useWishlistStore();
  const customerStore = useCustomerStore();
  const productStore = useAdminProductStore(); // ✅

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [q, setQ] = useState("");

  // product cache in component (id -> product)
  const [productMap, setProductMap] = useState(() => new Map());
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    wishlistStore.fetchAllWishlists({ page, limit });
    customerStore.fetchCustomers({ page: 1, limit: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const loading = wishlistStore.loading || customerStore.loadingList || productsLoading;
  const error = wishlistStore.error || customerStore.error || productsError;

  const customersByUID = useMemo(() => {
    const map = new Map();
    (customerStore.customers || []).forEach((c) => {
      const uid = String(c?.firebaseUID || "");
      if (!uid) return;

      // choose the "best" duplicate
      const score = (x) =>
        (x?.name?.trim() ? 2 : 0) +
        (x?.profileImage?.trim() ? 1 : 0) +
        (x?.phone?.trim() ? 1 : 0);

      const prev = map.get(uid);
      if (!prev || score(c) > score(prev)) map.set(uid, c);
    });
    return map;
  }, [customerStore.customers]);

  const rows = useMemo(() => {
    const list = Array.isArray(wishlistStore.wishlists) ? wishlistStore.wishlists : [];
    const query = q.trim().toLowerCase();

    const base = list.map((w) => {
      const uid = String(w?.firebaseUID || "");
      const c = customersByUID.get(uid) || null;

      const name = (c?.name || "").trim() || "Unnamed";
      const email = (c?.email || "").trim() || "—";
      const productIds = Array.isArray(w?.productIds) ? w.productIds.map(String) : [];
      const count = productIds.length;

      return { uid, name, email, count, productIds };
    });

    if (!query) return base;

    return base.filter((r) => {
      const hitProductId = r.productIds.some((pid) => pid.toLowerCase().includes(query));

      // ✅ also allow searching by product name if product already fetched
      const hitProductName = r.productIds.some((pid) => {
        const p = productMap.get(String(pid));
        const nm = p ? getProductName(p).toLowerCase() : "";
        return nm.includes(query);
      });

      return (
        r.name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.uid.toLowerCase().includes(query) ||
        hitProductId ||
        hitProductName
      );
    });
  }, [wishlistStore.wishlists, customersByUID, q, productMap]);

  // ✅ fetch products for currently visible rows (unique ids)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setProductsError("");

        // gather unique ids from current rows
        const ids = [...new Set(rows.flatMap((r) => r.productIds.map(String)).filter(Boolean))];

        // only fetch missing ones
        const missing = ids.filter((id) => !productMap.has(id));
        if (!missing.length) return;

        setProductsLoading(true);

        const products = await productStore.fetchProductsByIds(missing);
        if (cancelled) return;

        setProductMap((prev) => {
          const next = new Map(prev);
          (products || []).forEach((p) => {
            const id = String(p?._id || p?.id || "");
            if (id) next.set(id, p);
          });
          return next;
        });
      } catch (e) {
        if (!cancelled) setProductsError(e?.message || "Failed to load products");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]); // rows change => fetch missing product details

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-neutral-900">Customer Wishlists</div>
          <div className="text-sm text-neutral-500">
            Name • Email • Wishlist Count • Products (image/name/price)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="text-xs text-neutral-600">
            Search (name/email/productId/productName)
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="type to filter…"
              className="mt-1 w-full sm:w-[360px] px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </label>

          <label className="text-xs text-neutral-600">
            Limit
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="h-[42px] px-4 rounded-xl border border-neutral-200 text-sm"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="h-[42px] px-4 rounded-xl border border-neutral-200 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-neutral-200 bg-white">
          Total wishlists: <b className="ml-1">{fmt(wishlistStore.total)}</b>
        </span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl border border-neutral-200 bg-white">
          Showing: <b className="ml-1">{fmt(rows.length)}</b>
        </span>

        {loading ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-neutral-900 text-white">
            Loading…
          </span>
        ) : null}

        {error ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </span>
        ) : null}
      </div>

      {/* Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.uid + r.email} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{r.name}</div>
                  <div className="text-xs text-neutral-500">{r.email}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">UID: {r.uid}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Wishlist Count</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-xl border border-neutral-200 text-sm font-semibold">
                    {fmt(r.count)}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-neutral-500 mb-2">Products</div>

                {r.productIds.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {r.productIds.map((pid) => {
                      const product = productMap.get(String(pid)) || null;
                      return (
                        <ProductMiniCard key={pid} productId={pid} product={product} />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-600">—</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-neutral-600">
            No data
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-neutral-500">
        Note: customer list pagination hai (abhi page 1 se 500 customers load ho rahe). Agar kisi wishlist ka customer
        match nahi mile to email “—” aa sakta hai. Products yahan `fetchProductsByIds` se lazy-load ho rahe hain (sirf
        current page ke visible productIds).
      </div>
    </div>
  );
}
