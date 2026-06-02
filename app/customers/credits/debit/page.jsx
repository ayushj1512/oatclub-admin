"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MinusCircle,
  Search,
  User2,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCustomerStore } from "@/store/customerStore";

const DEBIT_TYPES = [
  { value: "manual_debit", label: "Manual Debit" },
  { value: "order_usage", label: "Order Usage" },
  { value: "order_adjustment", label: "Order Adjustment" },
  { value: "expired", label: "Expired Credit" },
  { value: "other", label: "Other" },
];

export default function DebitCustomerCreditPage() {
  const { fetchCustomers, debitCustomerCredit, loadingList, creditSaving } =
    useCustomerStore();

  const [search, setSearch] = useState("");
  const [matchedCustomers, setMatchedCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [form, setForm] = useState({
    amount: "",
    type: "manual_debit",
    reason: "",
    notes: "",
    orderNumber: "",
  });

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSearchCustomer = async () => {
    if (!search.trim()) {
      return toast.error("Enter phone, email, or customer ID");
    }

    setSelectedCustomer(null);
    setMatchedCustomers([]);

    const res = await fetchCustomers({
      search: search.trim(),
      page: 1,
      limit: 10,
    });

    const items = res?.items || [];

    if (!items.length) return toast.error("No customer found");

    setMatchedCustomers(items);
    toast.success(`${items.length} customer found`);
  };

  const resetForm = () => {
    setSearch("");
    setMatchedCustomers([]);
    setSelectedCustomer(null);

    setForm({
      amount: "",
      type: "manual_debit",
      reason: "",
      notes: "",
      orderNumber: "",
    });
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!selectedCustomer?._id) return toast.error("Please choose customer");

    if (!form.amount || Number(form.amount) <= 0) {
      return toast.error("Valid amount is required");
    }

    const balance = Number(selectedCustomer?.credits?.balance || 0);

    if (Number(form.amount) > balance) {
      return toast.error("Debit amount cannot exceed wallet balance");
    }

    if (!form.reason.trim()) return toast.error("Reason is required");

    const res = await debitCustomerCredit(selectedCustomer._id, {
      ...form,
      amount: Number(form.amount),
    });

    if (!res?.success) {
      return toast.error(res?.error || "Credit debit failed");
    }

    toast.success("Credit debited successfully");
    resetForm();
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 md:px-6">
      <div className="mb-6">
        <Link
          href="/customers/credits"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
        >
          <ArrowLeft size={16} />
          Back to Credits
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
          Debit Customer Credit
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Search customer, select the right record, then debit wallet balance.
        </p>
      </div>

      <section className="card mb-6 p-5">
        <h2 className="section-title">1. Find Customer</h2>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Phone / Email / Customer ID"
          />

          <button
            type="button"
            onClick={handleSearchCustomer}
            disabled={loadingList}
            className="btn-primary md:w-[160px]"
          >
            <Search size={16} />
            {loadingList ? "Searching..." : "Search"}
          </button>
        </div>

        {!!matchedCustomers.length && (
          <div className="mt-5 space-y-3">
            {matchedCustomers.map((customer) => {
              const active = selectedCustomer?._id === customer._id;

              return (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-light)]"
                      : "border-gray-200 bg-white hover:border-[var(--primary)]"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-[var(--primary)] shadow-sm">
                        <User2 size={18} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-950">
                            {customer.name || "Unknown Customer"}
                          </h3>

                          {active && (
                            <span className="badge-primary">
                              <CheckCircle2 size={13} />
                              Selected
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                          ID: {customer.customerId || customer._id}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {customer.email || "No email"} ·{" "}
                          {customer.phone || "No phone"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs text-gray-500">Wallet Balance</p>
                      <p className="font-semibold text-[var(--primary)]">
                        ₹{Number(customer?.credits?.balance || 0)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="section-title">2. Debit Details</h2>

        <div className="mt-4 rounded-2xl bg-[var(--primary-light)] p-4 text-sm text-gray-700">
          {selectedCustomer ? (
            <>
              Debiting credit from{" "}
              <b>{selectedCustomer.name || selectedCustomer.customerId}</b> ·{" "}
              Current balance:{" "}
              <b>₹{Number(selectedCustomer?.credits?.balance || 0)}</b>
            </>
          ) : (
            "Select a customer first."
          )}
        </div>

        <form onSubmit={submitHandler} className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Select
              label="Debit Type"
              value={form.type}
              onChange={(v) => updateField("type", v)}
              options={DEBIT_TYPES}
            />

            <Input
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(v) => updateField("amount", v)}
              placeholder="500"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Reason"
              value={form.reason}
              onChange={(v) => updateField("reason", v)}
              placeholder="Manual debit correction"
            />

            <Input
              label="Order Number"
              value={form.orderNumber}
              onChange={(v) => updateField("orderNumber", v)}
              placeholder="OATCLUB-000123"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              rows={5}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Internal notes..."
              className="input min-h-[120px] resize-none py-3"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={!selectedCustomer || creditSaving}
              className="btn-primary"
            >
              <MinusCircle size={16} />
              {creditSaving ? "Debiting..." : "Debit Credit"}
            </button>

            <button type="button" onClick={resetForm} className="btn-secondary">
              Reset
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}