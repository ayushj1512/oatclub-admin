"use client";

import { useMemo, useState } from "react";
import { useShiprocketStore } from "@/store/ShipRocketStore";

export default function ShiprocketAuthApiPage() {
  const {
    tokenLoading,
    tokenError,
    token,
    tokenFetchedAt,
    fetchToken,
    clearTokenError,
  } = useShiprocketStore();

  const [copied, setCopied] = useState(false);

  const fetchedTime = useMemo(() => {
    if (!tokenFetchedAt) return "";
    try {
      return new Date(tokenFetchedAt).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [tokenFetchedAt]);

  const onFetch = async () => {
    setCopied(false);
    clearTokenError?.();
    await fetchToken();
  };

  const onCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fafafa] text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Shiprocket Authentication
              </h1>
            </div>

            <p className="text-sm text-gray-600 mt-2">
              Token is fetched from{" "}
              <code className="px-2 py-1 bg-white/70 rounded-md text-gray-800 ring-1 ring-black/5">
                GET /api/shiprocket/token
              </code>
            </p>
          </div>

          <button
            onClick={onFetch}
            disabled={tokenLoading}
            className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-900 disabled:opacity-60 disabled:hover:bg-black"
          >
            {tokenLoading ? "Fetching..." : "Fetch Token"}
          </button>
        </div>

        {/* Error */}
        {tokenError ? (
          <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-red-500/15">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-red-700">
                  Token fetch failed
                </div>
                <div className="mt-1 text-sm text-red-700/90 break-words">
                  {String(tokenError)}
                </div>
              </div>

              <button
                onClick={() => clearTokenError?.()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {/* Card */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              </div>
              <div>
                <div className="text-sm font-semibold">Current Token</div>
                <div className="text-xs text-gray-500">
                  {tokenFetchedAt ? (
                    <>
                      Last fetched:{" "}
                      <span className="text-gray-700 font-medium">
                        {fetchedTime}
                      </span>
                    </>
                  ) : (
                    "Last fetched: -"
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                disabled={!token}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title={token ? "Copy token" : "No token yet"}
              >
                {copied ? "Copied ✅" : "Copy"}
              </button>

              <button
                onClick={onFetch}
                disabled={tokenLoading}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                title="Refresh token"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4">
            <textarea
              value={token || ""}
              readOnly
              placeholder="No token fetched yet..."
              className="w-full min-h-[160px] rounded-2xl bg-gray-50/70 p-4 font-mono text-[12px] text-gray-800 ring-1 ring-black/5 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500/90" />
              <span>
                Status:{" "}
                <span className="font-medium text-gray-800">
                  {tokenLoading ? "Loading..." : token ? "Ready" : "Empty"}
                </span>
              </span>
            </div>

            <div className="text-gray-500">
              Tip: Use this token only for debugging/admin use.
            </div>
          </div>
        </div>

      
      </div>
    </div>
  );
}
