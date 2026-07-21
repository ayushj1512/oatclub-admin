"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  SectionCard,
  StatusBadge,
  TableLoader,
  formatCurrency,
} from "@/components/affiliate/AffiliateUI";

export default function AffiliateCommissionsPage() {
  const {
    affiliates,
    loading,
    fetchAffiliates,
  } = useAdminAffiliateStore();

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "stats.approvedCommission",
      sortOrder: "desc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  const totals = useMemo(
    () =>
      affiliates.reduce(
        (result, affiliate) => {
          result.pending += Number(
            affiliate.stats?.pendingCommission || 0
          );

          result.approved += Number(
            affiliate.stats?.approvedCommission || 0
          );

          result.paid += Number(
            affiliate.stats?.paidCommission || 0
          );

          return result;
        },
        {
          pending: 0,
          approved: 0,
          paid: 0,
        }
      ),
    [affiliates]
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <AffiliatePageHeader
          title="Commissions"
          description="Review pending, approved and paid affiliate earnings."
          backHref="/affiliate"
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Pending Commission", totals.pending],
            ["Approved Commission", totals.approved],
            ["Paid Commission", totals.paid],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {label}
              </p>

              <p className="mt-3 text-2xl font-semibold text-black">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        <SectionCard>
          {loading ? (
            <TableLoader />
          ) : affiliates.length === 0 ? (
            <EmptyState title="No commission records" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Rule</th>
                    <th className="px-5 py-3">Pending</th>
                    <th className="px-5 py-3">Approved</th>
                    <th className="px-5 py-3">Paid</th>
                    <th className="px-5 py-3">Payout Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {affiliates.map((affiliate) => (
                    <tr key={affiliate._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/affiliate/${affiliate._id}`}
                          className="font-medium text-black hover:underline"
                        >
                          {affiliate.name}
                        </Link>

                        <p className="mt-1 text-xs text-neutral-500">
                          {affiliate.coupon?.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.commission?.value || 0}
                        {affiliate.commission?.type === "percentage"
                          ? "%"
                          : " flat"}{" "}
                        · {affiliate.commission?.approvalTrigger}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.pendingCommission
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.approvedCommission
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.paidCommission
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            Number(
                              affiliate.payoutSummary?.pendingPayout || 0
                            ) > 0
                              ? "pending"
                              : "paid"
                          }
                        />
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