"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Search,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

export default function DelhiveryLabelsPage() {
  const router = useRouter();

  const [waybill, setWaybill] = useState("");
  const [labelData, setLabelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchLabel = async (event) => {
    event.preventDefault();

    const awb = waybill.trim();

    if (!awb) {
      setError("AWB number is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setLabelData(null);

      const response = await fetch(
        `${API_URL}/api/delhivery/label/${encodeURIComponent(awb)}`,
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to fetch label.");
      }

      setLabelData(result.data);
    } catch (err) {
      setError(err.message || "Label request failed.");
    } finally {
      setLoading(false);
    }
  };

  const labelUrl =
    labelData?.packages?.[0]?.pdf_download_link ||
    labelData?.packages?.[0]?.pdf ||
    labelData?.pdf_download_link ||
    labelData?.pdf ||
    labelData?.url ||
    "";

  const handleOpenLabel = () => {
    if (!labelUrl) return;
    window.open(labelUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/delhivery")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Delhivery
        </button>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <FileText size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                Shipping Labels
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Fetch and open a Delhivery label using the AWB number.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleFetchLabel}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={waybill}
              onChange={(event) => setWaybill(event.target.value)}
              placeholder="Enter AWB number"
              className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}

              Fetch Label
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </section>

        {labelData && (
          <section className="mt-5 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  AWB Number
                </p>

                <p className="mt-1 text-lg font-bold text-zinc-950">
                  {waybill}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenLabel}
                disabled={!labelUrl}
                className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={17} />
                Open Label
              </button>
            </div>

            {!labelUrl && (
              <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Label response received, but no PDF URL was found.
              </div>
            )}

            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-600">
                View API response
              </summary>

              <pre className="mt-3 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs text-white">
                {JSON.stringify(labelData, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
