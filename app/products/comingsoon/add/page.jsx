// app/products/comingsoon/add/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image"; // ✅ Next/Image
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Plus, Save, Search, Image as ImgIcon } from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useCategoryStore } from "@/store/categorystore";

/* ----------------------------------
   ENV
---------------------------------- */
const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
const API = BASE ? `${BASE}/api/coming-soon` : "/api/coming-soon";

/* ----------------------------------
   Helpers
---------------------------------- */
const safeJson = async (res) => {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const flattenTree = (nodes = [], depth = 0, out = []) => {
  (nodes || []).forEach((n) => {
    out.push({ ...n, _depth: depth });
    if (Array.isArray(n.children) && n.children.length) flattenTree(n.children, depth + 1, out);
  });
  return out;
};

export default function AddComingSoonPage() {
  const router = useRouter();

  const { categoryTree, categories, loading: catLoading, fetchCategories } = useCategoryStore();

  const [isSaving, setIsSaving] = useState(false);

  /* ---------------- form state ---------------- */
  const [productId, setProductId] = useState("");

  // snapshot (optional but recommended)
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");

  // categories snapshot (optional)
  const [categorySlugs, setCategorySlugs] = useState([]);
  const [catQ, setCatQ] = useState("");

  // thumbnail via MediaPickerModal (store url + publicId)
  const [thumbnail, setThumbnail] = useState({ url: "", publicId: "" });
  const [mediaOpen, setMediaOpen] = useState(false);

  // launch decision
  const [mode, setMode] = useState("auto");
  const [thresholdScore, setThresholdScore] = useState(100);

  useEffect(() => {
    fetchCategories?.();
  }, [fetchCategories]);

  const flatCats = useMemo(() => {
    const base =
      categoryTree?.length
        ? flattenTree(categoryTree)
        : (categories || []).map((c) => ({ ...c, _depth: 0 }));

    const q = String(catQ || "").trim().toLowerCase();
    if (!q) return base;

    return base.filter((c) => {
      const name = String(c?.name || "").toLowerCase();
      const slug = String(c?.slug || "").toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [categoryTree, categories, catQ]);

  const toggleCat = (slugVal) => {
    const s = String(slugVal || "").trim();
    if (!s) return;
    setCategorySlugs((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const onSelectThumb = (media) => {
    setMediaOpen(false);
    if (!media?.url) return toast.error("Invalid media");
    setThumbnail({ url: media.url, publicId: media.publicId || "" });
    toast.success("Thumbnail selected");
  };

  const createComingSoon = async () => {
    const pid = String(productId || "").trim();
    if (!pid) return toast.error("productId is required");

    setIsSaving(true);
    try {
      // ✅ expects: POST /api/coming-soon
      // (If not present, tell me — I'll add backend route)
      const payload = {
        productId: pid,
        status: "coming_soon",
        isActive: true,
        snapshot: {
          title: String(title || "").trim(),
          slug: String(slug || "").trim(),
          thumbnail: thumbnail.url || "",
          price: toNum(price),
          categories: categorySlugs, // optional (server can ignore if not in schema)
        },
        launchDecision: {
          mode,
          thresholdScore: toNum(thresholdScore),
        },
      };

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      await safeJson(res);
      toast.success("Coming Soon created ✅");
      router.push("/products/comingsoon");
    } catch (e) {
      toast.error(e.message || "Create failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-5 md:py-7 space-y-5">
        {/* ================= Header ================= */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Add Coming Soon</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a Coming Soon entry (engagement only: views / notify / shares).
            </p>
          </div>

          <button
            onClick={createComingSoon}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Create
          </button>
        </div>

        {/* ================= Layout ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ---------- Left: Basic + Snapshot ---------- */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Basic">
              <Field label="Product ID (required)">
                <input
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Mongo ObjectId of Product"
                  className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Coming Soon links by productId only (no Product model import here).
                </p>
              </Field>
            </Card>

            <Card title="Snapshot (optional but recommended)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Title">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Velvet Mermaid Dress"
                    className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:bg-white"
                  />
                </Field>

                <Field label="Slug">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. velvet-mermaid-dress"
                    className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:bg-white"
                  />
                </Field>

                <Field label="Price">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 2499"
                    className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:bg-white"
                    min={0}
                  />
                </Field>
              </div>

              {/* Thumbnail */}
              <div className="mt-4">
                <div className="text-xs font-medium text-gray-600">Thumbnail (Media Library)</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-20 w-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    {thumbnail.url ? (
                      <Image
                        src={thumbnail.url}
                        alt="Thumbnail"
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ImgIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setMediaOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-3.5 py-2 text-sm hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Select Thumbnail
                    </button>

                    {thumbnail.url ? (
                      <div className="text-xs text-gray-500 break-all">
                        Stored: <span className="text-gray-700">{thumbnail.publicId || "url-only"}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Use MediaPickerModal (no custom uploader).</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Categories (optional snapshot)">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 border border-gray-200">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={catQ}
                  onChange={(e) => setCatQ(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>

              <div className="mt-3 max-h-[340px] overflow-auto space-y-1">
                {catLoading ? (
                  <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
                  </div>
                ) : (
                  flatCats.map((c) => {
                    const s = String(c?.slug || "").trim();
                    const checked = categorySlugs.includes(s);
                    const pad = c._depth ? `${c._depth * 12}px` : "0px";

                    return (
                      <label
                        key={c._id}
                        className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                        style={{ paddingLeft: pad }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCat(s)}
                          className="h-4 w-4"
                        />
                        <div className="min-w-0">
                          <div className="text-sm truncate">{c?.name || "-"}</div>
                          <div className="text-xs text-gray-500 truncate">{s}</div>
                        </div>
                      </label>
                    );
                  })
                )}

                {!catLoading && !flatCats.length ? (
                  <div className="p-3 text-sm text-gray-500">No categories found.</div>
                ) : null}
              </div>

              {categorySlugs.length ? (
                <div className="mt-3 text-xs text-gray-600">
                  Selected: <span className="text-gray-800">{categorySlugs.length}</span>
                </div>
              ) : null}
            </Card>
          </div>

          {/* ---------- Right: Launch Decision ---------- */}
          <div className="space-y-4">
            <Card title="Launch Decision">
              <Field label="Mode">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200"
                >
                  <option value="auto">Auto (based on score)</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>

              <Field label="Threshold Score (auto)">
                <input
                  type="number"
                  value={thresholdScore}
                  onChange={(e) => setThresholdScore(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 disabled:opacity-60"
                  min={0}
                  disabled={mode !== "auto"}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Score uses: views + notifyClicks + notifySubmits + shares (weighted).
                </p>
              </Field>

              <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                <div className="font-medium text-gray-800">Notes</div>
                <ul className="list-disc ml-4 space-y-1">
                  <li>No add-to-cart, no wishlist tracking.</li>
                  <li>Media must use MediaPickerModal only.</li>
                  <li>Categories here are snapshot-only (optional).</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>

        {/* ================= Media Picker Modal ================= */}
        <MediaPickerModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          folder="miray/comingsoon"
          onSelect={onSelectThumb}
        />
      </div>
    </div>
  );
}

/* ---------------- tiny UI helpers ---------------- */
function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      {children}
    </div>
  );
}
