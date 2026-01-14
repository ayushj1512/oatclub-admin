"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCollaborationStore } from "@/store/CollaborationStore";
import { useAdminProductStore } from "@/store/adminProductStore";

/**
 * app/collaboration/add/page.jsx
 * ✅ Loads products from useAdminProductStore
 * ✅ Dynamic searchbar (typeahead dropdown)
 * ✅ Shows product thumbnail image (from product.thumbnail OR first image in product.images)
 * ✅ Simple sober UI (black/white/grey), no heavy borders
 *
 * Notes:
 * - This assumes product object has: _id, title, productCode, slug, thumbnail, images[]
 */

const PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "snapchat",
  "twitter",
  "linkedin",
  "website",
  "other",
];

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
        "placeholder:text-gray-400 outline-none ring-1 ring-gray-100 " +
        "focus:bg-white focus:ring-2 focus:ring-gray-200 transition"
      }
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={
        "w-full min-h-[110px] resize-y rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
        "placeholder:text-gray-400 outline-none ring-1 ring-gray-100 " +
        "focus:bg-white focus:ring-2 focus:ring-gray-200 transition"
      }
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
        "outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-200 transition"
      }
    />
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
      {children}
    </span>
  );
}

function getProductImageSrc(product) {
  if (!product) return "";
  const t = typeof product.thumbnail === "string" ? product.thumbnail.trim() : "";
  if (t) return t;
  const first = Array.isArray(product.images) && product.images.length ? String(product.images[0] || "").trim() : "";
  return first || "";
}

export default function AddCollaborationPage() {
  const router = useRouter();

  const { createOne, saving: savingCollab, error: collabError, clearError } =
    useCollaborationStore();

  const { products, loading: loadingProducts, fetchProducts } =
    useAdminProductStore();

  const [openSuggest, setOpenSuggest] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const suggestRef = useRef(null);

  const [form, setForm] = useState({
    influencerName: "",
    influencerState: "",
    influencerAddress: "",
    influencerId: "",

    productId: "",
    platform: "instagram",

    linksText: "",
    notes: "",
  });

  // Load products for typeahead
  useEffect(() => {
    fetchProducts({ page: 1, limit: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close suggestions on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestRef.current) return;
      if (!suggestRef.current.contains(e.target)) setOpenSuggest(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const setVal = (key, value) => {
    clearError?.();
    setForm((s) => ({ ...s, [key]: value }));
  };

  const linksPreview = useMemo(() => {
    const raw = form.linksText || "";
    const parts = raw
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  }, [form.linksText]);

  const selectedProduct = useMemo(() => {
    return (products || []).find((p) => p?._id === form.productId) || null;
  }, [products, form.productId]);

  const productImageSrc = useMemo(() => getProductImageSrc(selectedProduct), [selectedProduct]);

  const suggestions = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const list = products || [];
    if (!q) return list.slice(0, 10);

    const scored = list
      .map((p) => {
        const title = String(p?.title || "").toLowerCase();
        const code = String(p?.productCode || "").toLowerCase();
        const slug = String(p?.slug || "").toLowerCase();

        let score = 0;
        if (title.startsWith(q)) score += 5;
        if (code.startsWith(q)) score += 4;
        if (slug.startsWith(q)) score += 3;
        if (title.includes(q)) score += 2;
        if (code.includes(q)) score += 2;
        if (slug.includes(q)) score += 1;

        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.p);

    return scored;
  }, [products, productQuery]);

  // If product selected, keep query in sync (nice UX)
  useEffect(() => {
    if (!selectedProduct) return;
    setProductQuery(selectedProduct.title || selectedProduct.productCode || "");
  }, [selectedProduct]);

  const validate = () => {
    if (!form.influencerName.trim()) return "Influencer name is required";
    if (!form.productId.trim()) return "Product selection is required";
    if (!form.platform) return "Platform is required";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) return alert(msg);

    const payload = {
      influencer: {
        influencerId: form.influencerId?.trim() || null,
        name: form.influencerName.trim(),
        state: form.influencerState.trim(),
        address: form.influencerAddress.trim(),
        links: linksPreview,
      },
      productId: form.productId.trim(),
      platform: form.platform,
      notes: form.notes.trim(),
      status: "ongoing",
    };

    const created = await createOne(payload);
    if (created?._id) router.push("/collaboration");
  };

  const pickProduct = (p) => {
    if (!p?._id) return;
    setVal("productId", p._id);
    setProductQuery(p.title || p.productCode || "");
    setOpenSuggest(false);
  };

  const clearProduct = () => {
    setVal("productId", "");
    setProductQuery("");
    setOpenSuggest(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Add Collaboration</div>
            <div className="mt-1 text-sm text-gray-500">
              Create a new ongoing collaboration for a product.
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/collaboration")}
            className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200 transition"
          >
            Back
          </button>
        </div>

        {/* Error */}
        {collabError ? (
          <div className="mt-5 rounded-3xl bg-gray-50 p-4 text-sm text-gray-800 ring-1 ring-gray-100">
            <div className="font-medium">Something went wrong</div>
            <div className="mt-1 text-gray-600">{collabError}</div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Influencer */}
          <div className="rounded-3xl bg-white p-5 md:p-6 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Influencer</div>
              <Pill>Embedded</Pill>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Name" hint="Required">
                <Input
                  value={form.influencerName}
                  onChange={(e) => setVal("influencerName", e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                />
              </Field>

              <Field label="InfluencerId" hint="Optional">
                <Input
                  value={form.influencerId}
                  onChange={(e) => setVal("influencerId", e.target.value)}
                  placeholder="Mongo ObjectId (optional)"
                />
              </Field>

              <Field label="State">
                <Input
                  value={form.influencerState}
                  onChange={(e) => setVal("influencerState", e.target.value)}
                  placeholder="e.g. Delhi"
                />
              </Field>

              <Field label="Address">
                <Input
                  value={form.influencerAddress}
                  onChange={(e) => setVal("influencerAddress", e.target.value)}
                  placeholder="Short address"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Links" hint="Comma or new line separated">
                  <Textarea
                    value={form.linksText}
                    onChange={(e) => setVal("linksText", e.target.value)}
                    placeholder={"https://instagram.com/...\nhttps://youtube.com/..."}
                  />
                  {linksPreview.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linksPreview.slice(0, 6).map((l) => (
                        <Pill key={l}>{l}</Pill>
                      ))}
                      {linksPreview.length > 6 ? (
                        <Pill>+{linksPreview.length - 6} more</Pill>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">
                      Paste a few links to preview here.
                    </div>
                  )}
                </Field>
              </div>
            </div>
          </div>

          {/* Collaboration */}
          <div className="rounded-3xl bg-white p-5 md:p-6 ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Collaboration</div>
              {selectedProduct ? (
                <button
                  type="button"
                  onClick={clearProduct}
                  className="rounded-2xl bg-gray-100 px-3 py-2 text-xs text-gray-800 hover:bg-gray-200 transition"
                >
                  Clear product
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4">
              {/* ✅ Dynamic Product Search */}
              <Field label="Product" hint="Type to search & pick">
                <div ref={suggestRef} className="relative">
                  <Input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setOpenSuggest(true);
                    }}
                    onFocus={() => setOpenSuggest(true)}
                    placeholder={loadingProducts ? "Loading products..." : "Search by title / code / slug"}
                    disabled={loadingProducts}
                  />

                  {openSuggest ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm">
                      {loadingProducts ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                      ) : suggestions.length ? (
                        <div className="max-h-72 overflow-y-auto">
                          {suggestions.map((p) => {
                            const img = getProductImageSrc(p);
                            return (
                              <button
                                type="button"
                                key={p._id}
                                onClick={() => pickProduct(p)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-center gap-3"
                              >
                                <div className="h-10 w-10 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-100 shrink-0">
                                  {img ? (
                                    <Image
                                      src={img}
                                      alt={p.title || "product"}
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 object-cover"
                                    />
                                  ) : (
                                    <div className="h-10 w-10" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {p.title || "Untitled"}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {p.productCode ? `Code: ${p.productCode}` : ""}{" "}
                                    {p.slug ? `• ${p.slug}` : ""}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">No matching products</div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Selected preview */}
                {selectedProduct ? (
                  <div className="mt-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-100 shrink-0">
                      {productImageSrc ? (
                        <Image
                          src={productImageSrc}
                          alt={selectedProduct.title || "product"}
                          width={64}
                          height={64}
                          className="h-16 w-16 object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {selectedProduct.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {selectedProduct.productCode ? (
                          <span className="mr-2">Code: {selectedProduct.productCode}</span>
                        ) : null}
                        {selectedProduct.slug ? <span>Slug: {selectedProduct.slug}</span> : null}
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Selected productId:{" "}
                        <span className="font-mono text-gray-600">{selectedProduct._id}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-400">
                    Select a product to see preview + image.
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Platform" hint="Required">
                  <Select
                    value={form.platform}
                    onChange={(e) => setVal("platform", e.target.value)}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="hidden md:block" />
              </div>

              <Field label="Notes" hint="Optional">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setVal("notes", e.target.value)}
                  placeholder="Any extra info about this collab..."
                />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-400">
              Default status will be <span className="font-medium text-gray-700">ongoing</span>.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/collaboration")}
                className="rounded-2xl bg-gray-100 px-5 py-3 text-sm text-gray-900 hover:bg-gray-200 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingCollab}
                className="rounded-2xl bg-gray-900 px-6 py-3 text-sm text-white hover:bg-gray-800 disabled:opacity-60 transition"
              >
                {savingCollab ? "Saving..." : "Create Collaboration"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-10 text-center text-xs text-gray-400">
          Keep it clean. Keep it consistent.
        </div>
      </div>
    </div>
  );
}
