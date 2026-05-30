"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  Wallet,
  PlusCircle,
  MinusCircle,
  ReceiptText,
  Gift,
  Megaphone,
  Users,
  ArrowRight,
  RefreshCw,
  Bell,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCustomerStore } from "@/store/customerStore";

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const creditQuery = {
  page: 1,
  limit: 12,
  hasCreditBalance: true,
  sortBy: "creditBalance",
  sortOrder: "desc",
};

export default function CustomerCreditsPage() {
  const {
    customers,
    total,
    loadingList,
    fetchCustomers,
    fetchCustomerAnalyticsSummary,
  } = useCustomerStore();

  useEffect(() => {
    fetchCustomers(creditQuery);
    fetchCustomerAnalyticsSummary?.();
  }, [fetchCustomers, fetchCustomerAnalyticsSummary]);

  const stats = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        const credits = customer?.credits || {};

        acc.balance += Number(credits.balance || 0);
        acc.credited += Number(credits.totalCredited || 0);
        acc.debited += Number(credits.totalDebited || 0);
        acc.refunds += Number(credits.totalRefundCredits || 0);
        acc.promotions += Number(credits.totalPromotionCredits || 0);
        acc.influencers += Number(credits.totalInfluencerCredits || 0);

        return acc;
      },
      {
        balance: 0,
        credited: 0,
        debited: 0,
        refunds: 0,
        promotions: 0,
        influencers: 0,
      }
    );
  }, [customers]);

  const handleRefresh = async () => {
    await fetchCustomers(creditQuery);
    toast.success("Credit dashboard refreshed");
  };

  const statCards = [
    {
      label: "Wallet Balance",
      value: money(stats.balance),
      icon: Wallet,
      hint: "From current filtered customers",
    },
    {
      label: "Total Credited",
      value: money(stats.credited),
      icon: PlusCircle,
      hint: "Refunds, promotions, influencer credits",
    },
    {
      label: "Total Debited",
      value: money(stats.debited),
      icon: MinusCircle,
      hint: "Used, expired, manual debit",
    },
    {
      label: "Refund Credits",
      value: money(stats.refunds),
      icon: ReceiptText,
      hint: "Wallet refunds only",
    },
  ];

  const quickLinks = [
    {
      title: "Add Credit",
      desc: "Refund, promotion, influencer or manual credit",
      href: "/customers/credits/add",
      icon: PlusCircle,
    },
    {
      title: "Debit Credit",
      desc: "Manual debit, order usage or expiry",
      href: "/customers/credits/debit",
      icon: MinusCircle,
    },
    {
      title: "Credit Logs",
      desc: "Backend filtered wallet history",
      href: "/customers/credits/logs",
      icon: ReceiptText,
    },
    {
      title: "Analytics",
      desc: "Wallet performance and source split",
      href: "/customers/credits/analytics",
      icon: IndianRupee,
    },
    {
      title: "Refunds",
      desc: "Refund wallet credits only",
      href: "/customers/credits/refunds",
      icon: Wallet,
    },
    {
      title: "Promotions",
      desc: "Campaign and coupon credits",
      href: "/customers/credits/promotions",
      icon: Megaphone,
    },
    {
      title: "Influencers",
      desc: "Influencer reward credits",
      href: "/customers/credits/influencers",
      icon: Users,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--primary)] shadow-sm">
            <Bell size={14} />
            Customer wallet & credit control
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
            Customer Credits
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage refund credits, promotion credits, influencer rewards and wallet usage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={loadingList}
            className="btn-secondary"
          >
            <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link href="/customers/credits/add" className="btn-primary">
            <PlusCircle size={16} />
            Add Credit
          </Link>
        </div>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="card card-hover p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl bg-[var(--primary-light)] p-3 text-[var(--primary)]">
                  <Icon size={20} />
                </div>
                <span className="badge-primary">Live</span>
              </div>

              <p className="text-sm text-gray-500">{item.label}</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                {item.value}
              </h2>
              <p className="mt-2 text-xs text-gray-400">{item.hint}</p>
            </div>
          );
        })}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title">Credit Actions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fast shortcuts for wallet operations.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-[var(--primary-border)] bg-white p-4 transition hover:-translate-y-0.5 hover:bg-[var(--primary-light)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="rounded-xl bg-[var(--primary-light)] p-2 text-[var(--primary)]">
                      <Icon size={18} />
                    </div>

                    <ArrowRight
                      size={16}
                      className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[var(--primary)]"
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-gray-950">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title">Credit Split</h2>
          <p className="mt-1 text-sm text-gray-500">
            Source breakdown from loaded records.
          </p>

          <div className="mt-5 space-y-4">
            <SplitRow icon={ReceiptText} label="Refunds" value={money(stats.refunds)} />
            <SplitRow icon={Gift} label="Promotions" value={money(stats.promotions)} />
            <SplitRow icon={Users} label="Influencers" value={money(stats.influencers)} />
          </div>
        </div>
      </section>

      <section className="table-container">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--primary-border)] p-5 md:flex-row md:items-center">
          <div>
            <h2 className="section-title">Customers With Wallet Balance</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing top customers by wallet balance. Total matched: {total || 0}
            </p>
          </div>

          <Link href="/customers/credits/logs" className="btn-secondary">
            View Logs
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="table-head text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Email / Phone</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Credited</th>
                <th className="px-5 py-3">Debited</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    Loading credit data...
                  </td>
                </tr>
              ) : customers.length ? (
                customers.map((customer) => (
                  <tr key={customer._id} className="table-row border-t border-gray-100">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-950">
                        {customer?.name || "Unknown Customer"}
                      </div>
                      <div className="text-xs text-gray-400">
                        ID: {customer?.customerId || customer?._id}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <div>{customer?.email || "No email"}</div>
                      <div className="text-xs text-gray-400">
                        {customer?.phone || "No phone"}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-[var(--primary)]">
                      {money(customer?.credits?.balance)}
                    </td>

                    <td className="px-5 py-4 text-emerald-700">
                      {money(customer?.credits?.totalCredited)}
                    </td>

                    <td className="px-5 py-4 text-red-600">
                      {money(customer?.credits?.totalDebited)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/customers/${customer._id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Open
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No active wallet balances found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SplitRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--soft-bg)] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 text-[var(--primary)] shadow-sm">
          <Icon size={17} />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      <span className="text-sm font-semibold text-gray-950">{value}</span>
    </div>
  );
}