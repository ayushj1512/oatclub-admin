"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  RefreshCw,
  Plus,
  Settings2,
  Video,
  BarChart3,
  Eye,
  Heart,
  Share2,
  MousePointerClick,
  Bookmark,
  BadgeCheck,
  BadgeX,
} from "lucide-react";

import { useAdminReelsStore } from "@/store/useAdminReelsStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const shortText = (s = "", max = 36) =>
  String(s || "").length > max ? String(s).slice(0, max) + "…" : s;

export default function ReelsDashboardPage() {
  const router = useRouter();

  const {
    reels,
    loading,
    error,
    fetchReels,
    toggleReelActive,
    clearMessages,
  } = useAdminReelsStore();

  const { products, fetchProducts } = useAdminProductStore();

  const [sort, setSort] = useState("priority");
  const [placement, setPlacement] = useState("home_row");
  const [activeNow, setActiveNow] = useState(true);

  // ✅ Load reels + products once
  useEffect(() => {
    fetchProducts({ page: 1, limit: 500, isActive: true });
  }, [fetchProducts]);

  const load = async () => {
    clearMessages();
    await fetchReels({
      page: 1,
      limit: 200,
      sort,
      placement,
      activeNow: activeNow ? "true" : "false",
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, placement, activeNow]);

  const stats = useMemo(() => {
    const list = reels || [];
    return {
      total: list.length,
      active: list.filter((r) => r.isActive).length,
      inactive: list.filter((r) => !r.isActive).length,
      views: list.reduce((sum, r) => sum + (r.analytics?.views || 0), 0),
      taps: list.reduce((sum, r) => sum + (r.analytics?.taps || 0), 0),
      likes: list.reduce((sum, r) => sum + (r.analytics?.likes || 0), 0),
      wishlist: list.reduce((sum, r) => sum + (r.analytics?.wishlist || 0), 0),
      shares: list.reduce((sum, r) => sum + (r.analytics?.shares || 0), 0),
    };
  }, [reels]);

  const toggleActive = (id, current) => toggleReelActive(id, !current);

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ✅ Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center">
              <Video size={18} className="text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
                Reels Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage reels + analytics (views, taps, likes, wishlist, shares).
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Btn onClick={() => router.push("/reels/add")} icon={Plus}>
              Add Reel
            </Btn>
            <Btn onClick={() => router.push("/reels/manage")} icon={Settings2} variant="white">
              Manage
            </Btn>
            <Btn onClick={load} icon={RefreshCw} variant="black">
              Refresh
            </Btn>
          </div>
        </div>

        {/* ✅ Error */}
        {error && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-red-50 ring-1 ring-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* ✅ Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard icon={BarChart3} label="Total" value={stats.total} />
          <StatCard icon={BadgeCheck} label="Active" value={stats.active} />
          <StatCard icon={BadgeX} label="Inactive" value={stats.inactive} />
          <StatCard icon={Eye} label="Views" value={stats.views} />
          <StatCard icon={MousePointerClick} label="Taps" value={stats.taps} />
          <StatCard icon={Heart} label="Likes" value={stats.likes} />
          <StatCard icon={Bookmark} label="Wishlist" value={stats.wishlist} />
          <StatCard icon={Share2} label="Shares" value={stats.shares} />
        </div>

        {/* ✅ Filters */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3 flex-wrap">
            <Select value={placement} onChange={setPlacement}>
              <option value="home_row">Home Row</option>
              <option value="global">Global</option>
              <option value="category_page">Category Page</option>
              <option value="product_page">Product Page</option>
            </Select>

            <Select value={sort} onChange={setSort}>
              <option value="priority">Priority</option>
              <option value="newest">Newest</option>
              <option value="mostViewed">Most Viewed</option>
              <option value="mostLiked">Most Liked</option>
            </Select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5">
              <input
                type="checkbox"
                checked={activeNow}
                onChange={(e) => setActiveNow(e.target.checked)}
                className="accent-blue-600"
              />
              Active Now
            </label>
          </div>

          <div className="text-sm text-gray-600">
            Showing <b>{reels?.length || 0}</b> reels
          </div>
        </div>

        {/* ✅ Grid */}
        {loading ? (
          <div className="text-sm text-gray-600">Loading reels…</div>
        ) : !reels?.length ? (
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6 text-gray-700">
            No reels found.
            <button
              onClick={() => router.push("/reels/add")}
              className="ml-2 text-blue-600 hover:underline"
            >
              Add your first reel
            </button>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reels.map((r) => {
              const linked = products?.find((p) => p._id === r.product?.productId);

              const img =
                linked?.thumbnail ||
                linked?.images?.[0] ||
                r.product?.image ||
                "/placeholder.png";

              const name = linked?.title || r.product?.name || "Linked Product";
              const slug = linked?.slug || r.product?.slug || "-";
              const price = linked?.price || r.product?.price || 0;

              return (
                <div
                  key={r._id}
                  className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 overflow-hidden hover:shadow-md transition"
                >
                  {/* ✅ Video: smaller + autoplay */}
                  <div className="w-full h-[420px] md:h-[460px] bg-black">
                    <video
                      src={r.src}
                      className="w-full h-full object-cover bg-black"
                      preload="metadata"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-950 truncate">
                          {shortText(r.title || r.caption || r.slug, 40)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          Placement: <b>{r.placement}</b> • Priority:{" "}
                          <b>{r.priority || 0}</b>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleActive(r._id, r.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition ${
                          r.isActive
                            ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
                            : "bg-gray-100 text-gray-600 ring-black/10 hover:bg-gray-200"
                        }`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {/* ✅ Product */}
                    {r.product?.productId && (
                      <div className="flex items-center gap-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3">
                        <div className="w-10 h-12 rounded-xl overflow-hidden bg-white ring-1 ring-black/5 relative shrink-0">
                          <Image
                            src={img}
                            alt={name ? `${name} product image` : "Product image"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">
                            {name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            ₹{price} • {slug}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ✅ Analytics */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <MiniStat icon={Eye} label="Views" value={r.analytics?.views || 0} />
                      <MiniStat icon={MousePointerClick} label="Taps" value={r.analytics?.taps || 0} />
                      <MiniStat icon={Heart} label="Likes" value={r.analytics?.likes || 0} />
                      <MiniStat icon={Bookmark} label="Wishlist" value={r.analytics?.wishlist || 0} />
                      <MiniStat icon={Share2} label="Shares" value={r.analytics?.shares || 0} />
                      <MiniStat icon={BarChart3} label="Unique" value={r.analytics?.uniqueViews || 0} />
                    </div>

                    {/* ✅ Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/reels/manage?focus=${r._id}`)}
                        className="flex-1 px-4 py-2 rounded-2xl bg-white text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition text-sm"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => router.push(`/reels/manage?edit=${r._id}`)}
                        className="px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- UI Helpers ---------------- */

function Btn({ children, icon: Icon, onClick, variant = "blue" }) {
  const styles = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    black: "bg-gray-950 text-white hover:bg-black",
    white: "bg-white text-gray-800 ring-1 ring-black/5 hover:bg-gray-100",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition ${styles[variant]}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </select>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center">
        <Icon size={16} className="text-gray-800" />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-950">{value}</div>
      </div>
    </div>
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
