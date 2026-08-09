// ✅ app/customers/[id]/page.jsx — WHOLE UPDATED FILE (with Banking/UPI refund section)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  IndianRupee,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import CustomerSection from "@/components/customer/CustomerSection";
import CustomerBlacklistSection from "@/components/customer/CustomerBlacklistSection";
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

const SelectField = ({ label, value, onChange, options = [] }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-medium text-gray-600">
      {label}
    </label>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900
                 focus:border-black/20 focus:outline-none focus:ring-2 focus:ring-black/10"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const saving = useCustomerStore((s) => s.saving);
  const error = useCustomerStore((s) => s.error);

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

  const [editingProfile, setEditingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "unknown",
    country: "India",
    state: "",
    city: "",
    profileImage: "",
    isActive: true,
  });

  const updateProfileField = (key, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

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

  useEffect(() => {
    if (!customer?._id) return;

    setProfileForm({
      name: safe(customer?.name),
      email: safe(customer?.email),
      phone: safe(customer?.phone),

      dateOfBirth: customer?.dateOfBirth
        ? new Date(customer.dateOfBirth).toISOString().slice(0, 10)
        : "",

      gender: customer?.gender || "unknown",
      country: safe(customer?.country) || "India",
      state: safe(customer?.state),
      city: safe(customer?.city),
      profileImage: safe(customer?.profileImage),
      isActive: customer?.isActive !== false,
    });
  }, [customer]);

  const saveProfile = async () => {
    if (!customerMongoId) return;

    const result = await updateCustomer(customerMongoId, {
      name: safe(profileForm.name),
      email: safe(profileForm.email).toLowerCase(),
      phone: safe(profileForm.phone),

      dateOfBirth: profileForm.dateOfBirth || null,
      gender: profileForm.gender || "unknown",

      country: safe(profileForm.country),
      state: safe(profileForm.state),
      city: safe(profileForm.city),

      profileImage: safe(profileForm.profileImage),
      isActive: Boolean(profileForm.isActive),
    });

    if (!result?.success) return;

    setEditingProfile(false);

    await fetchCustomerById(customerMongoId);
  };

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

      <Card>
        <CardHeader
          icon={<UserRound className="h-5 w-5 text-gray-900" />}
          title="Customer Profile"
          subtitle="View and manually update customer information."
          right={
            editingProfile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200
                       bg-white px-3 text-sm font-medium text-gray-700
                       hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-black
                       px-4 text-sm font-medium text-white
                       hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-black
                     px-4 text-sm font-medium text-white hover:bg-black/90"
              >
                <Pencil className="h-4 w-4" />
                Edit Customer
              </button>
            )
          }
        />

        <div className="p-6">
          {!editingProfile ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
              {[
                ["Name", customer?.name || "-"],
                ["Email", customer?.email || "-"],
                ["Phone", customer?.phone || "-"],
                ["Gender", customer?.gender || "-"],
                ["Date of Birth", customer?.dateOfBirth
                  ? new Date(customer.dateOfBirth).toLocaleDateString("en-IN")
                  : "-"
                ],
                ["Country", customer?.country || "-"],
                ["State", customer?.state || "-"],
                ["City", customer?.city || "-"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    {label}
                  </div>

                  <div className="mt-1 truncate text-sm font-medium text-gray-900">
                    {value}
                  </div>
                </div>
              ))}

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Status
                </div>

                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${customer?.isActive !== false
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                      }`}
                  >
                    {customer?.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Customer ID
                </div>

                <div className="mt-1 text-sm font-medium text-gray-900">
                  {customer?.customerId || "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field
                  label="Customer Name"
                  value={profileForm.name}
                  onChange={(value) => updateProfileField("name", value)}
                  placeholder="Customer name"
                />

                <Field
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(value) => updateProfileField("email", value)}
                  placeholder="customer@example.com"
                />

                <Field
                  label="Phone"
                  value={profileForm.phone}
                  onChange={(value) => updateProfileField("phone", value)}
                  placeholder="9876543210"
                />

                <Field
                  label="Date of Birth"
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(value) =>
                    updateProfileField("dateOfBirth", value)
                  }
                />

                <SelectField
                  label="Gender"
                  value={profileForm.gender}
                  onChange={(value) => updateProfileField("gender", value)}
                  options={[
                    { label: "Unknown", value: "unknown" },
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Non Binary", value: "non_binary" },
                    {
                      label: "Prefer Not To Say",
                      value: "prefer_not_to_say",
                    },
                  ]}
                />

                <SelectField
                  label="Account Status"
                  value={profileForm.isActive ? "active" : "inactive"}
                  onChange={(value) =>
                    updateProfileField("isActive", value === "active")
                  }
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ]}
                />

                <Field
                  label="Country"
                  value={profileForm.country}
                  onChange={(value) => updateProfileField("country", value)}
                  placeholder="India"
                />

                <Field
                  label="State"
                  value={profileForm.state}
                  onChange={(value) => updateProfileField("state", value)}
                  placeholder="Delhi"
                />

                <Field
                  label="City"
                  value={profileForm.city}
                  onChange={(value) => updateProfileField("city", value)}
                  placeholder="New Delhi"
                />
              </div>

              <Field
                label="Profile Image URL"
                value={profileForm.profileImage}
                onChange={(value) =>
                  updateProfileField("profileImage", value)
                }
                placeholder="https://..."
              />

              {error ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>
      <CustomerBlacklistSection
        customer={customer}
        customerId={customerMongoId}
      />
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
