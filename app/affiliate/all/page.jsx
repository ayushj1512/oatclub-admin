"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  Pagination,
  PrimaryButton,
  SearchField,
  SectionCard,
  SelectField,
  StatusBadge,
  TableLoader,
  formatCurrency,
  formatDate,
} from "@/components/affiliate/AffiliateUI";

export default function AllAffiliatesPage() {
  const {
    affiliates,
    loading,
    filters,
    pagination,
    setFilters,
    fetchAffiliates,
  } = useAdminAffiliateStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAffiliates().catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [
    filters.q,
    filters.status,
    filters.platform,
    filters.isActive,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit,
    fetchAffiliates,
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-7">
        <AffiliatePageHeader
          title="All Affiliates"
          description="Manage influencer accounts, coupon codes, commission rates and affiliate performance."
          backHref="/affiliate"
          actions={
            <PrimaryButton href="/affiliate/create">
              <Plus size={15} />
              Create Affiliate
            </PrimaryButton>
          }
        />

        <SectionCard>
          <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row">
            <SearchField
              value={filters.q}
              onChange={(q) => setFilters({ q })}
              placeholder="Search name, code, username, email or phone..."
            />

            <SelectField
              value={filters.status}
              onChange={(status) => setFilters({ status })}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="paused">Paused</option>
              <option value="blocked">Blocked</option>
            </SelectField>

            <SelectField
              value={filters.platform}
              onChange={(platform) => setFilters({ platform })}
            >
              <option value="">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="snapchat">Snapchat</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </SelectField>

            <SelectField
              value={filters.sortBy}
              onChange={(sortBy) => setFilters({ sortBy })}
            >
              <option value="createdAt">Recently created</option>
              <option value="name">Name</option>
              <option value="stats.totalRevenue">Highest revenue</option>
              <option value="stats.totalOrders">Highest orders</option>
              <option value="payoutSummary.pendingPayout">
                Pending payout
              </option>
            </SelectField>

            <button
              type="button"
              onClick={() => fetchAffiliates()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-black hover:border-black"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <TableLoader />
          ) : affiliates.length === 0 ? (
            <EmptyState title="No affiliates found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Coupon</th>
                    <th className="px-5 py-3">Platform</th>
                    <th className="px-5 py-3">Orders</th>
                    <th className="px-5 py-3">Revenue</th>
                    <th className="px-5 py-3">Commission</th>
                    <th className="px-5 py-3">Pending Payout</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {affiliates.map((affiliate) => (
                    <tr
                      key={affiliate._id}
                      className="transition hover:bg-neutral-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">
                          {affiliate.name}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {affiliate.affiliateNumber} · @{affiliate.username}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-black">
                          {affiliate.coupon?.code || "—"}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {affiliate.coupon?.discountValue || 0}
                          {affiliate.coupon?.discountType === "percentage"
                            ? "%"
                            : " flat"}{" "}
                          off
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm capitalize text-neutral-600">
                        {affiliate.platform || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.stats?.totalOrders || 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.totalRevenue
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.commission?.value || 0}
                        {affiliate.commission?.type === "percentage"
                          ? "%"
                          : " flat"}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-black">
                        {formatCurrency(
                          affiliate.payoutSummary?.pendingPayout
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={affiliate.status} />
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {formatDate(affiliate.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/affiliate/${affiliate._id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-black hover:border-black"
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            pagination={pagination}
            onPageChange={(page) => setFilters({ page })}
          />
        </SectionCard>
      </div>
    </main>
  );
}