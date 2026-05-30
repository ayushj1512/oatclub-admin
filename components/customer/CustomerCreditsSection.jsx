"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  CreditCard,
  MinusCircle,
  PlusCircle,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { useCustomerStore } from "@/store/customerStore";

const money = (v = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export default function CustomerCreditsSection({ customerId, customer }) {
  const {
    creditLogs,
    loadingCreditLogs,
    fetchCustomerCreditLogs,
  } = useCustomerStore();

  useEffect(() => {
    if (customerId) {
      fetchCustomerCreditLogs?.(customerId, { page: 1, limit: 8 });
    }
  }, [customerId, fetchCustomerCreditLogs]);

  const credits = customer?.credits || {};

  return (
    <section className="rounded-2xl border border-[var(--primary-border)] bg-white shadow-[var(--shadow-soft)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--primary-border)] px-6 py-5 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[var(--primary-light)] p-3 text-[var(--primary)]">
            <Wallet size={20} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-950">
              Customer Credits / Wallet
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Balance, credit summary and recent wallet logs.
            </p>
          </div>
        </div>

        <a
          href="/customers/credits"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Open Credits
          <ArrowRight size={15} />
        </a>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-4">
        <Stat icon={Wallet} label="Balance" value={money(credits.balance)} />
        <Stat icon={PlusCircle} label="Credited" value={money(credits.totalCredited)} />
        <Stat icon={MinusCircle} label="Debited" value={money(credits.totalDebited)} />
        <Stat icon={ReceiptText} label="Refund Credits" value={money(credits.totalRefundCredits)} />
      </div>

      <div className="border-t border-[var(--primary-border)] px-6 py-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard size={17} className="text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-gray-950">Recent Credit Logs</h3>
        </div>

        {loadingCreditLogs ? (
          <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            Loading credit logs...
          </div>
        ) : creditLogs?.length ? (
          <div className="space-y-3">
            {creditLogs.slice(0, 8).map((log, idx) => {
              const isCredit = log.transactionType === "credit";

              return (
                <div
                  key={log.creditId || idx}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 md:flex-row md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={isCredit ? "badge-success" : "badge-danger"}>
                        {log.transactionType} · {log.type}
                      </span>

                      {log.orderNumber ? (
                        <span className="badge-primary">{log.orderNumber}</span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {log.reason || "No reason added"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-IN")
                        : "-"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p
                      className={`text-base font-semibold ${
                        isCredit ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {money(log.amount)}
                    </p>

                    <p className="text-xs text-gray-500">
                      Balance: {money(log.balanceAfterTransaction)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            No credit logs found.
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--soft-bg)] p-4">
      <div className="mb-3 w-fit rounded-xl bg-white p-2 text-[var(--primary)] shadow-sm">
        <Icon size={17} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-950">{value}</p>
    </div>
  );
}