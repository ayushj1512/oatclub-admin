// ✅ app/customers/bankingDetails/page.jsx — WHOLE FILE (short, clean)
// ✅ No max-width (full width)
// ✅ Auto-detect EMAIL vs PHONE (strict email regex)
// ✅ If user pastes UPI in search -> show helpful message
// Uses ONLY:
// 1) GET   /api/customers/exists?email=... OR ?phone=...
// 2) GET   /api/customers/:id
// 3) PATCH /api/customers/:id/payout-details

"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Save,
  RefreshCcw,
  Mail,
  Phone,
  User2,
  ShieldCheck,
  CreditCard,
  Building2,
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const safe = (v) => String(v ?? "").trim();

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(safe(v));
const toPhoneDigits = (v) => safe(v).replace(/[^\d]/g, "");
const looksLikeUpi = (v) => {
  const s = safe(v).toLowerCase();
  return /^[a-z0-9._-]{2,}@[a-z0-9]{2,}$/i.test(s) && !isEmail(s);
};

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl bg-white border border-gray-100 shadow-[0_12px_35px_rgba(0,0,0,0.06)] ${className}`}
  >
    {children}
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  right,
  disabled,
  inputMode,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-medium text-gray-600">{label}</label>
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="h-11 w-full rounded-xl bg-white border border-gray-200 px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 disabled:bg-gray-50 disabled:text-gray-500"
      />
      {right ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      ) : null}
    </div>
  </div>
);

const Banner = ({ type = "info", children }) => {
  const styles =
    type === "error"
      ? "bg-red-50 border-red-100 text-red-700"
      : type === "success"
      ? "bg-emerald-50 border-emerald-100 text-emerald-800"
      : type === "warn"
      ? "bg-amber-50 border-amber-100 text-amber-800"
      : "bg-gray-50 border-gray-100 text-gray-700";
  return (
    <div className={`rounded-2xl border p-4 text-sm ${styles}`}>{children}</div>
  );
};

const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-[11px]">
    {children}
  </span>
);

export default function BankingDetailsPage() {
  const [q, setQ] = useState("");
  const [finding, setFinding] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warn, setWarn] = useState("");

  const [customer, setCustomer] = useState(null);

  // payout fields
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const queryType = useMemo(() => {
    const s = safe(q);
    if (!s) return null;
    if (isEmail(s)) return "email";
    const digits = toPhoneDigits(s);
    if (digits.length >= 8) return "phone";
    if (looksLikeUpi(s)) return "upi";
    return null;
  }, [q]);

  const canSearch = queryType === "email" || queryType === "phone";

  const hasUpi = !!safe(upiId);
  const hasAnyBank =
    !!safe(accountHolderName) || !!safe(accountNumber) || !!safe(ifscCode);
  const bankComplete =
    !!safe(accountHolderName) && !!safe(accountNumber) && !!safe(ifscCode);

  const canSave = useMemo(() => {
    if (!customer?._id) return false;
    if (!hasUpi && !hasAnyBank) return false;
    if (hasAnyBank && !bankComplete) return false;
    return true;
  }, [customer?._id, hasUpi, hasAnyBank, bankComplete]);

  const resetPayoutInputs = () => {
    setUpiId("");
    setAccountHolderName("");
    setAccountNumber("");
    setIfscCode("");
  };

  const hydrateFromCustomer = (c) => {
    const payout = c?.payoutDetails || {};
    setUpiId(safe(payout?.upi?.upiId));
    setAccountHolderName(safe(payout?.bank?.accountHolderName));
    setAccountNumber(safe(payout?.bank?.accountNumber));
    setIfscCode(safe(payout?.bank?.ifscCode));
  };

  const fetchCustomerById = async (id) => {
    setLoadingCustomer(true);
    try {
      const res = await fetch(`${API}/api/customers/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load customer");
      setCustomer(data);
      hydrateFromCustomer(data);
      return data;
    } finally {
      setLoadingCustomer(false);
    }
  };

  const findCustomer = async () => {
    if (!API) return setError("NEXT_PUBLIC_API_URL missing");

    setError("");
    setWarn("");
    setSuccess("");
    setCustomer(null);
    resetPayoutInputs();

    if (queryType === "upi") {
      setWarn(
        "You entered a UPI ID in search. Search works only with customer Email or Phone."
      );
      return;
    }
    if (!canSearch) {
      setError("Enter a valid customer Email or Phone to search.");
      return;
    }

    setFinding(true);
    try {
      const url = new URL(`${API}/api/customers/exists`);
      if (queryType === "email")
        url.searchParams.set("email", safe(q).toLowerCase());
      else url.searchParams.set("phone", safe(q));

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Search failed");

      if (!data?.exists || !data?.customer?._id) {
        setError("Customer not found");
        return;
      }

      await fetchCustomerById(data.customer._id);
      setSuccess("Customer found. Add / update payout details below.");
    } catch (e) {
      setError(e?.message || "Failed to find customer");
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    if (!API) return setError("NEXT_PUBLIC_API_URL missing");
    if (!customer?._id || !canSave) return;

    setSaving(true);
    setError("");
    setWarn("");
    setSuccess("");

    try {
      const payload = {};
      if (hasUpi) payload.upi = { upiId: safe(upiId).toLowerCase() };
      if (hasAnyBank) {
        payload.bank = {
          accountHolderName: safe(accountHolderName),
          accountNumber: safe(accountNumber),
          ifscCode: safe(ifscCode).toUpperCase(),
        };
      }

      const res = await fetch(
        `${API}/api/customers/${customer._id}/payout-details`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "Failed to save payout details");

      if (data?.customer?._id) {
        setCustomer(data.customer);
        hydrateFromCustomer(data.customer);
      } else {
        await fetchCustomerById(customer._id);
      }

      setSuccess("Saved successfully.");
    } catch (e) {
      setError(e?.message || "Failed to save payout details");
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    if (!customer?._id) return;
    setError("");
    setWarn("");
    setSuccess("");
    try {
      await fetchCustomerById(customer._id);
      setSuccess("Refreshed.");
    } catch (e) {
      setError(e?.message || "Failed to refresh");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 md:p-10">
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-semibold text-gray-900">
            Add Banking / UPI Details
          </div>
          <div className="text-sm text-gray-600">
            Paste <span className="font-medium">customer email</span> or{" "}
            <span className="font-medium">phone</span> to search. (UPI IDs are
            for the payout field, not search.)
          </div>
        </div>

        <Card>
          <div className="p-6 md:p-7 space-y-5">
            <Banner>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-100">
                  <ShieldCheck className="h-5 w-5 text-gray-800" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Optional payout details
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Save either <b>UPI</b> or <b>Bank</b> details — or both. (If
                    you fill any bank field, fill all 3.)
                  </div>
                </div>
              </div>
            </Banner>

            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <Field
                  label="Customer Email / Phone"
                  value={q}
                  onChange={setQ}
                  placeholder="e.g. aman.sharma@example.com or 9876543210"
                  inputMode={queryType === "phone" ? "numeric" : undefined}
                  right={
                    queryType === "email" ? (
                      <Mail className="h-4 w-4 text-gray-400" />
                    ) : queryType === "phone" ? (
                      <Phone className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Search className="h-4 w-4 text-gray-400" />
                    )
                  }
                  disabled={finding}
                />
                <div className="mt-2 text-[11px] text-gray-500">
                  Detected:{" "}
                  <span className="font-medium text-gray-800">
                    {queryType ? queryType.toUpperCase() : "—"}
                  </span>
                  {queryType === "upi" ? (
                    <span className="ml-2 text-amber-700">
                      (UPI is for payout field)
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="w-full md:w-auto">
                <button
                  type="button"
                  onClick={findCustomer}
                  disabled={finding}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white px-5 h-11 text-sm
                             hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="h-4 w-4" />
                  {finding ? "Searching..." : "Find Customer"}
                </button>
              </div>
            </div>

            {error ? <Banner type="error">{error}</Banner> : null}
            {warn ? <Banner type="warn">{warn}</Banner> : null}
            {success ? <Banner type="success">{success}</Banner> : null}
          </div>
        </Card>

        {customer?._id ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                      <User2 className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {safe(customer?.name) || "Customer"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Customer ID: {safe(customer?.customerId) || "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={refresh}
                    disabled={loadingCustomer}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 h-10 text-sm text-gray-900
                               hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {customer?.email ? <Pill>{safe(customer.email)}</Pill> : null}
                  {customer?.phone ? <Pill>{safe(customer.phone)}</Pill> : null}
                  
                </div>

                <div className="text-xs text-gray-500 leading-relaxed">
                  Last payout update:{" "}
                  <span className="text-gray-800 font-medium">
                    {customer?.payoutDetails?.updatedAt
                      ? new Date(
                          customer.payoutDetails.updatedAt
                        ).toLocaleString("en-IN")
                      : "—"}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-8">
              <div className="p-6 md:p-7 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Refund Payout Details
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Add <b>UPI</b> or <b>Bank</b> (or both) and save.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={save}
                    disabled={!canSave || saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-4 h-11 text-sm
                               hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                {/* UPI */}
                <div className="rounded-2xl bg-white border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                      <CreditCard className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        UPI
                      </div>
                      <div className="text-xs text-gray-500">
                        example: riya.verma@okhdfcbank
                      </div>
                    </div>
                  </div>

                  <Field
                    label="UPI ID"
                    value={upiId}
                    onChange={setUpiId}
                    placeholder="e.g. riya.verma@okhdfcbank"
                    disabled={saving}
                  />
                </div>

                {/* Bank */}
                <div className="rounded-2xl bg-white border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                      <Building2 className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Bank Account
                      </div>
                      <div className="text-xs text-gray-500">
                        for NEFT/IMPS refunds
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field
                      label="Account Holder Name"
                      value={accountHolderName}
                      onChange={setAccountHolderName}
                      placeholder="e.g. Aman Sharma"
                      disabled={saving}
                    />
                    <Field
                      label="Account Number"
                      value={accountNumber}
                      onChange={setAccountNumber}
                      placeholder="e.g. 123456789012"
                      inputMode="numeric"
                      disabled={saving}
                    />
                    <Field
                      label="IFSC Code"
                      value={ifscCode}
                      onChange={(v) => setIfscCode(v.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      disabled={saving}
                    />
                  </div>

                  {hasAnyBank && !bankComplete ? (
                    <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                      Bank details incomplete — fill all three fields to save
                      bank method.
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-gray-500">
                      Bank fields optional. If you start bank, complete all 3.
                    </div>
                  )}
                </div>

                {error ? <Banner type="error">{error}</Banner> : null}
                {warn ? <Banner type="warn">{warn}</Banner> : null}
                {success ? <Banner type="success">{success}</Banner> : null}
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}