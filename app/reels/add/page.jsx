"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Plus,
  Save,
  RefreshCw,
  Video,
  Tag,
  Sparkles,
  Link as LinkIcon,
  PackageSearch,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";

import { useAdminReelsStore } from "@/store/useAdminReelsStore";
import { useAdminProductStore } from "@/store/adminProductStore";

function cleanHashtags(input = "") {
  return String(input || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (x.startsWith("#") ? x : `#${x}`));
}

export default function AddReelPage() {
  const router = useRouter();

  /* -----------------------------
     STORES
  ------------------------------ */
  const { createReel, saving } = useAdminReelsStore();

  const {
    products,
    fetchProducts,
    loading: productsLoading,
  } = useAdminProductStore();

  /* -----------------------------
     MEDIA MODAL STATE
  ------------------------------ */
  const [openMedia, setOpenMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  /* -----------------------------
     FORM STATE
  ------------------------------ */
  const [form, setForm] = useState({
    title: "",
    caption: "",
    hashtags: "",
    placement: "home_row",
    priority: 0,
    isActive: true,
    productId: "",
  });

  /* -----------------------------
     Load products once
  ------------------------------ */
  useEffect(() => {
    fetchProducts({ page: 1, limit: 200, isActive: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------
     Selected product snapshot builder
  ------------------------------ */
  const selectedProduct = useMemo(() => {
    if (!form.productId) return null;
    return products?.find((p) => p._id === form.productId) || null;
  }, [form.productId, products]);

  /* -----------------------------
     Handlers
  ------------------------------ */
  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const onSelectMedia = (media) => {
    if (!media?.url) return;
    setSelectedMedia(media);
    setOpenMedia(false);
  };

  const reset = () => {
    setSelectedMedia(null);
    setForm({
      title: "",
      caption: "",
      hashtags: "",
      placement: "home_row",
      priority: 0,
      isActive: true,
      productId: "",
    });
  };

  const save = async () => {
    if (!selectedMedia?.url) {
      alert("Please select a reel video from Media Library");
      return;
    }

    const payload = {
      title: form.title,
      caption: form.caption,
      hashtags: cleanHashtags(form.hashtags),
      placement: form.placement,
      priority: Number(form.priority || 0),
      isActive: !!form.isActive,

      // ✅ Reel video
      src: selectedMedia.url,
      poster: "",

      // ✅ Product snapshot + productId
      product: selectedProduct
        ? {
            productId: selectedProduct._id,
            name: selectedProduct.name || "",
            slug: selectedProduct.slug || "",
            image: selectedProduct.image || "",
            price: selectedProduct.price || 0,
            currency: "INR",
            href: "",
          }
        : {
            productId: null,
            name: "",
            slug: "",
            image: "",
            price: 0,
            currency: "INR",
            href: "",
          },
    };

    const created = await createReel(payload);

    if (created?._id) {
      router.push("/reels");
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center">
              <Video size={18} className="text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
                Add Reel
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Upload/select reel video and attach a product for homepage video row.
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
            >
              <RefreshCw size={16} />
              Reset
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Reel"}
            </button>
          </div>
        </div>

        {/* ✅ Media Picker Modal */}
        <MediaPickerModal
          open={openMedia}
          onClose={() => setOpenMedia(false)}
          folder="miray/reels"
          onSelect={onSelectMedia}
        />

        {/* Main form */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* LEFT: Media Select + Preview */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-950">Reel Video</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Select from Media Library (folder: <b>miray/reels</b>)
                </p>
              </div>

              <button
                onClick={() => setOpenMedia(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Select Video
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-gray-50 ring-1 ring-black/5 overflow-hidden">
              {selectedMedia?.url ? (
                <div className="w-full aspect-[9/16] bg-black">
                  <video
                    src={selectedMedia.url}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[9/16] flex items-center justify-center text-sm text-gray-400">
                  No video selected
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-gray-400">
              {selectedMedia?.publicId
                ? `publicId: ${selectedMedia.publicId}`
                : "publicId: -"}
            </div>
          </div>

          {/* RIGHT: Fields */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-500">Internal Title</label>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="ex: Western Denim Reel"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <Sparkles size={14} />
                Caption
              </label>
              <textarea
                value={form.caption}
                onChange={(e) => update("caption", e.target.value)}
                placeholder="ex: Unleashing western vibes ✨"
                rows={3}
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <Tag size={14} />
                Hashtags (comma separated)
              </label>
              <input
                value={form.hashtags}
                onChange={(e) => update("hashtags", e.target.value)}
                placeholder="mirayfashions, western, ootd"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Placement + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Placement</label>
                <select
                  value={form.placement}
                  onChange={(e) => update("placement", e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="home_row">Home Row</option>
                  <option value="global">Global</option>
                  <option value="product_page">Product Page</option>
                  <option value="category_page">Category Page</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => update("priority", Number(e.target.value))}
                  placeholder="Higher = shows first"
                  className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Active */}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
                className="accent-blue-600"
              />
              Active (visible on site)
            </label>

            {/* Product Attach */}
            <div className="rounded-3xl bg-gray-50 ring-1 ring-black/5 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <PackageSearch size={14} />
                Attach Product (optional)
              </div>

              <select
                value={form.productId}
                onChange={(e) => update("productId", e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">No product linked</option>
                {productsLoading ? (
                  <option>Loading products...</option>
                ) : (
                  products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.price}
                    </option>
                  ))
                )}
              </select>

              {/* Preview attached product */}
              {selectedProduct && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white ring-1 ring-black/5 p-3">
                  <div className="w-14 h-16 rounded-xl overflow-hidden bg-gray-100 relative">
                    <Image
                      src={selectedProduct.image || "/placeholder.png"}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950 truncate">
                      {selectedProduct.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ₹{selectedProduct.price} • {selectedProduct.slug}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hint */}
            <div className="text-xs text-gray-500 leading-relaxed">
              ✅ Tip: Video should be vertical <b>9:16</b>.  
              Add a product to show price + card below reel on homepage.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => router.push("/reels")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Reels Dashboard
          </button>

          <div className="text-[11px] text-gray-400">
            Uses Media Library + Reels API (/api/reels)
          </div>
        </div>
      </div>
    </section>
  );
}
