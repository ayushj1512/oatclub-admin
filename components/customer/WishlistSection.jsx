"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ExternalLink, Loader2, Package } from "lucide-react";

import { useWishlistStore } from "@/store/wishlistStore";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function WishlistSection({ firebaseUID, customerId }) {
  const { productIds, loading, error, fetchWishlist } = useWishlistStore();
  const { fetchProductsByIds } = useAdminProductStore();

  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(null);

  // 🔄 Load wishlist when UID changes
  useEffect(() => {
    if (firebaseUID) fetchWishlist(firebaseUID);
  }, [firebaseUID, fetchWishlist]);

  // 🔄 Fetch product objects by wishlist ids
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      setProdError(null);

      if (!productIds?.length) {
        setProducts([]);
        return;
      }

      try {
        setProdLoading(true);
        const list = await fetchProductsByIds(productIds);
        if (!ignore) setProducts(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ignore) setProdError(e?.message || "Failed to load product details");
      } finally {
        if (!ignore) setProdLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [productIds, fetchProductsByIds]);

  const productById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => map.set(String(p?._id), p));
    return map;
  }, [products]);

  // ✅ Compact container (lighter border + smaller padding)
  const card = "bg-white rounded-2xl border border-gray-100 p-4 sm:p-5";

  const formatMoney = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  };

  const pickImage = (p) =>
    p?.thumbnail ||
    p?.image ||
    p?.images?.[0] ||
    p?.media?.[0]?.url ||
    p?.gallery?.[0]?.url ||
    null;

  const pickName = (p) => p?.name || p?.title || p?.productName || "Untitled product";

  const slugify = (str = "") =>
    String(str)
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const pickCategorySlug = (p) => {
    const c = p?.categories?.[0];
    if (!c) return "category";
    if (typeof c === "string") return slugify(c);
    return slugify(c?.slug || c?.name || c?.title || c?._id || "category");
  };

  const buildProductHref = (p) => {
    const category = pickCategorySlug(p);
    const productName = slugify(pickName(p));
    const id = p?._id;
    return `/category/${category}/${productName}/${id}`;
  };

  const buildCanonicalUrl = (href) => `https://oatclub.com${href}`;

  return (
    <div className={card}>
      {/* HEADER (compact) */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-950" /> Wishlist
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 break-all">
            Firebase UID: <span className="font-semibold">{firebaseUID || "—"}</span>
          </p>
        </div>

        {/* small total pill */}
        {productIds?.length ? (
          <div className="shrink-0 text-[11px] rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-gray-700">
            {productIds.length} items
          </div>
        ) : null}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-2.5 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* PRODUCT FETCH ERROR */}
      {prodError && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-2.5 text-xs text-red-800">
          {prodError}
        </div>
      )}

      {/* LOADING (wishlist) */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading wishlist...</span>
        </div>
      ) : productIds.length === 0 ? (
        <p className="text-sm text-gray-600">No wishlist items found.</p>
      ) : (
        <>
          {/* LOADING PRODUCTS (compact line) */}
          {prodLoading && (
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading products...</span>
            </div>
          )}

          {/* GRID (compact cards, light borders) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(productIds || []).map((pid) => {
              const p = productById.get(String(pid));

              const img = p ? pickImage(p) : null;
              const name = p ? pickName(p) : "Product not found";
              const price = p?.price;
              const compareAt = p?.compareAtPrice;

              const href = p ? buildProductHref(p) : null;
              const canonical = href ? buildCanonicalUrl(href) : null;

              return (
                <div
                  key={pid}
                  className="group rounded-2xl border border-gray-100 bg-white p-2.5 hover:border-gray-200 hover:shadow-sm transition"
                >
                  {/* IMAGE */}
                  <div className="w-full aspect-square rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={name}
                        className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-gray-300" />
                    )}
                  </div>

                  {/* NAME */}
                  <div className="mt-2 text-[13px] font-semibold leading-snug line-clamp-2 text-gray-900">
                    {name}
                  </div>

                  {/* PRICE */}
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="text-[13px] font-bold text-gray-900">
                      {formatMoney(price)}
                    </div>
                    {compareAt ? (
                      <div className="text-[11px] text-gray-500 line-through">
                        {formatMoney(compareAt)}
                      </div>
                    ) : null}
                  </div>

                  {/* VIEW (go to /category/[category]/[product_name]/[id]/page.jsx ) */}
                  {p && href ? (
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
                      >
                        View <ExternalLink size={12} />
                      </Link>

                      {/* optional: open canonical in new tab (same view page) */}
                      <a
                        href={canonical}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-zinc-950 hover:text-zinc-700"
                        title="Open on oatclub.com"
                      >
                        oatclub.com
                      </a>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-gray-500 break-all">{pid}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
