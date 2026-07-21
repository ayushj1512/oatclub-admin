"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  SearchField,
  SectionCard,
  StatusBadge,
  TableLoader,
  formatCurrency,
  formatDate,
} from "@/components/affiliate/AffiliateUI";

export default function AffiliateCouponsPage() {
  const {
    affiliates,
    loading,
    fetchAffiliates,
  } = useAdminAffiliateStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "stats.totalRevenue",
      sortOrder: "desc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return affiliates.filter((affiliate) => {
      if (!query) return true;

      return [
        affiliate.name,
        affiliate.coupon?.code,
        affiliate.affiliateNumber,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [affiliates, search]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <AffiliatePageHeader
          title="Coupon Performance"
          description="Compare influencer coupon usage, revenue contribution and commission cost."
          backHref="/affiliate"
        />

        <SectionCard>
          <div className="border-b border-neutral-200 p-4">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search coupon or affiliate..."
            />
          </div>

          {loading ? (
            <TableLoader />
          ) : rows.length === 0 ? (
            <EmptyState title="No coupon performance found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Coupon</th>
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Discount</th>
                    <th className="px-5 py-3">Orders</th>
                    <th className="px-5 py-3">Revenue</th>
                    <th className="px-5 py-3">Commission</th>
                    <th className="px-5 py-3">Valid Till</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {rows.map((affiliate) => (
                    <tr key={affiliate._id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-black">
                          {affiliate.coupon?.code || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/affiliate/${affiliate._id}`}
                          className="text-sm font-medium text-black hover:underline"
                        >
                          {affiliate.name}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {affiliate.affiliateNumber}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.coupon?.discountValue || 0}
                        {affiliate.coupon?.discountType === "percentage"
                          ? "%"
                          : " flat"}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.stats?.totalOrders || 0}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
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

                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {formatDate(
                          affiliate.coupon?.couponId?.validTill
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
      </div>
    </main>
  );
}