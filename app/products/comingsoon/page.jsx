// app/products/comingsoon/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image"; // ✅ Next/Image
import Link from "next/link";
import toast from "react-hot-toast";
import {
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Rocket,
  Save,
  Plus,
  Image as ImgIcon,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminComingSoonStore } from "@/store/adminComingSoonStore";

/* ---------------- helpers ---------------- */
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const clamp0 = (v) => Math.max(0, Number(v || 0));
const fmtDT = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ComingSoonDashboardPage() {
  const {
    items,
    isLoading,
    isSaving,
    error,
    fetchAll,
    updateThreshold,
    manualLaunch,
    filterLocal,
    resetError,
  } = useAdminComingSoonStore();

  /* ---------- filters ---------- */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState("all");

  /* ---------- media modal (thumbnail picker) ---------- */
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTargetId, setMediaTargetId] = useState(null);

  /* ---------- inline threshold drafts ---------- */
  const [thresholdDraft, setThresholdDraft] = useState({});

  /* ---------- initial fetch ---------- */
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---------- toast errors ---------- */
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  /* ---------- filtered rows ---------- */
  const rows = useMemo(() => filterLocal({ q, status, active }), [filterLocal, q, status, active, items]);

  /* ---------- dashboard stats ---------- */
  const stats = useMemo(() => {
    const all = items || [];
    const coming = all.filter((x) => x.status === "coming_soon").length;
    const launched = all.filter((x) => x.status === "launched").length;

    const views = all.reduce((s, x) => s + clamp0(x?.metrics?.views), 0);
    const clicks = all.reduce((s, x) => s + clamp0(x?.metrics?.notifyClicks), 0);
    const submits = all.reduce((s, x) => s + clamp0(x?.metrics?.notifySubmits), 0);
    const shares = all.reduce((s, x) => s + clamp0(x?.metrics?.shares), 0);
    const waitlist = all.reduce((s, x) => s + clamp0(x?.metrics?.waitlistCount), 0);

    // lightweight conversion rates
    const rate = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
    return {
      total: all.length,
      coming,
      launched,
      views,
      clicks,
      submits,
      shares,
      waitlist,
      clickRate: rate(clicks, views),
      submitRate: rate(submits, views),
    };
  }, [items]);

  /* ---------- actions ---------- */
  const refresh = () => {
    resetError?.();
    fetchAll();
  };

  const openThumbPicker = (id) => {
    setMediaTargetId(id);
    setMediaOpen(true);
  };

  const onSelectMedia = (media) => {
    // NOTE: backend snapshot update route not added yet
    setMediaOpen(false);
    if (!mediaTargetId) return;
    if (!media?.url) return toast.error("Invalid media");
    toast.success("Thumbnail selected (add snapshot update API to save)");
  };

  const saveThreshold = async (id, fallback) => {
    const v = Number(thresholdDraft[id] ?? fallback ?? 0);
    const updated = await updateThreshold(id, v);
    if (updated) toast.success("Threshold updated");
  };

  const launch = async (id) => {
    const ok = await manualLaunch(id);
    if (ok) toast.success("Launched ✅");
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-5 md:py-7 space-y-5">
        {/* ================= Header ================= */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Products</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Coming Soon</h1>
            <p className="mt-1 text-sm text-gray-600">
              Engagement: views • notify clicks • notify submits • shares (no cart/wishlist).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ Add Coming Soon */}
            <Link
              href="/products/comingsoon/add"
              className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-3.5 py-2 text-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Coming Soon
            </Link>

            {/* ✅ Refresh */}
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm hover:bg-gray-50 active:scale-[0.99] disabled:opacity-50"
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ================= Metrics ================= */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <Metric label="Total" value={stats.total} />
          <Metric label="Coming Soon" value={stats.coming} />
          <Metric label="Launched" value={stats.launched} />
          <Metric label="Waitlist" value={stats.waitlist} />
          <Metric label="Views" value={stats.views} />
          <Metric label="Submit Rate" value={`${stats.submitRate}%`} sub={`Click: ${stats.clickRate}%`} />
        </div>

        {/* ================= Filters ================= */}
        <div className="flex flex-col md:flex-row gap-2.5 md:items-center md:justify-between">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title / slug / code…"
              className="w-full outline-none text-sm bg-transparent"
            />
          </div>

          {/* Status + Active */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
              <SlidersHorizontal className="h-4 w-4 text-gray-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-sm bg-transparent outline-none"
              >
                <option value="all">All status</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="launched">Launched</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
              <select
                value={active}
                onChange={(e) => setActive(e.target.value)}
                className="text-sm bg-transparent outline-none"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= List ================= */}
        <div className="rounded-2xl bg-gray-50/60 p-2">
          <div className="overflow-auto rounded-2xl bg-white">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="text-left">
                  <Th>Product</Th>
                  <Th>Code</Th>
                  <Th>Score</Th>
                  <Th>Threshold</Th>
                  <Th>Views</Th>
                  <Th>Clicks</Th>
                  <Th>Submits</Th>
                  <Th>Shares</Th>
                  <Th>Waitlist</Th>
                  <Th>Last</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {rows.map((x) => {
                  const id = x._id;
                  const thumb = x?.snapshot?.thumbnail || "";
                  const title = x?.snapshot?.title || "—";
                  const slug = x?.snapshot?.slug || "";
                  const price = x?.snapshot?.price ?? 0;

                  const score = Math.round(Number(x?.launchDecision?.currentScore || 0));
                  const threshold = Number(x?.launchDecision?.thresholdScore || 0);

                  const m = x?.metrics || {};
                  const views = clamp0(m.views);
                  const clicks = clamp0(m.notifyClicks);
                  const submits = clamp0(m.notifySubmits);
                  const shares = clamp0(m.shares);
                  const waitlist = clamp0(m.waitlistCount);

                  const last = fmtDT(m.lastEngagedAt);
                  const st = x?.status || "coming_soon";

                  return (
                    <tr key={id} className="border-t border-gray-100 hover:bg-gray-50/40">
                      {/* Product */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail (Next/Image) */}
                          <div className="relative h-12 w-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <ImgIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[320px]">{title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[320px]">
                              {slug ? `/${slug}` : ""} {price ? `• ${money(price)}` : ""}
                            </div>

                            {/* Media picker (no custom uploader) */}
                            <button
                              onClick={() => openThumbPicker(id)}
                              className="mt-1 text-xs text-gray-600 hover:text-black hover:underline"
                            >
                              Change thumbnail
                            </button>
                          </div>
                        </div>
                      </td>

                      <Td>{x?.comingSoonCode || "-"}</Td>

                      {/* Score */}
                      <Td>
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-800">
                          {score}
                        </span>
                      </Td>

                      {/* Threshold + Save */}
                      <Td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={thresholdDraft[id] ?? threshold}
                            onChange={(e) =>
                              setThresholdDraft((p) => ({ ...p, [id]: e.target.value }))
                            }
                            className="w-24 rounded-lg bg-gray-50 px-2 py-1 text-sm outline-none border border-gray-200"
                            min={0}
                          />
                          <button
                            onClick={() => saveThreshold(id, threshold)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
                            disabled={isSaving}
                            title="Save threshold"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      </Td>

                      <Td>{views}</Td>
                      <Td>{clicks}</Td>
                      <Td className="font-semibold">{submits}</Td>
                      <Td>{shares}</Td>
                      <Td className="font-semibold">{waitlist}</Td>
                      <Td>{last}</Td>

                      <Td>
                        <StatusPill value={st} />
                      </Td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => launch(id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-3 py-2 text-xs hover:opacity-90 disabled:opacity-50"
                            disabled={isSaving || st === "launched"}
                          >
                            <Rocket className="h-4 w-4" />
                            {st === "launched" ? "Launched" : "Launch"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty state */}
                {!rows.length && (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-sm text-gray-500">
                      {isLoading ? "Loading..." : "No coming-soon items found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Inline error */}
          {error ? (
            <div className="mt-2 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700">
              {error}
            </div>
          ) : null}
        </div>

        {/* ================= Media Picker Modal ================= */}
        <MediaPickerModal
          open={mediaOpen}
          onClose={() => {
            setMediaOpen(false);
            setMediaTargetId(null);
          }}
          folder="miray/comingsoon"
          onSelect={onSelectMedia}
        />
      </div>
    </div>
  );
}

/* ---------------- small UI (simple + reusable) ---------------- */
function Th({ children, className = "" }) {
  return <th className={`p-3 text-xs font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`p-3 ${className}`}>{children}</td>;
}

function Metric({ label, value, sub = "" }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-3 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-black">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-0.5">{sub}</div> : null}
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "coming_soon");
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
  if (v === "launched")
    return <span className={`${base} bg-black text-white`}>Launched</span>;
  if (v === "archived")
    return <span className={`${base} bg-gray-200 text-gray-700`}>Archived</span>;
  return <span className={`${base} bg-gray-100 text-gray-800`}>Coming Soon</span>;
}
