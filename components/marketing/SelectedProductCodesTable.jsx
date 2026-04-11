"use client";

import { useEffect, useMemo, useState } from "react";
import { Hash, Trash2, PackageSearch, Loader2 } from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCode = (value) => {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw.padStart(5, "0");
  return raw;
};

const getProductCode = (product) => {
  const candidates = [
    product?.productCode,
    product?.code,
    product?.sku,
    product?.styleCode,
    product?.patternNumber,
    product?.productDetails?.productCode,
    product?.productDetails?.code,
  ];

  for (const value of candidates) {
    const code = normalizeCode(value);
    if (code) return code;
  }

  return "";
};

const getProductImage = (product) => {
  if (!product) return "";

  if (typeof product?.thumbnail === "string") return product.thumbnail;
  if (typeof product?.image === "string") return product.image;
  if (typeof product?.mainImage === "string") return product.mainImage;
  if (typeof product?.featuredImage === "string") return product.featuredImage;

  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  if (typeof firstImage === "string") return firstImage;
  if (typeof firstImage?.url === "string") return firstImage.url;
  if (typeof firstImage?.src === "string") return firstImage.src;

  const firstVariant = Array.isArray(product?.variants) ? product.variants[0] : null;
  if (typeof firstVariant?.image === "string") return firstVariant.image;
  if (typeof firstVariant?.image?.url === "string") return firstVariant.image.url;
  if (typeof firstVariant?.image?.src === "string") return firstVariant.image.src;

  return "";
};

export default function SelectedProductCodesTable({
  codes = [],
  onRemove,
  onClear,
  emptyText = "No product codes selected yet.",
}) {
  const products = useAdminProductStore((state) => state.products);
  const fetchSelectedProductsByCodes = useAdminProductStore(
    (state) => state.fetchSelectedProductsByCodes
  );

  const [resolvedProducts, setResolvedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const normalizedCodes = useMemo(
    () => [...new Set(safeArray(codes).map(normalizeCode).filter(Boolean))],
    [codes]
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!normalizedCodes.length) {
        if (active) setResolvedProducts([]);
        return;
      }

      if (typeof fetchSelectedProductsByCodes !== "function") {
        if (active) setResolvedProducts([]);
        return;
      }

      try {
        setLoading(true);

        const data = await fetchSelectedProductsByCodes(normalizedCodes, {
          mergeIntoProducts: true,
        });

        if (active) {
          setResolvedProducts(Array.isArray(data) ? data : []);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [normalizedCodes, fetchSelectedProductsByCodes]);

  const productMap = useMemo(() => {
    const map = new Map();

    [...safeArray(products), ...safeArray(resolvedProducts)].forEach((product) => {
      const code = getProductCode(product);
      if (code && !map.has(code)) map.set(code, product);
    });

    return map;
  }, [products, resolvedProducts]);

  const rows = useMemo(() => {
    return normalizedCodes.map((code) => {
      const product = productMap.get(code);

      return {
        code,
        title: product?.title || product?.name || "Product not found",
        image: getProductImage(product),
      };
    });
  }, [normalizedCodes, productMap]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <PackageSearch className="h-5 w-5 text-gray-700" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Selected Products</h3>
            <p className="text-xs text-gray-500">
              {rows.length} product{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </div>
          )}

          {!!rows.length && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {!rows.length ? (
        <div className="px-4 py-10 text-center text-sm text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Image</th>
                <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                <th className="px-4 py-3 text-left font-semibold">Product Code</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, index) => (
                <tr key={item.code} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>

                  <td className="px-4 py-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">NO IMG</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="max-w-[320px] truncate font-medium text-gray-900">
                      {item.title}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 font-medium text-gray-900">
                      <Hash className="h-4 w-4 text-gray-500" />
                      {item.code}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.code)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}