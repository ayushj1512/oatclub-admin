"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useCustomerStore } from "@/store/customerStore";

export default function CustomerBlacklistSection({
  customer,
  customerId,
}) {
  const toggleCustomerBlacklist = useCustomerStore(
    (state) => state.toggleCustomerBlacklist,
  );

  const saving = useCustomerStore((state) => state.saving);

  const [showConfirm, setShowConfirm] = useState(false);

  const isBlacklisted = customer?.isBlacklisted === true;

  const handleToggleBlacklist = async () => {
    if (!customerId || saving) return;

    const nextStatus = !isBlacklisted;

    const result = await toggleCustomerBlacklist(
      customerId,
      nextStatus,
    );

    if (!result?.success) {
      toast.error(
        result?.error ||
          "Failed to update customer blacklist status",
      );
      return;
    }

    toast.success(
      nextStatus
        ? "Customer blacklisted successfully"
        : "Customer removed from blacklist",
    );

    setShowConfirm(false);
  };

  return (
    <>
      <section
        className={`overflow-hidden rounded-2xl border bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] ${
          isBlacklisted
            ? "border-red-200"
            : "border-gray-100"
        }`}
      >
        <div
          className={`flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
            isBlacklisted
              ? "border-red-100 bg-red-50/60"
              : "border-gray-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                isBlacklisted
                  ? "border-red-200 bg-red-100 text-red-700"
                  : "border-gray-200 bg-gray-50 text-gray-900"
              }`}
            >
              {isBlacklisted ? (
                <Ban className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Customer Order Restriction
                </h2>

                {isBlacklisted ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                    <Ban className="h-3 w-3" />
                    Blacklisted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Orders Allowed
                  </span>
                )}
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                {isBlacklisted
                  ? "Cash on Delivery is restricted for this customer. They can continue using supported online payment methods."
                  : "This customer can currently place orders using all available payment methods."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!customerId || saving}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isBlacklisted
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isBlacklisted ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <Ban className="h-4 w-4" />
            )}

            {saving
              ? "Updating..."
              : isBlacklisted
                ? "Remove Blacklist"
                : "Blacklist Customer"}
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <StatusItem
            title="Customer status"
            value={
              isBlacklisted
                ? "Restricted"
                : "Active"
            }
            danger={isBlacklisted}
          />

          <StatusItem
            title="Cash on Delivery"
            value={
              isBlacklisted
                ? "Disabled"
                : "Enabled"
            }
            danger={isBlacklisted}
          />

          <StatusItem
            title="Online payment"
            value="Enabled"
          />
        </div>

        {isBlacklisted && (
          <div className="mx-6 mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Customer is currently restricted
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                The storefront will automatically disable Cash on
                Delivery when this customer is identified during
                checkout.
              </p>
            </div>
          </div>
        )}
      </section>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close confirmation"
            onClick={() => {
              if (!saving) setShowConfirm(false);
            }}
            className="absolute inset-0"
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={saving}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                isBlacklisted
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isBlacklisted ? (
                <UserCheck className="h-6 w-6" />
              ) : (
                <Ban className="h-6 w-6" />
              )}
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-950">
              {isBlacklisted
                ? "Remove customer from blacklist?"
                : "Blacklist this customer?"}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {isBlacklisted ? (
                <>
                  <span className="font-semibold text-gray-900">
                    {customer?.name ||
                      customer?.email ||
                      "This customer"}
                  </span>{" "}
                  will regain access to Cash on Delivery.
                </>
              ) : (
                <>
                  Cash on Delivery will be disabled for{" "}
                  <span className="font-semibold text-gray-900">
                    {customer?.name ||
                      customer?.email ||
                      "this customer"}
                  </span>
                  . Online payment will remain available.
                </>
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleToggleBlacklist}
                disabled={saving}
                className={`inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isBlacklisted
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isBlacklisted ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}

                {saving
                  ? "Updating..."
                  : isBlacklisted
                    ? "Allow COD"
                    : "Disable COD"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusItem({
  title,
  value,
  danger = false,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          danger
            ? "text-red-700"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}