"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCcw,
  Users,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { useInfluencerProgramStore } from "@/store/influencerProgramStore";

const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black";

const safe = (v) => (v == null || v === "" ? "-" : String(v));

const formatNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "0";
};

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export default function InfluencerSearchPage() {
  const router = useRouter();

  const { fetchInfluencers, loading } = useInfluencerProgramStore();

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]);

  const stats = useMemo(() => {
    const total = results.length;
    const totalReach = results.reduce(
      (sum, item) => sum + Number(item?.totalReach || 0),
      0
    );

    return {
      total,
      totalReach,
    };
  }, [results]);

  const handleSearch = async (e) => {
    e?.preventDefault?.();

    const q = query.trim();
    if (!q) return;

    setSubmitting(true);
    setSearched(true);

    try {
      const data = await fetchInfluencers({
        page: 1,
        limit: 100,
        search: q,
      });

      setResults(data?.influencers || []);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const handleRowClick = (row) => {
    if (!row?.code) return;
    router.push(`/infleuncer-collaboration/${row.code}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2">
              <Search className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Search Influencer
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Enter influencer code, full name, or mobile number and search when ready.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Search Input
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code, name, mobile"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={!query.trim() || submitting}
              className="mt-0 inline-flex items-center justify-center gap-2 self-end rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {submitting ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="mt-0 inline-flex items-center justify-center gap-2 self-end rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </form>
        </div>

        {searched ? (
          <>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard label="Results" value={formatNumber(stats.total)} />
              <InfoCard label="Total Reach" value={formatNumber(stats.totalReach)} />
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-neutral-100 p-2">
                    <Users className="h-4 w-4 text-neutral-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Search Results
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Click any row to open influencer details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!query.trim() || submitting || loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${
                      submitting || loading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        Code
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        Name
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        Mobile
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        City
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        State
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        Type
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                        Status
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                        Reach
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                        Open
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-neutral-500"
                        >
                          No influencer found for this search
                        </td>
                      </tr>
                    ) : (
                      results.map((row) => (
                        <tr
                          key={row._id}
                          onClick={() => handleRowClick(row)}
                          className="cursor-pointer transition hover:bg-neutral-50"
                        >
                          <td className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
                            {safe(row.code)}
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            <div className="font-medium">{safe(row.fullName)}</div>
                            <div className="mt-0.5 text-xs text-neutral-500">
                              {safe(row.email)}
                            </div>
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            {safe(row.mobile)}
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            {safe(row.city)}
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            {safe(row.state)}
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-800">
                              {safe(row.collaborationType)}
                            </span>
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            <span className="inline-flex rounded-full bg-black px-3 py-1 text-xs font-semibold capitalize text-white">
                              {safe(row.status)}
                            </span>
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                            {formatNumber(row.totalReach)}
                          </td>

                          <td className="border-b border-neutral-200 px-4 py-3 text-right text-sm text-neutral-700">
                            <span className="inline-flex items-center gap-1 font-medium">
                              Open
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-10 text-center shadow-sm">
            <Search className="mx-auto mb-3 h-6 w-6 text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">
              No data loaded yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Enter code, name, or mobile and click search to load results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}