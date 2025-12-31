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

function shortText(s = "", max = 36) {
  const t = String(s || "");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function ReelsDashboardPage() {
  const router = useRouter();

  const {
    reels,
    loading,
    error,
    total,
    page,
    limit,
    hasMore,
    fetchReels,
    toggleReelActive,
    clearMessages,
  } = useAdminReelsStore();

  const [sort, setSort] = useState("priority"); // priority | newest | mostViewed | mostLiked
  const [placement, setPlacement] = useState("home_row"); // default
  const [activeNow, setActiveNow] = useState(true);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (targetPage = 1) => {
    clearMessages();
    await fetchReels({
      page: targetPage,
      limit: 24,
      sort,
      placement,
      activeNow: activeNow ? "true" : "false",
    });
  };

  // reload whenever filters change
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, placement, activeNow]);

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / (limit || 24)));
  }, [total, limit]);

  const stats = useMemo(() => {
    const list = reels || [];
    return {
      total: total || list.length || 0,
      active: list.filter((r) => r.isActive).length,
      inactive: list.filter((r) => !r.isActive).length,
      views: list.reduce((sum, r) => sum + (r.analytics?.views || 0), 0),
      taps: list.reduce((sum, r) => sum + (r.analytics?.taps || 0), 0),
      likes: list.reduce((sum, r) => sum + (r.analytics?.likes || 0), 0),
      wishlist: list.reduce((sum, r) => sum + (r.analytics?.wishlist || 0), 0),
      shares: list.reduce((sum, r) => sum + (r.analytics?.shares || 0), 0),
    };
  }, [reels, total]);

  const toggleActive = async (id, current) => {
    await toggleReelActive(id, !current);
  };

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ✅ Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center">
                <Video size={18} className="text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">
                  Reels Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage reels + view analytics performance (views, taps, likes, wishlist, shares).
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push("/reels/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Reel
            </button>

            <button
              onClick={() => router.push("/reels/manage")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-100 transition"
            >
              <Settings2 size={16} />
              Manage
            </button>

            <button
              onClick={() => load(page)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-950 text-white shadow-sm hover:bg-black transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* ✅ Error */}
        {error && (
          <div className="text-sm px-4 py-3 rounded-2xl bg-red-50 shadow-sm ring-1 ring-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* ✅ Stats Row */}
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
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-3 flex-wrap">
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="home_row">Home Row</option>
              <option value="global">Global</option>
              <option value="category_page">Category Page</option>
              <option value="product_page">Product Page</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Priority</option>
              <option value="newest">Newest</option>
              <option value="mostViewed">Most Viewed</option>
              <option value="mostLiked">Most Liked</option>
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
          </div>

          <div className="text-sm text-gray-600">
            Page <b>{page}</b> / <b>{pages}</b>
          </div>
        </div>

        {/* ✅ Grid */}
        {loading ? (
          <div className="text-sm text-gray-600">Loading reels…</div>
        ) : (reels || []).length === 0 ? (
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
            {(reels || []).map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 overflow-hidden hover:shadow-md transition"
              >
                {/* Reel Video */}
                <div className="w-full aspect-[9/16] bg-black">
                  <video
                    src={r.src}
                    className="w-full h-full object-contain bg-black"
                    preload="metadata"
                    controls
                    muted
                    playsInline
                  />
                </div>

                {/* Info */}
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
                      title="Toggle active"
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>

                  {/* Product linked */}
                  {r.product?.productId && (
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3">
                      <div className="w-12 h-14 rounded-xl overflow-hidden bg-white ring-1 ring-black/5 relative">
                        <Image
                          src={r.product?.image || "/placeholder.png"}
                          alt={r.product?.name || "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {r.product?.name || "Linked Product"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          ₹{r.product?.price || 0} • {r.product?.slug || "-"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <MiniStat icon={Eye} label="Views" value={r.analytics?.views || 0} />
                    <MiniStat icon={MousePointerClick} label="Taps" value={r.analytics?.taps || 0} />
                    <MiniStat icon={Heart} label="Likes" value={r.analytics?.likes || 0} />
                    <MiniStat icon={Bookmark} label="Wishlist" value={r.analytics?.wishlist || 0} />
                    <MiniStat icon={Share2} label="Shares" value={r.analytics?.shares || 0} />
                    <MiniStat icon={BarChart3} label="Unique" value={r.analytics?.uniqueViews || 0} />
                  </div>

                  {/* Actions */}
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
            ))}
          </div>
        )}

        {/* ✅ Pagination */}
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => load(Math.max(1, page - 1))}
            className={`px-4 py-2 rounded-2xl shadow-sm ring-1 ring-black/5 text-sm transition ${
              page <= 1 ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-100"
            }`}
          >
            Prev
          </button>

          <div className="text-sm text-gray-600">
            Page <b>{page}</b> / <b>{pages}</b>
          </div>

          <button
            disabled={!hasMore}
            onClick={() => load(page + 1)}
            className={`px-4 py-2 rounded-2xl shadow-sm ring-1 ring-black/5 text-sm transition ${
              !hasMore ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------
   Small UI Components
-------------------------------------------- */

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
