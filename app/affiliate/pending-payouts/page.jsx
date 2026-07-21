"use client";

import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Loader2 } from "lucide-react";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  SectionCard,
  TableLoader,
  formatCurrency,
} from "@/components/affiliate/AffiliateUI";

export default function PendingAffiliatePayoutsPage() {
  const {
    affiliates,
    loading,
    mutationLoading,
    fetchAffiliates,
    recordAffiliatePayout,
  } = useAdminAffiliateStore();

  const [payingId, setPayingId] = useState("");

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "payoutSummary.pendingPayout",
      sortOrder: "desc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  const rows = useMemo(
    () =>
      affiliates.filter(
        (affiliate) =>
          Number(affiliate.payoutSummary?.pendingPayout || 0) > 0
      ),
    [affiliates]
  );

  const markPaid = async (affiliate) => {
    const payable = Number(
      affiliate.payoutSummary?.pendingPayout || 0
    );

    const enteredAmount = window.prompt(
      `Enter payout amount for ${affiliate.name}`,
      String(payable)
    );

    if (!enteredAmount) return;

    const amount = Number(enteredAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a valid payout amount.");
      return;
    }

    const reference =
      window.prompt("Enter UPI/bank reference") || "";

    try {
      setPayingId(affiliate._id);

      await recordAffiliatePayout(affiliate._id, {
        amount,
        reference,
        paidAt: new Date().toISOString(),
      });

      await fetchAffiliates();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setPayingId("");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <AffiliatePageHeader
          title="Pending Payouts"
          description="Review approved affiliate balances and record completed payouts."
          backHref="/affiliate"
        />

        <SectionCard>
          {loading ? (
            <TableLoader />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No pending payouts"
              description="All approved affiliate balances are currently settled."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Coupon</th>
                    <th className="px-5 py-3">Orders</th>
                    <th className="px-5 py-3">Revenue</th>
                    <th className="px-5 py-3">Approved</th>
                    <th className="px-5 py-3">Pending Payout</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3 text-right">Action</th>
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

                      <td className="px-5 py-4 text-sm text-neutral-600">
                        {affiliate.stats?.totalOrders || 0}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.totalRevenue
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(
                          affiliate.stats?.approvedCommission
                        )}
                      </td>

                      <td className="px-5 py-4 text-base font-semibold text-black">
                        {formatCurrency(
                          affiliate.payoutSummary?.pendingPayout
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm capitalize text-neutral-600">
                        {affiliate.payoutAccount?.method || "manual"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={
                            mutationLoading &&
                            payingId === affiliate._id
                          }
                          onClick={() => markPaid(affiliate)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                        >
                          {mutationLoading &&
                          payingId === affiliate._id ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <IndianRupee size={14} />
                          )}
                          Mark Paid
                        </button>
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