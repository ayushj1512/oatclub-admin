"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  BadgeX,
  BarChart3,
  Bookmark,
  Eye,
  GripVertical,
  Heart,
  Loader2,
  MousePointerClick,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  Video,
} from "lucide-react";

import { useAdminReelsStore } from "@/store/useAdminReelsStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const shortText = (value = "", max = 40) => {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const applyPriorities = (items = []) =>
  items.map((reel, index) => ({
    ...reel,
    priority: items.length - index,
  }));

export default function ReelsDashboardPage() {
  const router = useRouter();

  const {
    reels,
    loading,
    saving,
    error,
    fetchReels,
    reorderReels,
    toggleReelActive,
    clearMessages,
  } = useAdminReelsStore();

  const { products, fetchProducts } = useAdminProductStore();

  const [sort, setSort] = useState("priority");
  const [placement, setPlacement] = useState("home_row");
  const [activeNow, setActiveNow] = useState(true);

  const [orderedReels, setOrderedReels] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchProducts({
      page: 1,
      limit: 500,
      isActive: true,
    });
  }, [fetchProducts]);

  const load = async () => {
    clearMessages();

    await fetchReels({
      page: 1,
      limit: 100,
      sort,
      placement,
      activeNow: activeNow ? "true" : "false",
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, placement, activeNow]);

  useEffect(() => {
    if (!hasChanges) {
      setOrderedReels(reels || []);
    }
  }, [reels, hasChanges]);

  const stats = useMemo(() => {
    const list = orderedReels || [];

    return {
      total: list.length,
      active: list.filter((reel) => reel.isActive).length,
      inactive: list.filter((reel) => !reel.isActive).length,

      views: list.reduce(
        (sum, reel) => sum + Number(reel.analytics?.views || 0),
        0
      ),

      taps: list.reduce(
        (sum, reel) => sum + Number(reel.analytics?.taps || 0),
        0
      ),

      likes: list.reduce(
        (sum, reel) => sum + Number(reel.analytics?.likes || 0),
        0
      ),

      wishlist: list.reduce(
        (sum, reel) => sum + Number(reel.analytics?.wishlist || 0),
        0
      ),

      shares: list.reduce(
        (sum, reel) => sum + Number(reel.analytics?.shares || 0),
        0
      ),
    };
  }, [orderedReels]);

  const canReorder = sort === "priority" && !saving;

  const updateLocalOrder = (nextReels) => {
    setOrderedReels(applyPriorities(nextReels));
    setHasChanges(true);
  };

  const moveReel = (index, direction) => {
    if (!canReorder) return;

    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= orderedReels.length
    ) {
      return;
    }

    const next = [...orderedReels];

    [next[index], next[targetIndex]] = [
      next[targetIndex],
      next[index],
    ];

    updateLocalOrder(next);
  };

  const handleDragStart = (event, reelId) => {
    if (!canReorder) {
      event.preventDefault();
      return;
    }

    setDraggedId(reelId);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", reelId);
  };

  const handleDragOver = (event, reelId) => {
    if (!canReorder) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragOverId(reelId);
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();

    if (
      !canReorder ||
      !draggedId ||
      draggedId === targetId
    ) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = orderedReels.findIndex(
      (reel) => reel._id === draggedId
    );

    const targetIndex = orderedReels.findIndex(
      (reel) => reel._id === targetId
    );

    if (fromIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const next = [...orderedReels];
    const [movedReel] = next.splice(fromIndex, 1);

    next.splice(targetIndex, 0, movedReel);

    updateLocalOrder(next);

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const saveOrder = async () => {
    if (!hasChanges || saving) return;

    const saved = await reorderReels(
      applyPriorities(orderedReels)
    );

    if (saved) {
      setOrderedReels(saved);
      setHasChanges(false);
    }
  };

  const resetOrder = () => {
    if (saving) return;

    setOrderedReels(reels || []);
    setHasChanges(false);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleRefresh = async () => {
    if (saving) return;

    setHasChanges(false);
    await load();
  };

  const toggleActive = async (id, currentStatus) => {
    const updated = await toggleReelActive(
      id,
      !currentStatus
    );

    if (!updated) return;

    setOrderedReels((current) =>
      current.map((reel) =>
        reel._id === id ? updated : reel
      )
    );
  };

  return (
    <section className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <Video size={18} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
                Reels Dashboard
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Arrange reels, then save the final order.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn
              icon={Plus}
              onClick={() => router.push("/reels/add")}
            >
              Add Reel
            </Btn>

            <Btn
              icon={Settings2}
              variant="white"
              onClick={() => router.push("/reels/manage")}
            >
              Manage
            </Btn>

            <Btn
              icon={RefreshCw}
              variant="white"
              disabled={loading || saving}
              onClick={handleRefresh}
            >
              Refresh
            </Btn>

            {hasChanges && (
              <Btn
                icon={RotateCcw}
                variant="white"
                disabled={saving}
                onClick={resetOrder}
              >
                Reset
              </Btn>
            )}

            <Btn
              icon={saving ? Loader2 : Save}
              variant="black"
              disabled={!hasChanges || saving}
              loading={saving}
              onClick={saveOrder}
            >
              {saving ? "Saving..." : "Save Order"}
            </Btn>
          </div>
        </div>

        {/* Messages */}

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {hasChanges && !saving && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Reel order has unsaved changes.
          </div>
        )}

        {/* Stats */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatCard
            icon={BarChart3}
            label="Total"
            value={stats.total}
          />

          <StatCard
            icon={BadgeCheck}
            label="Active"
            value={stats.active}
          />

          <StatCard
            icon={BadgeX}
            label="Inactive"
            value={stats.inactive}
          />

          <StatCard
            icon={Eye}
            label="Views"
            value={stats.views}
          />

          <StatCard
            icon={MousePointerClick}
            label="Taps"
            value={stats.taps}
          />

          <StatCard
            icon={Heart}
            label="Likes"
            value={stats.likes}
          />

          <StatCard
            icon={Bookmark}
            label="Wishlist"
            value={stats.wishlist}
          />

          <StatCard
            icon={Share2}
            label="Shares"
            value={stats.shares}
          />
        </div>

        {/* Filters */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap gap-3">
            <Select
              value={placement}
              disabled={loading || saving || hasChanges}
              onChange={setPlacement}
            >
              <option value="home_row">Home Row</option>
              <option value="global">Global</option>
              <option value="category_page">
                Category Page
              </option>
              <option value="product_page">
                Product Page
              </option>
            </Select>

            <Select
              value={sort}
              disabled={loading || saving || hasChanges}
              onChange={setSort}
            >
              <option value="priority">Priority</option>
              <option value="newest">Newest</option>
              <option value="mostViewed">
                Most Viewed
              </option>
              <option value="mostLiked">
                Most Liked
              </option>
            </Select>

            <label className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 ring-1 ring-black/5">
              <input
                type="checkbox"
                checked={activeNow}
                disabled={loading || saving || hasChanges}
                onChange={(event) =>
                  setActiveNow(event.target.checked)
                }
                className="accent-blue-600"
              />

              Active Now
            </label>
          </div>

          <div className="text-sm text-gray-600">
            Showing <b>{orderedReels.length}</b> reels
          </div>
        </div>

        {sort !== "priority" && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Select Priority sort to enable ordering.
          </div>
        )}

        {/* Reels */}

        {loading ? (
          <LoadingState />
        ) : !orderedReels.length ? (
          <EmptyState
            onAdd={() => router.push("/reels/add")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedReels.map((reel, index) => {
              const linkedProduct = products?.find(
                (product) =>
                  String(product._id) ===
                  String(reel.product?.productId)
              );

              const image =
                linkedProduct?.thumbnail ||
                linkedProduct?.images?.[0] ||
                reel.product?.image ||
                "/placeholder.png";

              const productName =
                linkedProduct?.title ||
                reel.product?.name ||
                "Linked Product";

              const productSlug =
                linkedProduct?.slug ||
                reel.product?.slug ||
                "-";

              const price =
                linkedProduct?.price ||
                reel.product?.price ||
                0;

              const isDragging =
                draggedId === reel._id;

              const isDragTarget =
                dragOverId === reel._id &&
                draggedId !== reel._id;

              return (
                <article
                  key={reel._id}
                  draggable={canReorder}
                  onDragStart={(event) =>
                    handleDragStart(event, reel._id)
                  }
                  onDragOver={(event) =>
                    handleDragOver(event, reel._id)
                  }
                  onDrop={(event) =>
                    handleDrop(event, reel._id)
                  }
                  onDragEnd={handleDragEnd}
                  className={[
                    "overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition",
                    isDragging
                      ? "scale-[0.98] opacity-50 ring-blue-400"
                      : "",
                    isDragTarget
                      ? "ring-2 ring-blue-500"
                      : "",
                    !isDragging && !isDragTarget
                      ? "ring-black/5 hover:shadow-md"
                      : "",
                  ].join(" ")}
                >
                  {/* Order bar */}

                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={
                          canReorder
                            ? "cursor-grab rounded-xl p-2 text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
                            : "cursor-not-allowed rounded-xl p-2 text-gray-300"
                        }
                      >
                        <GripVertical size={18} />
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-950">
                          Position {index + 1}
                        </div>

                        <div className="text-[11px] text-gray-500">
                          Priority{" "}
                          {orderedReels.length - index}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <OrderButton
                        icon={ArrowUp}
                        label="Move up"
                        disabled={
                          !canReorder || index === 0
                        }
                        onClick={() =>
                          moveReel(index, -1)
                        }
                      />

                      <OrderButton
                        icon={ArrowDown}
                        label="Move down"
                        disabled={
                          !canReorder ||
                          index === orderedReels.length - 1
                        }
                        onClick={() =>
                          moveReel(index, 1)
                        }
                      />
                    </div>
                  </div>

                  {/* Video */}

                  <div className="h-[420px] w-full bg-black md:h-[460px]">
                    <video
                      src={reel.src}
                      poster={reel.poster || undefined}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>

                  {/* Details */}

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-950">
                          {shortText(
                            reel.title ||
                              reel.caption ||
                              reel.slug
                          )}
                        </div>

                        <div className="mt-1 text-[11px] text-gray-500">
                          Placement:{" "}
                          <b>{reel.placement}</b>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          toggleActive(
                            reel._id,
                            reel.isActive
                          )
                        }
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition disabled:opacity-50",
                          reel.isActive
                            ? "bg-green-50 text-green-700 ring-green-200"
                            : "bg-gray-100 text-gray-600 ring-black/10",
                        ].join(" ")}
                      >
                        {reel.isActive
                          ? "Active"
                          : "Inactive"}
                      </button>
                    </div>

                    {reel.product?.productId && (
                      <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 ring-1 ring-black/5">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
                          <Image
                            src={image}
                            alt={productName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-gray-900">
                            {productName}
                          </div>

                          <div className="truncate text-[11px] text-gray-500">
                            ₹
                            {Number(price).toLocaleString(
                              "en-IN"
                            )}{" "}
                            • {productSlug}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <MiniStat
                        icon={Eye}
                        label="Views"
                        value={reel.analytics?.views}
                      />

                      <MiniStat
                        icon={MousePointerClick}
                        label="Taps"
                        value={reel.analytics?.taps}
                      />

                      <MiniStat
                        icon={Heart}
                        label="Likes"
                        value={reel.analytics?.likes}
                      />

                      <MiniStat
                        icon={Bookmark}
                        label="Wishlist"
                        value={reel.analytics?.wishlist}
                      />

                      <MiniStat
                        icon={Share2}
                        label="Shares"
                        value={reel.analytics?.shares}
                      />

                      <MiniStat
                        icon={BarChart3}
                        label="Unique"
                        value={reel.analytics?.uniqueViews}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/reels/manage?focus=${reel._id}`
                          )
                        }
                        className="flex-1 rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/5 hover:bg-gray-100"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/reels/manage?edit=${reel._id}`
                          )
                        }
                        className="rounded-2xl bg-gray-950 px-4 py-2 text-sm text-white hover:bg-black"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Btn({
  children,
  icon: Icon,
  onClick,
  variant = "blue",
  disabled = false,
  loading = false,
}) {
  const styles = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    black: "bg-gray-950 text-white hover:bg-black",
    white:
      "bg-white text-gray-800 ring-1 ring-black/5 hover:bg-gray-100",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {Icon && (
        <Icon
          size={16}
          className={loading ? "animate-spin" : ""}
        />
      )}

      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  children,
  disabled,
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="rounded-2xl bg-gray-50 px-4 py-3 outline-none ring-1 ring-black/5 disabled:opacity-50"
    >
      {children}
    </select>
  );
}

function OrderButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-gray-50 p-2 text-gray-700 ring-1 ring-black/5 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon size={16} />
    </button>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50">
        <Icon size={16} />
      </div>

      <div>
        <div className="text-xs text-gray-500">
          {label}
        </div>

        <div className="text-lg font-bold">
          {Number(value || 0).toLocaleString(
            "en-IN"
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-3 py-2 ring-1 ring-black/5">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon size={14} />
        <span className="text-[11px]">{label}</span>
      </div>

      <div className="mt-1 text-sm font-bold">
        {Number(value || 0).toLocaleString(
          "en-IN"
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-10 text-sm text-gray-600">
      <Loader2 size={18} className="animate-spin" />
      Loading reels...
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
      <Video
        size={28}
        className="mx-auto text-gray-400"
      />

      <h2 className="mt-3 font-semibold">
        No reels found
      </h2>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white"
      >
        <Plus size={16} />
        Add Reel
      </button>
    </div>
  );
}