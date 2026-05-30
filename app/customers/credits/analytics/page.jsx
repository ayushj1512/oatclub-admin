"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  BarChart3,
  Gift,
  IndianRupee,
  Megaphone,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCustomerStore } from "@/store/customerStore";

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CreditAnalyticsPage() {
  const { customers, loadingList, fetchCustomers } = useCustomerStore();

  useEffect(() => {
    fetchCustomers({
      page: 1,
      limit: 100,
      hasCreditBalance: true,
      sortBy: "creditBalance",
      sortOrder: "desc",
    });
  }, [fetchCustomers]);

  const stats = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        const c = customer?.credits || {};
        const balance = Number(c.balance || 0);

        acc.customers += 1;
        acc.activeWallets += balance > 0 ? 1 : 0;
        acc.balance += balance;
        acc.credited += Number(c.totalCredited || 0);
        acc.debited += Number(c.totalDebited || 0);
        acc.refunds += Number(c.totalRefundCredits || 0);
        acc.promotions += Number(c.totalPromotionCredits || 0);
        acc.influencers += Number(c.totalInfluencerCredits || 0);

        return acc;
      },
      {
        customers: 0,
        activeWallets: 0,
        balance: 0,
        credited: 0,
        debited: 0,
        refunds: 0,
        promotions: 0,
        influencers: 0,
      }
    );
  }, [customers]);

  const maxSource = Math.max(
    stats.refunds,
    stats.promotions,
    stats.influencers,
    1
  );

  const sourceRows = [
    {
      label: "Refund Credits",
      value: stats.refunds,
      icon: ReceiptText,
    },
    {
      label: "Promotion Credits",
      value: stats.promotions,
      icon: Megaphone,
    },
    {
      label: "Influencer Credits",
      value: stats.influencers,
      icon: Users,
    },
  ];

  const handleRefresh = async () => {
    await fetchCustomers({
      page: 1,
      limit: 100,
      hasCreditBalance: true,
      sortBy: "creditBalance",
      sortOrder: "desc",
    });

    toast.success("Credit analytics refreshed");
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            href="/customers/credits"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
          >
            <ArrowLeft size={16} />
            Back to Credits
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
            Credit Analytics
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Wallet credit overview, source split and active balance summary.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loadingList}
          className="btn-secondary"
        >
          <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={money(stats.balance)}
          hint="Current available balance"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Credited"
          value={money(stats.credited)}
          hint="All-time credit issued"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Debited"
          value={money(stats.debited)}
          hint="Used, expired or adjusted"
        />
        <StatCard
          icon={IndianRupee}
          label="Active Wallets"
          value={stats.activeWallets}
          hint="Customers with balance"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="section-title">Credit Source Split</h2>
              <p className="mt-1 text-sm text-gray-500">
                Breakdown by refund, promotion and influencer credits.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--primary-light)] p-3 text-[var(--primary)]">
              <BarChart3 size={22} />
            </div>
          </div>

          <div className="space-y-5">
            {sourceRows.map((row) => {
              const Icon = row.icon;
              const percent = Math.round((row.value / maxSource) * 100);

              return (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[var(--primary)]" />
                      <span className="text-sm font-medium text-gray-700">
                        {row.label}
                      </span>
                    </div>

                    <span className="text-sm font-semibold text-gray-950">
                      {money(row.value)}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-[var(--soft-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title">Quick Insights</h2>

          <div className="mt-5 space-y-4">
            <InsightRow
              icon={ReceiptText}
              label="Refund Share"
              value={`${getPercent(stats.refunds, stats.credited)}%`}
            />
            <InsightRow
              icon={Gift}
              label="Promotion Share"
              value={`${getPercent(stats.promotions, stats.credited)}%`}
            />
            <InsightRow
              icon={Users}
              label="Influencer Share"
              value={`${getPercent(stats.influencers, stats.credited)}%`}
            />
            <InsightRow
              icon={Wallet}
              label="Debit Ratio"
              value={`${getPercent(stats.debited, stats.credited)}%`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function getPercent(value, total) {
  if (!Number(total)) return 0;
  return Number(((Number(value || 0) / Number(total || 0)) * 100).toFixed(1));
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card card-hover p-5">
      <div className="mb-4 rounded-2xl bg-[var(--primary-light)] p-3 text-[var(--primary)] w-fit">
        <Icon size={20} />
      </div>

      <p className="text-sm text-gray-500">{label}</p>
      <h2 className="mt-1 text-2xl font-semibold text-gray-950">{value}</h2>
      <p className="mt-2 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

function InsightRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--soft-bg)] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 text-[var(--primary)] shadow-sm">
          <Icon size={16} />
        </div>

        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      <span className="text-sm font-semibold text-gray-950">{value}</span>
    </div>
  );
}