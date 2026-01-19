"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomerStore } from "@/store/customerStore";
import { useAdminProductStore } from "@/store/adminProductStore";

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

export default function CustomerCartAddsSection({ customerId = "" }) {
  const id = safe(customerId);

  const cartAdds = useCustomerStore((s) => s.cartAdds);
  const cartAddsTotal = useCustomerStore((s) => s.cartAddsTotal);
  const loadingCartAdds = useCustomerStore((s) => s.loadingCartAdds);
  const fetchCustomerCartAdds = useCustomerStore((s) => s.fetchCustomerCartAdds);

  // ✅ same store function (POST /api/products/by-ids)
  const fetchProductsByIds = useAdminProductStore((s) => s.fetchProductsByIds);

  // ✅ local cache: productCode -> product
  const [productsByCodeLocal, setProductsByCodeLocal] = useState({});
  const [loadingByIds, setLoadingByIds] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCustomerCartAdds?.(id);
  }, [id, fetchCustomerCartAdds]);

  const sorted = useMemo(() => {
    const arr = Array.isArray(cartAdds) ? cartAdds : [];
    return [...arr].sort(
      (a, b) =>
        new Date(b?.lastAddedAt || 0).getTime() -
        new Date(a?.lastAddedAt || 0).getTime()
    );
  }, [cartAdds]);

  const codes = useMemo(() => {
    const arr = sorted.map((x) => safe(x?.productCode)).filter(Boolean);
    return Array.from(new Set(arr));
  }, [sorted]);

  // ✅ bulk fetch once (or when codes change)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!codes.length) {
        setProductsByCodeLocal({});
        return;
      }

      // fetch only missing codes
      const missing = codes.filter((c) => !productsByCodeLocal?.[c]);
      if (!missing.length) return;

      try {
        setLoadingByIds(true);
        const products = await fetchProductsByIds?.(missing);

        if (cancelled) return;

        const next = { ...(productsByCodeLocal || {}) };
        (Array.isArray(products) ? products : []).forEach((p) => {
          const code = safe(p?.productCode);
          if (code) next[code] = p;
        });

        setProductsByCodeLocal(next);
      } finally {
        if (!cancelled) setLoadingByIds(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, fetchProductsByIds]); // intentionally not depending on productsByCodeLocal to avoid loop

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Cart Adds</h2>
          <p className="text-xs text-gray-500">
            Products this customer added to cart (tracked by productCode).
          </p>
        </div>
        <div className="shrink-0 text-sm font-semibold text-gray-900">
          {loadingCartAdds ? "Loading..." : `${cartAddsTotal || 0}`}
        </div>
      </div>

      <div className="mt-4">
        {loadingCartAdds ? (
          <div className="text-sm text-gray-600">Fetching cart adds...</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-gray-600">No cart adds found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold text-gray-500">
                    Product
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-500">
                    Product Code
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-500">
                    Price
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-500">
                    Last Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((it, idx) => {
                  const code = safe(it?.productCode);
                  const last = fmtDateTime(it?.lastAddedAt);

                  const p = code ? productsByCodeLocal?.[code] : null;
                  const title = safe(p?.title || p?.name || "");
                  const img = pickImage(p);
                  const price = p?.price != null ? money(p.price) : "-";

                  const isLoadingRow = loadingByIds && !p; // simple indicator

                  return (
                    <tr key={`${code || "pc"}-${idx}`} className="bg-gray-50">
                      <td className="rounded-l-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-10 overflow-hidden rounded-md border border-gray-200 bg-white">
                            {img ? (
                              <img
                                src={img}
                                alt={title || code}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {isLoadingRow ? "Loading..." : title || "-"}
                            </div>
                           
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                        {code || "-"}
                      </td>

                      <td className="px-3 py-2 text-sm text-gray-800">
                        {isLoadingRow ? "-" : price}
                      </td>

                      <td className="rounded-r-lg px-3 py-2 text-sm text-gray-700">
                        {last}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loadingByIds ? (
              <div className="mt-2 text-xs text-gray-500">Loading products…</div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
