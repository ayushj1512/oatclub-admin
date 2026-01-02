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

const shortText = (s = "", max = 48) =>
  String(s || "").length > max ? String(s).slice(0, max) + "…" : s;

export default function ReelsManagePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

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

  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState("home_row");
  const [activeNow, setActiveNow] = useState(true);

  const [openMedia, setOpenMedia] = useState(false);
  const [editMediaReelId, setEditMediaReelId] = useState(null);

  const dragFrom = useRef(null);
  const dragOver = useRef(null);

  /* ✅ Load products once */
  useEffect(() => {
    fetchProducts({ page: 1, limit: 500, isActive: true });
  }, [fetchProducts]);

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

  /* ✅ Focus scroll */
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`reel-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, reels]);

  /* ✅ Local search filter */
  const filtered = useMemo(() => {
    const list = reels || [];
    if (!query?.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter((r) =>
      [r.title, r.caption, r.slug, r.product?.name]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [reels, query]);

  /* ✅ Drag reorder */
  const onDragStart = (i) => (dragFrom.current = i);
  const onDragEnter = (i) => (dragOver.current = i);

  const onDrop = () => {
    const from = dragFrom.current;
    const to = dragOver.current;
    if (from == null || to == null || from === to) return;

    const list = [...filtered];
    const moved = list.splice(from, 1)[0];
    list.splice(to, 0, moved);

    setReelsLocal(list);
    dragFrom.current = dragOver.current = null;
  };

  /* ✅ Update local fields */
  const updateField = (id, key, value) => {
    const list = [...(reels || [])];
    const idx = list.findIndex((x) => x._id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], [key]: value };
    setReelsLocal(list);
  };

  /* ✅ Update product snapshot */
  const updateProduct = (id, productId) => {
    const p = products.find((x) => x._id === productId);
    if (!p) return;

    const patchProduct = {
      productId: p._id,
      name: p.title || p.name || "",
      slug: p.slug || "",
      image: p.thumbnail || p.images?.[0] || "",
      price: p.price || 0,
      currency: "INR",
    };

    updateField(id, "product", patchProduct);
  };

  const saveSingle = async (r) => {
    clearMessages();
    await updateReel(r._id, {
      title: r.title,
      caption: r.caption,
      placement: r.placement,
      priority: r.priority || 0,
      isActive: r.isActive,
      src: r.src,
      product: r.product || {},
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
    updateField(editMediaReelId, "src", media.url);
    setOpenMedia(false);
    setEditMediaReelId(null);
  };

  const handleSaveOrder = async () => {
    clearMessages();
    await saveOrder();
    await load();
  };

  return (
    <section className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* ✅ Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white ring-1 ring-black/5 flex items-center justify-center">
              <Video size={18} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-950">
                Manage Reels
              </h1>
              <p className="text-xs text-gray-500">
                Compact editor • drag reorder • attach products
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Btn onClick={() => router.push("/reels/add")}>+ Add</Btn>
            <Btn onClick={load} icon={RefreshCw} variant="white">
              Refresh
            </Btn>
            <Btn
              onClick={handleSaveOrder}
              icon={Save}
              variant="black"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Order"}
            </Btn>
          </div>
        </div>

        {/* ✅ Messages */}
        {(loading || error || success) && (
          <div className="space-y-2">
            {loading && <Msg>Loading reels…</Msg>}
            {error && <Msg type="red">{error}</Msg>}
            {success && <Msg type="green">{success}</Msg>}
          </div>
        )}

        {/* ✅ Filters */}
        <div className="bg-white rounded-3xl ring-1 ring-black/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reels..."
                className="pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 w-[240px]"
              />
            </div>

            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none"
            >
              <option value="home_row">Home</option>
              <option value="global">Global</option>
              <option value="product_page">Product</option>
              <option value="category_page">Category</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-4 py-2.5 rounded-2xl bg-gray-50 ring-1 ring-black/5">
              <input
                type="checkbox"
                checked={activeNow}
                onChange={(e) => setActiveNow(e.target.checked)}
                className="accent-blue-600"
              />
              Active Now
            </label>

            <Btn onClick={load} variant="black">
              Apply
            </Btn>
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
        {!filtered.length ? (
          <div className="bg-white rounded-3xl ring-1 ring-black/5 p-6 text-gray-700">
            No reels found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, idx) => {
              const linked = products?.find(
                (p) => p._id === r.product?.productId
              );

              const productImg =
                linked?.thumbnail ||
                linked?.images?.[0] ||
                r.product?.image ||
                "/placeholder.png";

              const productName =
                linked?.title || linked?.name || r.product?.name || "Product";

              return (
                <div
                  key={r._id}
                  id={`reel-${r._id}`}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDrop}
                  className="bg-white rounded-3xl ring-1 ring-black/5 hover:shadow-md transition overflow-hidden"
                >
                  <div className="p-4 flex flex-col lg:flex-row gap-4">
                    {/* drag */}
                    <div className="hidden lg:flex items-center text-gray-400">
                      <GripVertical />
                    </div>

                    {/* ✅ Small video preview */}
                    <div className="w-full lg:w-[170px] rounded-2xl overflow-hidden bg-black aspect-[9/16]">
                      <video
                        src={r.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover bg-black"
                      />
                    </div>

                    {/* ✅ Compact Fields */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-950 truncate">
                            {shortText(r.title || r.caption || r.slug, 52)}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {r.placement} • priority <b>{r.priority || 0}</b>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleReelActive(r._id, !r.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 ${
                            r.isActive
                              ? "bg-green-50 text-green-700 ring-green-200"
                              : "bg-gray-100 text-gray-600 ring-black/10"
                          }`}
                        >
                          {r.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>

                    {/* ✅ 2 column */}
<div className="grid md:grid-cols-2 gap-3">
  <div className="space-y-1">
    <label className="text-[11px] font-medium text-gray-600">
      Title
    </label>
    <input
      value={r.title || ""}
      onChange={(e) => updateField(r._id, "title", e.target.value)}
      className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
    />
  </div>

  <div className="space-y-1">
    <label className="text-[11px] font-medium text-gray-600">
      Priority
    </label>
    <input
      type="number"
      value={r.priority || 0}
      onChange={(e) =>
        updateField(r._id, "priority", Number(e.target.value))
      }
      className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition"
    />
  </div>
</div>

                      {/* ✅ Caption box bigger */}
<div className="space-y-1">
  <label className="text-[11px] font-medium text-gray-600">
    Caption
  </label>
  <textarea
    value={r.caption || ""}
    onChange={(e) => updateField(r._id, "caption", e.target.value)}
    rows={4}
    className="w-full px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none min-h-[110px]"
  />
</div>
                      {/* ✅ Product attach + preview */}
                      <div className="bg-gray-50 rounded-2xl ring-1 ring-black/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <PackageSearch size={14} />
                          Attach Product
                        </div>

                        <select
                          value={r.product?.productId || ""}
                          onChange={(e) => updateProduct(r._id, e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl bg-white ring-1 ring-black/5 outline-none"
                        >
                          <option value="">No product</option>
                          {productsLoading ? (
                            <option>Loading products...</option>
                          ) : (
                            products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.title || p.name} — ₹{p.price}
                              </option>
                            ))
                          )}
                        </select>

                        {r.product?.productId && (
                          <div className="flex items-center gap-3 bg-white rounded-2xl ring-1 ring-black/5 p-2">
                            <div className="w-12 h-14 rounded-xl overflow-hidden bg-gray-100 relative shrink-0">
                              <Image
                                src={productImg}
                                alt={
                                  productName
                                    ? `${productName} product image`
                                    : "Product image"
                                }
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {productName}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                ₹{r.product?.price || 0} • {r.product?.slug || "-"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ✅ compact analytics */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                        <MiniStat icon={Eye} value={r.analytics?.views || 0} />
                        <MiniStat icon={MousePointerClick} value={r.analytics?.taps || 0} />
                        <MiniStat icon={Heart} value={r.analytics?.likes || 0} />
                        <MiniStat icon={Bookmark} value={r.analytics?.wishlist || 0} />
                        <MiniStat icon={Share2} value={r.analytics?.shares || 0} />
                        <MiniStat
                          icon={r.isActive ? BadgeCheck : BadgeX}
                          value={r.isActive ? "ON" : "OFF"}
                        />
                      </div>

                      {/* ✅ actions row */}
                      <div className="flex gap-2 flex-wrap">
                        <Btn onClick={() => openMediaPicker(r._id)} icon={ImageIcon} variant="white">
                          Change Video
                        </Btn>
                        <Btn onClick={() => saveSingle(r)} icon={Save} variant="black">
                          Save Reel
                        </Btn>
                        <Btn onClick={() => remove(r._id)} icon={Trash2} variant="danger">
                          Delete
                        </Btn>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => router.push("/reels")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <div className="text-[11px] text-gray-400">Reels API (/api/reels)</div>
        </div>
      </div>
    </section>
  );
}

/* ✅ Compact UI helpers */

function Btn({ children, onClick, icon: Icon, variant = "blue", disabled }) {
  const styles = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    white: "bg-white text-gray-800 ring-1 ring-black/5 hover:bg-gray-100",
    black: "bg-gray-950 text-white hover:bg-black",
    danger: "bg-white text-red-600 ring-1 ring-black/5 hover:bg-red-50",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition text-sm disabled:opacity-60 ${styles[variant]}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Msg({ children, type = "white" }) {
  const styles = {
    white: "bg-white text-gray-700 ring-black/5",
    red: "bg-red-50 text-red-700 ring-red-200",
    green: "bg-green-50 text-green-700 ring-green-200",
  };
  return (
    <div
      className={`text-sm px-4 py-3 rounded-2xl shadow-sm ring-1 ${styles[type]}`}
    >
      {children}
    </div>
  );
}

function MiniStat({ icon: Icon, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 ring-1 ring-black/5 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon size={14} />
        <span className="text-sm font-bold text-gray-950">{value}</span>
      </div>
    </div>
  );
}
