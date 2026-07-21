"use client";

import { useEffect, useMemo } from "react";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  SectionCard,
  StatusBadge,
  TableLoader,
  formatCurrency,
  formatDate,
} from "@/components/affiliate/AffiliateUI";

export default function AffiliatePayoutHistoryPage() {
  const {
    affiliates,
    loading,
    fetchAffiliates,
  } = useAdminAffiliateStore();

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  const rows = useMemo(
    () =>
      affiliates.filter(
        (affiliate) =>
          Number(affiliate.payoutSummary?.totalPaid || 0) > 0
      ),
    [affiliates]
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <AffiliatePageHeader
          title="Payout History"
          description="Review lifetime paid commission and latest recorded payment references."
          backHref="/affiliate"
        />

        <SectionCard>
          {loading ? (
            <TableLoader />
          ) : rows.length === 0 ? (
            <EmptyState title="No payouts recorded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Coupon</th>
                    <th className="px-5 py-3">Total Paid</th>
                    <th className="px-5 py-3">Last Reference</th>
                    <th className="px-5 py-3">Last Paid</th>
                    <th className="px-5 py-3">Pending</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {rows.map((affiliate) => (
                    <tr key={affiliate._id}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">
                          {affiliate.name}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {affiliate.affiliateNumber}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-black">
                        {affiliate.coupon?.code || "—"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-black">
                        {formatCurrency(
                          affiliate.payoutSummary?.totalPaid
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.payoutSummary
                          ?.lastPaymentReference || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {formatDate(
                          affiliate.payoutSummary?.lastPaidAt
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.payoutSummary?.pendingPayout
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status="paid" />
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