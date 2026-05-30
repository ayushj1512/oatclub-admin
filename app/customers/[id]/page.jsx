// ✅ app/customers/[id]/page.jsx — WHOLE UPDATED FILE (with Banking/UPI refund section)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CreditCard, IndianRupee, Save, ShieldCheck } from "lucide-react";

import CustomerSection from "@/components/customer/CustomerSection";
import CustomerCartAddsSection from "@/components/customer/CustomerCartAddsSection";
// import AbandonedCartsSection from "@/components/customer/AbandonedCartsSection";
import WishlistSection from "@/components/customer/WishlistSection";
import AddressSection from "@/components/customer/AddressSection";
import OrderSection from "@/components/customer/OrderSection";
import SupportTicketSection from "@/components/customer/SupportTicketSection";
import CustomerAnalyticsSection from "@/components/customer/CustomerAnalyticsSection";
import CustomerCreditsSection from "@/components/customer/CustomerCreditsSection";
import { useCustomerStore } from "@/store/customerStore";

const safe = (v) => String(v ?? "").trim();

const Field = ({ label, value, onChange, placeholder = "", type = "text" }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-medium text-gray-600">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl bg-white border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400
                 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20"
    />
  </div>
);

const Card = ({ children }) => (
  <div className="rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100">
    {children}
  </div>
);

const CardHeader = ({ icon, title, subtitle, right }) => (
  <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? (
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
    </div>
    {right}
  </div>
);

export default function CustomerDetailPage() {
  const params = useParams();

  const routeId = useMemo(() => {
    const raw = params?.id;
    return safe(Array.isArray(raw) ? raw[0] : raw);
  }, [params]);

  const customer = useCustomerStore((s) => s.customer);
  const fetchCustomerById = useCustomerStore((s) => s.fetchCustomerById);

  // ✅ NEW store action
  const updateCustomerPayoutDetails = useCustomerStore((s) => s.updateCustomerPayoutDetails);
  const payoutSaving = useCustomerStore((s) => s.payoutSaving);
  const payoutError = useCustomerStore((s) => s.payoutError);

  useEffect(() => {
    if (!routeId) return;
    fetchCustomerById?.(routeId);
  }, [routeId, fetchCustomerById]);

  const customerEmail = useMemo(
    () => safe(customer?.email).toLowerCase(),
    [customer?.email]
  );
  const customerUID = useMemo(() => safe(customer?.firebaseUID), [customer?.firebaseUID]);
  const customerMongoId = useMemo(() => safe(customer?._id) || routeId, [customer?._id, routeId]);

  // ✅ Prefill from customer payoutDetails
  const payout = customer?.payoutDetails || {};
  const bank = payout?.bank || {};
  const upi = payout?.upi || {};

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  // keep inputs synced when customer changes
  useEffect(() => {
    setAccountHolderName(safe(bank?.accountHolderName));
    setAccountNumber(safe(bank?.accountNumber));
    setIfscCode(safe(bank?.ifscCode));
    setUpiId(safe(upi?.upiId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMongoId]); // when switching customers

  const hasBank =
    !!safe(accountHolderName) || !!safe(accountNumber) || !!safe(ifscCode);
  const hasUpi = !!safe(upiId);

  const savePayout = async () => {
    if (!customerMongoId) return;

    // ✅ allow either bank OR upi OR both, but at least one
    if (!hasBank && !hasUpi) return;

    const payload = {};

    if (hasBank) {
      payload.bank = {
        accountHolderName: safe(accountHolderName),
        accountNumber: safe(accountNumber),
        ifscCode: safe(ifscCode).toUpperCase(),
      };
    }

    if (hasUpi) {
      payload.upi = { upiId: safe(upiId).toLowerCase() };
    }

    await updateCustomerPayoutDetails?.(customerMongoId, payload);

    // refresh to ensure server-truth (optional but safest)
    fetchCustomerById?.(customerMongoId);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fafafa] min-h-screen">
      {/* Top sections */}
      <CustomerSection customerId={routeId} />
      <CustomerAnalyticsSection customer={customer} />
      <CustomerCreditsSection customerId={customerMongoId} customer={customer} />

      {/* ✅ NEW: Banking / UPI Refund Details */}
      <Card>
        <CardHeader
          icon={<IndianRupee className="h-5 w-5 text-gray-900" />}
          title="Refund Payout Details"
          subtitle="Save customer UPI ID or bank account details to process refunds faster."
          right={
            <button
              onClick={savePayout}
              disabled={payoutSaving || (!hasBank && !hasUpi)}
              className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-4 py-2 text-sm
                         hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {payoutSaving ? "Saving..." : "Save"}
            </button>
          }
        />

        <div className="p-6 space-y-6">
          {/* soft note */}
          <div className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-100">
              <ShieldCheck className="h-5 w-5 text-gray-800" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Optional & Secure</div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                Customer can add <span className="font-medium">UPI</span> or{" "}
                <span className="font-medium">Bank</span> details (either one). You can also save both.
              </div>
            </div>
          </div>

          {/* UPI */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">UPI Details</div>
                  <div className="text-xs text-gray-500">Example: name@paytm</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 p-4">
                <Field
                  label="UPI ID"
                  value={upiId}
                  onChange={setUpiId}
                  placeholder="example@upi"
                />
              </div>
            </div>

            {/* Bank */}
            <div className="md:col-span-7">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                  <Building2 className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Bank Account Details</div>
                  <div className="text-xs text-gray-500">For NEFT/IMPS refunds</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    label="Account Holder Name"
                    value={accountHolderName}
                    onChange={setAccountHolderName}
                    placeholder="Full name"
                  />
                  <Field
                    label="Account Number"
                    value={accountNumber}
                    onChange={setAccountNumber}
                    placeholder="1234567890"
                  />
                  <Field
                    label="IFSC Code"
                    value={ifscCode}
                    onChange={(v) => setIfscCode(v.toUpperCase())}
                    placeholder="HDFC0001234"
                  />
                </div>

                <div className="mt-3 text-[11px] text-gray-500">
                  Tip: You can save <span className="font-medium">only UPI</span> or{" "}
                  <span className="font-medium">only bank</span> — both are optional.
                </div>
              </div>
            </div>
          </div>

          {/* error */}
          {payoutError ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
              {payoutError}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Existing sections */}
      <CustomerCartAddsSection customerId={customerMongoId} />
      <WishlistSection firebaseUID={customerUID} customerId={customerMongoId} />
      <AddressSection
        key={`${customerMongoId}-${customerUID}`}
        firebaseUID={customerUID}
        customerId={customerMongoId}
      />
      <OrderSection customerId={customerMongoId} />
      <SupportTicketSection customerEmail={customerEmail} />
    </div>
  );
}