"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import {
  RefreshCw,
  Save,
  Search,
  Video,
  Trash2,
  GripVertical,
  Eye,
  Heart,
  Share2,
  MousePointerClick,
  Bookmark,
  BadgeCheck,
  BadgeX,
  ImageIcon,
  PackageSearch,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";

import { useAdminReelsStore } from "@/store/useAdminReelsStore";
import { useAdminProductStore } from "@/store/adminProductStore";

function shortText(s = "", max = 48) {
  const t = String(s || "");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function ReelsManagePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  /* -----------------------------
     Stores
  ------------------------------ */
  const {
    reels,
    loading,
    saving,
    error,
    success,
    fetchReels,
    setReelsLocal,
    updateReel,
    deleteReel,
    toggleReelActive,
    saveOrder,
    clearMessages,
  } = useAdminReelsStore();

  const { products, fetchProducts, loading: productsLoading } =
    useAdminProductStore();

  /* -----------------------------
     UI State
  ------------------------------ */
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState("home_row");
  const [activeNow, setActiveNow] = useState(true);

  const [openMedia, setOpenMedia] = useState(false);
  const [editMediaReelId, setEditMediaReelId] = useState(null);

  const dragFrom = useRef(null);
  const dragOver = useRef(null);

  /* -----------------------------
     Load
  ------------------------------ */
  useEffect(() => {
    fetchProducts({ page: 1, limit: 250, isActive: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    clearMessages();
    await fetchReels({
      page: 1,
      limit: 200,
      sort: "priority",
      placement,
      activeNow: activeNow ? "true" : "false",
      q: query || undefined,
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, activeNow]);

  /* -----------------------------
     Focus scroll
  ------------------------------ */
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`reel-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, reels]);

  /* -----------------------------
     Reel list filtered locally
  ------------------------------ */
  const filtered = useMemo(() => {
    const list = reels || [];
    if (!query?.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter((r) => {
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.caption || "").toLowerCase().includes(q) ||
        (r.slug || "").toLowerCase().includes(q) ||
        (r.product?.name || "").toLowerCase().includes(q)
      );
    });
  }, [reels, query]);

  /* -----------------------------
     Drag reorder logic
  ------------------------------ */
  const onDragStart = (idx) => {
    dragFrom.current = idx;
  };

  const onDragEnter = (idx) => {
    dragOver.current = idx;
  };

  const onDrop = () => {
    const from = dragFrom.current;
    const to = dragOver.current;

    if (from === null || to === null || from === to) return;

    const list = [...filtered];
    const moved = list.splice(from, 1)[0];
    list.splice(to, 0, moved);

    setReelsLocal(list);

    dragFrom.current = null;
    dragOver.current = null;
  };

  /* -----------------------------
     Helpers
  ------------------------------ */
  const updateFieldLocal = (id, key, value) => {
    const list = [...(reels || [])];
    const idx = list.findIndex((r) => r._id === id);
    if (idx === -1) return;

    list[idx] = { ...list[idx], [key]: value };
    setReelsLocal(list);
  };

  const updateProductLocal = (id, productId) => {
    const p = products.find((x) => x._id === productId);
    if (!p) return;

    const patchProduct = {
      productId: p._id,
      name: p.name || "",
      slug: p.slug || "",
      image: p.image || "",
      price: p.price || 0,
      currency: "INR",
      href: "",
    };

    const list = [...(reels || [])];
    const idx = list.findIndex((r) => r._id === id);
    if (idx === -1) return;

    list[idx] = {
      ...list[idx],
      product: patchProduct,
    };

    setReelsLocal(list);
  };

  const saveSingle = async (reel) => {
    clearMessages();
    await updateReel(reel._id, {
      title: reel.title,
      caption: reel.caption,
      hashtags: reel.hashtags || [],
      placement: reel.placement,
      priority: reel.priority || 0,
      isActive: reel.isActive,
      src: reel.src,
      product: reel.product || {},
    });
  };

  const remove = async (id) => {
    if (!confirm("Delete this reel?")) return;
    await deleteReel(id);
  };

  const openMediaPicker = (id) => {
    setEditMediaReelId(id);
    setOpenMedia(true);
  };

  const onSelectMedia = (media) => {
    if (!media?.url || !editMediaReelId) return;

    const list = [...(reels || [])];
    const idx = list.findIndex((r) => r._id === editMediaReelId);
    if (idx === -1) return;

    list[idx] = { ...list[idx], src: media.url, publicId: media.publicId || "" };

    setReelsLocal(list);
    setOpenMedia(false);
    setEditMediaReelId(null);
  };

  const handleSaveOrder = async () => {
    clearMessages();
    await saveOrder();
    await load();
  };

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ✅ Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center">
              <Video size={18} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
                Manage Reels
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Edit reels, attach products, reorder priority and track analytics.
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push("/reels/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
            >
              + Add Reel
            </button>

            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-900 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>

        {/* ✅ Messages */}
        <div className="space-y-2">
          {loading && (
            <div className="text-sm px-4 py-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 text-gray-700">
              Loading reels...
            </div>
          )}
          {error && (
            <div className="text-sm px-4 py-3 rounded-2xl bg-red-50 shadow-sm ring-1 ring-red-200 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm px-4 py-3 rounded-2xl bg-green-50 shadow-sm ring-1 ring-green-200 text-green-700">
              {success}
            </div>
          )}
        </div>

        {/* ✅ Filters */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reels..."
                className="pl-10 pr-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition w-[280px]"
              />
            </div>

            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="home_row">Home Row</option>
              <option value="global">Global</option>
              <option value="product_page">Product Page</option>
              <option value="category_page">Category Page</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5">
              <input
                type="checkbox"
                checked={activeNow}
                onChange={(e) => setActiveNow(e.target.checked)}
                className="accent-blue-600"
              />
              Active Now
            </label>

            <button
              onClick={load}
              className="px-4 py-3 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition text-sm"
            >
              Search
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Total: <b>{filtered.length}</b>
          </div>
        </div>

        {/* ✅ Media Picker */}
        <MediaPickerModal
          open={openMedia}
          onClose={() => setOpenMedia(false)}
          folder="miray/reels"
          onSelect={onSelectMedia}
        />

        {/* ✅ List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6 text-gray-700">
            No reels found.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r, idx) => (
              <div
                key={r._id}
                id={`reel-${r._id}`}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDrop}
                className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 overflow-hidden hover:shadow-md transition"
              >
                <div className="flex flex-col lg:flex-row gap-5 p-5">
                  {/* Drag handle */}
                  <div className="hidden lg:flex items-center justify-center pr-2 text-gray-400">
                    <GripVertical size={20} />
                  </div>

                  {/* Preview */}
                  <div className="w-full lg:w-[260px] rounded-3xl overflow-hidden bg-black aspect-[9/16]">
                    <video
                      src={r.src}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-950">
                          {shortText(r.title || r.caption || r.slug, 52)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          Placement: <b>{r.placement}</b> • Priority:{" "}
                          <b>{r.priority || 0}</b>
                        </div>
                      </div>

                      {/* Active toggle */}
                      <button
                        onClick={() => toggleReelActive(r._id, !r.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition ${
                          r.isActive
                            ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
                            : "bg-gray-100 text-gray-600 ring-black/10 hover:bg-gray-200"
                        }`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {/* Change video */}
                    <button
                      onClick={() => openMediaPicker(r._id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 ring-1 ring-black/5 hover:bg-gray-100 transition text-sm"
                    >
                      <ImageIcon size={16} />
                      Change Video
                    </button>

                    {/* Title / caption */}
                    <input
                      value={r.title || ""}
                      onChange={(e) =>
                        updateFieldLocal(r._id, "title", e.target.value)
                      }
                      placeholder="Internal title"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />

                    <textarea
                      value={r.caption || ""}
                      onChange={(e) =>
                        updateFieldLocal(r._id, "caption", e.target.value)
                      }
                      placeholder="Caption..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    />

                    {/* Priority */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-xs text-gray-500">Priority:</span>
                        <input
                          type="number"
                          value={r.priority || 0}
                          onChange={(e) =>
                            updateFieldLocal(
                              r._id,
                              "priority",
                              Number(e.target.value)
                            )
                          }
                          className="w-28 px-3 py-2 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>

                      {/* Placement */}
                      <select
                        value={r.placement || "home_row"}
                        onChange={(e) =>
                          updateFieldLocal(r._id, "placement", e.target.value)
                        }
                        className="px-3 py-2 rounded-2xl bg-white ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="home_row">Home Row</option>
                        <option value="global">Global</option>
                        <option value="product_page">Product Page</option>
                        <option value="category_page">Category Page</option>
                      </select>
                    </div>

                    {/* Attach Product */}
                    <div className="rounded-3xl bg-gray-50 ring-1 ring-black/5 p-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <PackageSearch size={14} />
                        Attach Product
                      </div>

                      <select
                        value={r.product?.productId || ""}
                        onChange={(e) =>
                          updateProductLocal(r._id, e.target.value)
                        }
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

                      {/* Product preview */}
                      {r.product?.productId && (
                        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white ring-1 ring-black/5 p-3">
                          <div className="w-14 h-16 rounded-xl overflow-hidden bg-gray-100 relative">
                            <Image
                              src={r.product?.image || "/placeholder.png"}
                              alt={r.product?.name || "Product"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-950 truncate">
                              {r.product?.name || "Linked Product"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ₹{r.product?.price || 0} • {r.product?.slug || "-"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Analytics */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs pt-1">
                      <MiniStat icon={Eye} label="Views" value={r.analytics?.views || 0} />
                      <MiniStat icon={MousePointerClick} label="Taps" value={r.analytics?.taps || 0} />
                      <MiniStat icon={Heart} label="Likes" value={r.analytics?.likes || 0} />
                      <MiniStat icon={Bookmark} label="Wishlist" value={r.analytics?.wishlist || 0} />
                      <MiniStat icon={Share2} label="Shares" value={r.analytics?.shares || 0} />
                      <MiniStat
                        icon={r.isActive ? BadgeCheck : BadgeX}
                        label="Status"
                        value={r.isActive ? "ON" : "OFF"}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap pt-2">
                      <button
                        onClick={() => saveSingle(r)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition text-sm"
                      >
                        <Save size={16} />
                        Save Reel
                      </button>

                      <button
                        onClick={() => remove(r._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-red-600 shadow-sm ring-1 ring-black/5 hover:bg-red-50 transition text-sm"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>

                    {/* hint */}
                    <div className="text-[11px] text-gray-400">
                      Drag this card to reorder priority (Save Order to persist).
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 ring-1 ring-black/5 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon size={14} />
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="text-sm font-bold text-gray-950 mt-1">{value}</div>
    </div>
  );
}
