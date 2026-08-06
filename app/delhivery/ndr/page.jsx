"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001";

export default function DelhiveryNdrPage() {
  const router = useRouter();

  const [waybill, setWaybill] = useState("");
  const [action, setAction] = useState("reattempt");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const awb = waybill.trim();

    if (!awb) {
      setError("AWB number is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await fetch(`${API_URL}/api/delhivery/ndr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          waybill: awb,
          action,
          remarks: remarks.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "NDR action failed.");
      }

      setResult(data.data || data);
    } catch (err) {
      setError(err.message || "Unable to process NDR action.");
    } finally {
      setLoading(false);
    }
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
              <AlertTriangle size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                NDR Action
              </h1>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Handle failed delivery attempts using the shipment AWB.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-zinc-800">
                AWB Number
              </label>

              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-zinc-200 px-4">
                <Search size={17} className="text-zinc-400" />

                <input
                  type="text"
                  value={waybill}
                  onChange={(event) => setWaybill(event.target.value)}
                  placeholder="Enter Delhivery AWB"
                  className="w-full py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-800">
                Action
              </label>

              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
              >
                <option value="reattempt">Reattempt Delivery</option>
                <option value="return">Return to Origin</option>
                <option value="update_address">Update Address</option>
                <option value="update_phone">Update Phone</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-800">
                Remarks
              </label>

              <textarea
                rows={4}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add instructions or customer remarks"
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <AlertTriangle size={17} />
                  Submit NDR Action
                </>
              )}
            </button>
          </form>
        </section>

        {result && (
          <section className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-700" />

              <div>
                <h2 className="font-bold text-emerald-950">
                  NDR action submitted
                </h2>

                <p className="mt-1 text-sm text-emerald-700">
                  Delhivery accepted the request.
                </p>
              </div>
            </div>

            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                View API response
              </summary>

              <pre className="mt-3 overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs text-white">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
