// app/production/product-detail/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ---------------- helpers ---------------- */
const arr = (v) => (Array.isArray(v) ? v : []);
const dedupe = (list) => {
  const seen = new Set();
  return arr(list)
    .map((x) => String(x || "").trim())
    .filter((x) => x && !seen.has(x) && (seen.add(x), true));
};
const pad6 = (v) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.slice(-5).padStart(5, "0") : "";
};
const parseCodes = (input = "") =>
  dedupe(
    String(input)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(pad6)
      .filter(Boolean)
  );

const money = (n, c = "INR") => {
  const x = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: c || "INR",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(x) ? x : 0);
  } catch {
    return `${c || "INR"} ${Number.isFinite(x) ? x : 0}`;
  }
};
const dt = (v) => (v ? new Date(v).toLocaleString() : "—");

const getVariantAttrMap = (v) => {
  const m = {};
  arr(v?.attributes).forEach((a) => {
    const k = String(a?.key || "").trim().toLowerCase();
    const val = String(a?.value || "").trim();
    if (k) m[k] = val;
  });
  return m;
};

/* ---------------- UI ---------------- */
const Chip = ({ children, tone = "gray" }) => {
  const t =
    {
      gray: "bg-gray-100 text-gray-900",
      green: "bg-emerald-50 text-emerald-900",
      red: "bg-rose-50 text-rose-900",
      yellow: "bg-amber-50 text-amber-900",
      blue: "bg-slate-100 text-slate-900",
      purple: "bg-purple-50 text-purple-900",
    }[tone] || "bg-gray-100 text-gray-900";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${t}`}>
      {children}
    </span>
  );
};

const Card = ({ title, right, children }) => (
  <section className="rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)] ring-1 ring-black/5 overflow-hidden">
    <header className="px-5 py-4 flex items-start justify-between gap-3">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
    <div className="px-5 pb-5">{children}</div>
  </section>
);

const KV = ({ k, v }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-t border-black/5">
    <div className="text-xs font-medium text-gray-500">{k}</div>
    <div className="text-sm text-gray-900 text-right break-words max-w-[72%]">
      {v ?? <span className="text-gray-400">—</span>}
    </div>
  </div>
);

const Box = ({ title, children }) => (
  <div className="rounded-2xl bg-gray-50/70 ring-1 ring-black/5 p-4">
    <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>
    <div className="space-y-0">{children}</div>
  </div>
);

/* ---------------- Images ---------------- */
const HEADER_IMG_CLASS = "h-40 w-40 md:h-50 md:w-50";

function HeaderImageStrip({ imgs, onOpen }) {
  if (!imgs?.length) return null;
  return (
    <div className="mt-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {imgs.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => onOpen(i)}
            className="shrink-0 rounded-2xl overflow-hidden bg-gray-100/70 ring-1 ring-black/5 hover:opacity-95"
            title="Open preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`product-${i + 1}`}
              className={`${HEADER_IMG_CLASS} object-contain`}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ open, images, index, onClose, onPrev, onNext }) {
  if (!open) return null;
  const src = images?.[index] || "";
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 p-4 md:p-8 flex items-center justify-center">
        <div className="relative w-full h-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="absolute -top-2 right-0 flex items-center gap-2">
            <div className="text-xs text-white/70 mr-2">
              {index + 1}/{images.length}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
            >
              Close
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`preview-${index + 1}`} className="w-full h-full object-contain rounded-2xl" />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/15"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/15"
                aria-label="Next"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
  Page (Comma-separated codes => multiple product responses)
============================================================ */
export default function ProductDetailScreen() {
  const { products, loading, error, fetchAllProducts, fetchProductById, resetProduct } =
    useAdminProductStore();

  const [codeInput, setCodeInput] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState([]); // ✅ multiple products

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbImages, setLbImages] = useState([]);

  const codes = useMemo(() => parseCodes(codeInput), [codeInput]);

  const openLightbox = (images, i) => {
    setLbImages(images || []);
    setLbIndex(i || 0);
    setLbOpen(true);
  };
  const closeLightbox = () => setLbOpen(false);
  const prev = () => setLbIndex((x) => (x - 1 + lbImages.length) % lbImages.length);
  const next = () => setLbIndex((x) => (x + 1) % lbImages.length);

  useEffect(() => {
    if (!lbOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen, lbImages.length]);

  const search = async (e) => {
    e.preventDefault();

    const qCodes = parseCodes(codeInput);
    setLastQuery(qCodes.length ? qCodes.join(", ") : codeInput);
    setResults([]);
    resetProduct?.(); // keep store clean (old single product)
    if (!qCodes.length) return;

    const list = products?.length ? products : await fetchAllProducts();
    const byCode = new Map(arr(list).map((x) => [pad6(x?.productCode), x]));

    const hits = qCodes.map((c) => byCode.get(c)).filter(Boolean);

    // fetch each product detail (sequential to be safe)
    const detailed = [];
    for (const hit of hits) {
      if (!hit?._id) continue;
      const data = await fetchProductById(hit._id);
      // support either "return product" OR store-updated product
      detailed.push(data || hit);
    }

    // if store returns product in `data`, we already pushed it
    // if fetchProductById only updates store & returns nothing, fallback by refetching from list not possible,
    // but usually it returns product. If not, still show basic hits.
    setResults(detailed.length ? detailed : hits);
  };

  const ProductCard = ({ p }) => {
    const imgs = useMemo(() => {
      const all = [];
      if (p?.thumbnail) all.push(p.thumbnail);
      all.push(...arr(p?.images));
      return dedupe(all);
    }, [p]);

    return (
      <div className="space-y-4">
        <Card
          title={
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Product</div>
              <div className="text-lg md:text-xl font-semibold">{p?.title || "—"}</div>

              <HeaderImageStrip imgs={imgs} onOpen={(i) => openLightbox(imgs, i)} />

              <div className="text-xs text-gray-500">
                Code: <span className="font-semibold text-gray-900">{pad6(p?.productCode)}</span>
                <span className="mx-2">•</span>
                <span className="font-mono">{p?._id || "—"}</span>
              </div>
            </div>
          }
          right={
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-2 justify-end">
                {p?.isDraft ? <Chip tone="yellow">Draft</Chip> : null}
                {p?.isActive ? <Chip tone="green">Active</Chip> : <Chip tone="red">Inactive</Chip>}
                {p?.isInStock ? <Chip tone="green">In Stock</Chip> : <Chip tone="red">Out</Chip>}
                {p?.isFeatured ? <Chip tone="purple">Featured</Chip> : null}
                <Chip tone="blue">{String(p?.productType || "simple").toUpperCase()}</Chip>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{money(p?.price, p?.currency)}</span>
                {p?.compareAtPrice != null ? (
                  <span className="text-gray-500 line-through ml-2">{money(p.compareAtPrice, p.currency)}</span>
                ) : null}
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Box title="Identifiers">
              <KV k="Slug" v={p?.slug || "—"} />
              <KV k="HSN" v={p?.hsnCode || "—"} />
              <KV k="WP ID" v={p?.wordpressId ?? "—"} />
            </Box>

            <Box title="Shipping">
              <KV k="Weight" v={String(p?.weight ?? 0)} />
              <KV
                k="Dimensions"
                v={
                  p?.dimensions
                    ? `${p.dimensions.length ?? 0}×${p.dimensions.width ?? 0}×${p.dimensions.height ?? 0} ${p.dimensions.unit || "cm"
                    }`
                    : "—"
                }
              />
            </Box>

            <Box title="Publishing">
              <KV k="publishAt" v={dt(p?.publishAt)} />
              <KV k="createdAt" v={dt(p?.createdAt)} />
              <KV k="updatedAt" v={dt(p?.updatedAt)} />
            </Box>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card title="Descriptions">
              <KV k="Short" v={p?.shortDescription || "—"} />
              <KV k="Long" v={p?.description || "—"} />
            </Card>

            <Card title="Categories / Tags / Colors">
              <KV
                k="Categories"
                v={
                  arr(p?.categories).length ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {p.categories.map((c, i) => (
                        <Chip key={i}>{String(c)}</Chip>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <KV
                k="Tags"
                v={
                  arr(p?.tags).length ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {p.tags.map((t, i) => (
                        <Chip key={i} tone="blue">
                          {String(t)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <KV
                k="Colors"
                v={
                  arr(p?.colors).length ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {p.colors.map((c, i) => (
                        <Chip key={i} tone="purple">
                          {String(c)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
            </Card>

            <Card title="Pricing / Tax">
              <KV k="Price" v={money(p?.price, p?.currency)} />
              <KV k="Compare" v={p?.compareAtPrice == null ? "—" : money(p.compareAtPrice, p.currency)} />
              <KV k="Currency" v={p?.currency || "INR"} />
              <KV k="Tax Class" v={p?.taxClass || "standard"} />
            </Card>

            <Card title="Inventory">
              <KV k="Product SKU (simple)" v={p?.sku || "—"} />
              <KV k="Stock (simple)" v={String(p?.stock ?? 0)} />
              <KV k="isInStock" v={String(!!p?.isInStock)} />
            </Card>

            <Card title={`Variants (${arr(p?.variants).length})`} right={<span className="text-xs text-gray-500">includes patternNumber</span>}>
              {arr(p?.variants).length ? (
                <div className="space-y-3">
                  {p.variants.map((v, idx) => {
                    const m = getVariantAttrMap(v);
                    const size = m.size || "";
                    const color = m.color || "";

                    return (
                      <div key={v?._id || idx} className="rounded-2xl bg-gray-50/70 ring-1 ring-black/5 p-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold">
                              Variant #{idx + 1}
                              {size ? <span className="text-gray-500 font-normal"> • Size: {size}</span> : null}
                              {color ? <span className="text-gray-500 font-normal"> • Color: {color}</span> : null}
                            </div>
                            <div className="text-xs text-gray-600">
                              Pattern: <span className="font-medium text-gray-900">{v?.patternNumber || "—"}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {v?.isInStock ? <Chip tone="green">In</Chip> : <Chip tone="red">Out</Chip>}
                            {v?.sku ? <Chip tone="blue">SKU: {v.sku}</Chip> : null}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Box title="Stock / Shipping">
                            <KV k="Stock" v={String(v?.stock ?? 0)} />
                            <KV k="Barcode" v={v?.barcode || "—"} />
                            <KV k="Weight" v={String(v?.weight ?? 0)} />
                          </Box>

                          <Box title="Attributes">
                            {arr(v?.attributes).length ? (
                              <div className="flex flex-wrap gap-2 justify-end pt-2">
                                {v.attributes.map((a, i2) => (
                                  <Chip key={i2}>
                                    {String(a?.key || "attr")}: {String(a?.value || "—")}
                                  </Chip>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 pt-2 text-right">—</div>
                            )}
                          </Box>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No variants</div>
              )}
            </Card>

            <Card title="Fabrics / Avg Consumption">
              <KV
                k="Fabrics"
                v={
                  arr(p?.fabrics).length ? (
                    <div className="space-y-1 text-right">
                      {p.fabrics.map((f, i) => (
                        <div key={i}>
                          <b>{String(f?.fabricCode || "")}</b> • {String(f?.role || "main")}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <KV
                k="Avg Fabric Consumption"
                v={
                  p?.avgFabricConsumption
                    ? `${Number(p.avgFabricConsumption.value ?? 0)} ${p.avgFabricConsumption.unit || "meter"}`
                    : "—"
                }
              />
            </Card>

            <Card title="SEO">
              <KV k="Meta Title" v={p?.metaTitle || "—"} />
              <KV k="Meta Desc" v={p?.metaDescription || "—"} />
              <KV
                k="Keywords"
                v={
                  arr(p?.keywords).length ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {p.keywords.map((k, i) => (
                        <Chip key={i}>{String(k)}</Chip>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Analytics">
              <KV k="Views" v={String(p?.analytics?.views ?? 0)} />
              <KV k="Purchases" v={String(p?.analytics?.purchases ?? 0)} />
              <KV k="Wishlist" v={String(p?.analytics?.wishlistCount ?? 0)} />
              <KV k="Cart Adds" v={String(p?.analytics?.cartAdds ?? 0)} />
              <KV k="Search" v={String(p?.analytics?.searchAppearances ?? 0)} />
            </Card>

            <Card title="Offers / Links">
              <KV k="Offer" v={p?.offer ? "Linked" : "—"} />
              <KV k="Coupons" v={arr(p?.couponsApplicable).length ? `${p.couponsApplicable.length} linked` : "—"} />
              <KV k="External URL" v={p?.externalURL || "—"} />
              <KV k="Collections" v={arr(p?.collections).length ? `${p.collections.length} linked` : "—"} />
              <KV k="Cross Sell" v={arr(p?.crossSellProducts).length ? `${p.crossSellProducts.length} linked` : "—"} />
            </Card>

            <Card title="Other">
              <KV k="Avg Rating" v={String(p?.averageRating ?? 0)} />
              <KV k="Total Reviews" v={String(p?.totalReviews ?? 0)} />
              <KV k="HSN Code" v={p?.hsnCode || "—"} />
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="p-4 md:p-6 space-y-4">
        <Card title="Product Detail" right={<Chip tone="blue">Search by Product Codes</Chip>}>
          <form onSubmit={search} className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter codes (comma separated): 330, 26, 000330"
                className="h-11 w-full px-4 rounded-xl bg-gray-100/70 ring-1 ring-black/10 focus:ring-black/30 outline-none text-sm placeholder:text-gray-500"
              />
              <div className="mt-2 text-xs text-gray-500">
                {codes.length ? (
                  <>
                    Normalized:{" "}
                    <span className="font-semibold text-gray-900">{codes.join(", ")}</span>
                  </>
                ) : (
                  <>Tip: 330,26 → 000330,000026</>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-11 px-5 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/90 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-3">
            {error ? (
              <div className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-xl px-4 py-3">
                {error}
              </div>
            ) : null}

            {!error && lastQuery && !loading && results.length === 0 ? (
              <div className="text-sm text-gray-700 bg-gray-100/70 ring-1 ring-black/5 rounded-xl px-4 py-3">
                No product found for: <b>{lastQuery}</b>
              </div>
            ) : null}

            {!error && results.length > 0 ? (
              <div className="mt-2 text-xs text-gray-600">
                Found <b className="text-gray-900">{results.length}</b> product(s)
              </div>
            ) : null}
          </div>
        </Card>

        {/* Results */}
        {results.length ? (
          <div className="space-y-6">
            {results.map((p, i) => (
              <div key={p?._id || i}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        ) : null}

        <Lightbox
          open={lbOpen}
          images={lbImages}
          index={lbIndex}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
        />
      </div>
    </div>
  );
}
