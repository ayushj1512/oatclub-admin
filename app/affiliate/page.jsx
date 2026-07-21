"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Plus,
  ReceiptIndianRupee,
  TicketPercent,
  Users,
  
} from "lucide-react";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  PrimaryButton,
  SectionCard,
  StatCard,
  StatusBadge,
  TableLoader,
  formatCurrency,
} from "@/components/affiliate/AffiliateUI";

export default function AffiliateDashboardPage() {
  const {
    affiliates,
    loading,
    fetchAffiliates,
  } = useAdminAffiliateStore();

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "stats.totalRevenue",
      sortOrder: "desc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  const stats = useMemo(() => {
    return affiliates.reduce(
      (result, affiliate) => {
        result.total += 1;

        if (affiliate.status === "active") {
          result.active += 1;
        }

        result.orders += Number(
          affiliate.stats?.totalOrders || 0
        );

        result.revenue += Number(
          affiliate.stats?.totalRevenue || 0
        );

        result.pending += Number(
          affiliate.payoutSummary?.pendingPayout || 0
        );

        return result;
      },
      {
        total: 0,
        active: 0,
        orders: 0,
        revenue: 0,
        pending: 0,
      }
    );
  }, [affiliates]);

  const topAffiliates = affiliates.slice(0, 8);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <AffiliatePageHeader
          title="Affiliate Dashboard"
          description="Track influencer-led revenue, coupon performance, commissions and payable balances."
          actions={
            <PrimaryButton href="/affiliate/create">
              <Plus size={15} />
              Create Affiliate
            </PrimaryButton>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Affiliates"
            value={stats.total}
            icon={Users}
            loading={loading}
          />

          <StatCard
            label="Active Affiliates"
            value={stats.active}
            icon={Users}
            loading={loading}
          />

          <StatCard
            label="Affiliate Orders"
            value={stats.orders}
            icon={ReceiptIndianRupee}
            loading={loading}
          />

          <StatCard
            label="Affiliate Revenue"
            value={formatCurrency(stats.revenue)}
            icon={BadgeIndianRupee}
            loading={loading}
          />

          <StatCard
            label="Pending Payout"
            value={formatCurrency(stats.pending)}
            icon={TicketPercent}
            loading={loading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <SectionCard
            title="Top Performing Affiliates"
            description="Affiliates ranked by attributed revenue."
            actions={
              <Link
                href="/affiliate/all"
                className="inline-flex items-center gap-2 text-xs font-semibold text-black"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            }
          >
            {loading ? (
              <TableLoader />
            ) : topAffiliates.length === 0 ? (
              <EmptyState title="No affiliates created" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                      <th className="px-5 py-3 font-semibold">Affiliate</th>
                      <th className="px-5 py-3 font-semibold">Coupon</th>
                      <th className="px-5 py-3 font-semibold">Orders</th>
                      <th className="px-5 py-3 font-semibold">Revenue</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100">
                    {topAffiliates.map((affiliate) => (
                      <tr
                        key={affiliate._id}
                        className="transition hover:bg-neutral-50"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/affiliate/${affiliate._id}`}
                            className="font-medium text-black hover:underline"
                          >
                            {affiliate.name}
                          </Link>

                          <p className="mt-1 text-xs text-neutral-500">
                            {affiliate.affiliateNumber}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-black">
                          {affiliate.coupon?.code || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {affiliate.stats?.totalOrders || 0}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-black">
                          {formatCurrency(
                            affiliate.stats?.totalRevenue
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={affiliate.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Affiliate Operations"
            description="Quick access to daily workflows."
          >
            <div className="space-y-2 p-4">
              {[
                {
                  title: "All Affiliates",
                  description: "Manage profiles and settings",
                  href: "/affiliate/all",
                },
                {
                  title: "Affiliate Orders",
                  description: "Review attributed orders",
                  href: "/affiliate/orders",
                },
                {
                  title: "Coupon Performance",
                  description: "Compare influencer coupon results",
                  href: "/affiliate/coupons",
                },
                {
                  title: "Pending Payouts",
                  description: "Review payable commission",
                  href: "/affiliate/pending-payouts",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 transition hover:border-black"
                >
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {item.description}
                    </p>
                  </div>

                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}