"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Radio,
  BadgeCheck,
  Gift,
  IndianRupee,
  Search,
  Plus,
  ArrowRight,
  RefreshCcw,
  UserRound,
} from "lucide-react";

import { useInfluencerProgramStore } from "@/store/influencerProgramStore";

const cardClass =
  "rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm";
const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black";

const safe = (v) => (v == null || v === "" ? "-" : String(v));

const formatNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "0";
};

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
          {subtitle ? (
            <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, total }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-700">{label}</span>
        <span className="text-neutral-500">
          {formatNumber(value)} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function InfluencerAnalyticsPage() {
  const {
    influencers,
    loading,
    fetchInfluencers,
  } = useInfluencerProgramStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInfluencers({ page: 1, limit: 500, search: "" });
  }, [fetchInfluencers]);

  const analytics = useMemo(() => {
    const rows = Array.isArray(influencers) ? influencers : [];

    const totalInfluencers = rows.length;
    const totalReach = rows.reduce(
      (sum, item) => sum + Number(item?.totalReach || 0),
      0
    );

    const avgReach = totalInfluencers
      ? Math.round(totalReach / totalInfluencers)
      : 0;

    const statusCounts = {
      new: 0,
      contacted: 0,
      interested: 0,
      active: 0,
      rejected: 0,
      inactive: 0,
    };

    const typeCounts = {
      barter: 0,
      paid: 0,
      affiliate: 0,
      gifting: 0,
    };

    rows.forEach((item) => {
      const status = String(item?.status || "").toLowerCase();
      const type = String(item?.collaborationType || "").toLowerCase();

      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      if (typeCounts[type] !== undefined) typeCounts[type] += 1;
    });

    const sortedByReach = [...rows].sort(
      (a, b) => Number(b?.totalReach || 0) - Number(a?.totalReach || 0)
    );

    const filtered = rows.filter((item) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;

      return (
        String(item?.code || "").toLowerCase().includes(q) ||
        String(item?.fullName || "").toLowerCase().includes(q) ||
        String(item?.mobile || "").toLowerCase().includes(q) ||
        String(item?.city || "").toLowerCase().includes(q) ||
        String(item?.state || "").toLowerCase().includes(q) ||
        String(item?.niche || "").toLowerCase().includes(q)
      );
    });

    return {
      totalInfluencers,
      totalReach,
      avgReach,
      statusCounts,
      typeCounts,
      topInfluencers: sortedByReach.slice(0, 10),
      filtered,
    };
  }, [influencers, search]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Influencer Analytics
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Overview of influencer collaboration performance and records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchInfluencers({ page: 1, limit: 500, search: "" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <Link
              href="/infleuncer-collaboration/add"
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Influencer
            </Link>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Influencers"
            value={formatNumber(analytics.totalInfluencers)}
            subtitle="All influencer records"
            icon={Users}
          />
          <MetricCard
            title="Total Reach"
            value={formatNumber(analytics.totalReach)}
            subtitle="Combined audience size"
            icon={Radio}
          />
          <MetricCard
            title="Average Reach"
            value={formatNumber(analytics.avgReach)}
            subtitle="Average per influencer"
            icon={BarChart3}
          />
          <MetricCard
            title="Active Influencers"
            value={formatNumber(analytics.statusCounts.active)}
            subtitle="Currently active collaborations"
            icon={BadgeCheck}
          />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <UserRound className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Status Breakdown
                </h2>
                <p className="text-sm text-neutral-500">
                  Current collaboration stage distribution
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <MiniBar
                label="New"
                value={analytics.statusCounts.new}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Contacted"
                value={analytics.statusCounts.contacted}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Interested"
                value={analytics.statusCounts.interested}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Active"
                value={analytics.statusCounts.active}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Rejected"
                value={analytics.statusCounts.rejected}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Inactive"
                value={analytics.statusCounts.inactive}
                total={analytics.totalInfluencers}
              />
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <Gift className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Collaboration Type Breakdown
                </h2>
                <p className="text-sm text-neutral-500">
                  Distribution by collaboration model
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <MiniBar
                label="Barter"
                value={analytics.typeCounts.barter}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Paid"
                value={analytics.typeCounts.paid}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Affiliate"
                value={analytics.typeCounts.affiliate}
                total={analytics.totalInfluencers}
              />
              <MiniBar
                label="Gifting"
                value={analytics.typeCounts.gifting}
                total={analytics.totalInfluencers}
              />
            </div>
          </section>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
          <section className="xl:col-span-3 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Top Influencers by Reach
                </h2>
                <p className="text-sm text-neutral-500">
                  Highest audience profiles in your program
                </p>
              </div>

              <Link
                href="/infleuncer-collaboration/all"
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
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
                        Type
                      </th>
                      <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                        Reach
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-neutral-500"
                        >
                          Loading analytics...
                        </td>
                      </tr>
                    ) : analytics.topInfluencers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-neutral-500"
                        >
                          No data found
                        </td>
                      </tr>
                    ) : (
                      analytics.topInfluencers.map((item) => (
                        <tr key={item._id} className="hover:bg-neutral-50">
                          <td className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">
                            <Link
                              href={`/infleuncer-collaboration/${item.code}`}
                              className="hover:underline"
                            >
                              {safe(item.code)}
                            </Link>
                          </td>
                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            {safe(item.fullName)}
                          </td>
                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                            {safe(item.mobile)}
                          </td>
                          <td className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900 capitalize">
                            {safe(item.collaborationType)}
                          </td>
                          <td className="border-b border-neutral-200 px-4 py-3 text-right text-sm font-semibold text-neutral-900">
                            {formatNumber(item.totalReach)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="xl:col-span-2 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <Search className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Quick Search
                </h2>
                <p className="text-sm text-neutral-500">
                  Search by code, name, mobile, city, state, niche
                </p>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search influencer..."
                className={inputClass}
              />
            </div>

            <div className="space-y-3">
              {analytics.filtered.slice(0, 8).map((item) => (
                <Link
                  key={item._id}
                  href={`/infleuncer-collaboration/${item.code}`}
                  className="block rounded-2xl border border-neutral-200 p-4 transition hover:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {safe(item.fullName)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Code: {safe(item.code)} • Mobile: {safe(item.mobile)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {safe(item.city)}, {safe(item.state)} • {safe(item.niche)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatNumber(item.totalReach)}
                      </p>
                      <p className="mt-1 text-xs capitalize text-neutral-500">
                        {safe(item.status)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {!loading && analytics.filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No matching influencer found
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <BadgeCheck className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Active Snapshot
                </h2>
                <p className="text-sm text-neutral-500">
                  Quick business overview
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Interested
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {formatNumber(analytics.statusCounts.interested)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Contacted
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {formatNumber(analytics.statusCounts.contacted)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Paid Collaborations
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {formatNumber(analytics.typeCounts.paid)}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Affiliate Collaborations
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {formatNumber(analytics.typeCounts.affiliate)}
                </p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-100 p-2">
                <IndianRupee className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Notes
                </h2>
                <p className="text-sm text-neutral-500">
                  This page is audience and status based analytics
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
              You can later extend this page with:
              <div className="mt-3 space-y-2">
                <p>• coupon usage tracking</p>
                <p>• order generated by influencer</p>
                <p>• revenue generated</p>
                <p>• platform-wise engagement charts</p>
                <p>• month-wise collaboration growth</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}