"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Activity,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

/* ----------------------------------
   ENV (backend mounted at "/")
---------------------------------- */
const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

const FEED_URL = BASE ? `${BASE}/xml` : "/xml";

/* ----------------------------------
   Helpers
---------------------------------- */
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

const safeNum = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

/* ----------------------------------
   Page
---------------------------------- */
export default function XmlSyncPage() {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const health = useMemo(() => {
    return {
      cached: !!status?.cached,
      count: status?.count ?? 0,
      builtAt: status?.builtAt || null,
      expiresAt: status?.expiresAt ? new Date(status.expiresAt) : null,
    };
  }, [status]);

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch(`${BASE}/meta-feed/status`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load status");
      setStatus(data);
    } catch (e) {
      toast.error(e?.message || "Failed to load status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const refreshFeed = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${BASE}/meta-feed/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Refresh failed");
      toast.success(`Feed refreshed (${safeNum(data?.count)} products)`);
      await loadStatus();
    } catch (e) {
      toast.error(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f7f9] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Meta XML Feed Sync
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manual refresh + live status for Meta / Google Commerce feed
            </p>
          </div>

          <button
            onClick={loadStatus}
            disabled={loadingStatus}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Refresh Status
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/10 overflow-hidden">
          <div className="p-5 md:p-6 flex flex-col gap-4">
            {/* Feed URL */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm text-gray-600">Feed URL</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={FEED_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 underline decoration-gray-300 hover:decoration-gray-500 break-all"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {FEED_URL}
                  </a>
                  <button
                    onClick={() => copy(FEED_URL)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-gray-50"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Backend base:{" "}
                  <span className="font-semibold">
                    {BASE || "(not set)"}
                  </span>
                </div>
              </div>

              <button
                onClick={refreshFeed}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Force Refresh Feed
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-xs text-gray-500">Cache Status</div>
                <div className="mt-2 flex items-center gap-2">
                  {health.cached ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="text-sm font-semibold text-gray-900">
                    {health.cached ? "Cached" : "Not cached"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-xs text-gray-500">Products in feed</div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {safeNum(health.count)}
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-xs text-gray-500">Last built</div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {fmtDT(health.builtAt)}
                </div>
                {health.expiresAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Expires: {health.expiresAt.toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>

            {/* Help */}
            <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-1">
                How this works
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <b>Force Refresh</b> rebuilds the XML instantly from DB
                </li>
                <li>
                  Use the feed URL in <b>Meta Commerce Manager</b>
                </li>
                <li>
                  Meta will auto-pull on its schedule after this
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
