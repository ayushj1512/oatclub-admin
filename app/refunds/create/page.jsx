"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileImage,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import axios from "axios";

import MediaPickerModal from "@/components/media/MediaPickerModal";

const API =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const REFUND_API = `${API}/api/order-refunds`;

const refundMethods = {
  razorpay: ["razorpay_source"],
  cod: ["upi", "bank_transfer", "cash", "store_credit", "other"],
  exchange: ["store_credit", "other"],
};

const nice = (v) => String(v || "").replaceAll("_", " ");

export default function CreateRefundPage() {
  const router = useRouter();

  const [orderSearch, setOrderSearch] = useState("");
  const [order, setOrder] = useState(null);

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [mediaOpen, setMediaOpen] = useState(false);
  const [proofs, setProofs] = useState([]);

  const [form, setForm] = useState({
    amount: "",
    refundMode: "manual",
    refundMethod: "upi",
    refundType: "full",
    reason: "",
    adminNote: "",

    upiId: "",
    accountHolderName: "",
    bankName: "",
    accountNumberLast4: "",
    ifsc: "",
  });

  const availableMethods = useMemo(() => {
    return refundMethods[order?.paymentMethod] || refundMethods.cod;
  }, [order?.paymentMethod]);

  const isRazorpayOrder = order?.paymentMethod === "razorpay";

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const searchOrder = async () => {
    if (!orderSearch.trim()) return;

    try {
      setLoadingOrder(true);
      setError("");

      const { data } = await axios.get(
        `${API}/api/orders/admin/search?search=${encodeURIComponent(
          orderSearch.trim()
        )}`,
        { withCredentials: true }
      );

      const found = data?.order || data?.data?.[0] || data?.orders?.[0];

      if (!found) {
        setOrder(null);
        setError("Order not found");
        return;
      }

      const razorpay = found.paymentMethod === "razorpay";

      setOrder(found);
      setForm((prev) => ({
        ...prev,
        amount:
          found?.refundSummary?.pendingAmount ||
          found?.refundSummary?.eligibleAmount ||
          found?.finalPayable ||
          "",
        refundMode: razorpay ? "automatic" : "manual",
        refundMethod: razorpay ? "razorpay_source" : "upi",
        reason:
          prev.reason ||
          (razorpay
            ? "Paid order cancelled before shipment"
            : "Manual refund requested"),
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to search order");
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleMediaSelect = (media) => {
    const list = Array.isArray(media) ? media : [media];

    setProofs((prev) => [
      ...prev,
      ...list
        .filter((m) => m?.url)
        .map((m) => ({
          type: "screenshot",
          url: m.url,
          publicId: m.publicId || "",
          note: "Refund proof",
        })),
    ]);

    setMediaOpen(false);
  };

  const removeProof = (index) => {
    setProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const attachProofs = async (refundId) => {
    if (!refundId || !proofs.length) return;

    await Promise.all(
      proofs.map((proof) =>
        axios.post(`${REFUND_API}/${refundId}/proofs`, proof, {
          withCredentials: true,
        })
      )
    );
  };

  const createRefund = async () => {
    if (!order?._id) {
      setError("Please select an order first");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Refund amount must be greater than 0");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const commonPayload = {
        amount: Number(form.amount),
        reason: form.reason,
      };

      let data;

      if (isRazorpayOrder) {
        const response = await axios.post(
          `${REFUND_API}/razorpay/order/${order._id}/create`,
          commonPayload,
          { withCredentials: true }
        );

        data = response.data;
      } else {
        const response = await axios.post(
          `${REFUND_API}/manual/order/${order._id}/create`,
          {
            ...commonPayload,
            refundMethod: form.refundMethod,
            adminNote: form.adminNote,
            customerRefundDetails: {
              upiId: form.upiId,
              accountHolderName: form.accountHolderName,
              bankName: form.bankName,
              accountNumberLast4: form.accountNumberLast4,
              ifsc: form.ifsc,
            },
          },
          { withCredentials: true }
        );

        data = response.data;
      }

      const refundId = data?.refund?._id || data?.refund?.id;

      if (refundId && proofs.length) {
        await attachProofs(refundId);
      }

      router.push(refundId ? `/refunds/${refundId}` : "/refunds/list");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create refund");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => router.push("/refunds/list")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"
        >
          <ArrowLeft size={16} />
          Back to refunds
        </button>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Refund Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            Create refund
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create Razorpay automatic or COD/manual refund request.
          </p>
        </div>
      </section>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
          <ShieldAlert size={17} />
          {error}
        </div>
      )}

      <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-base font-semibold text-gray-950">
          Find order
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchOrder()}
              placeholder="Search by order number / phone / email"
              className="h-11 w-full rounded-2xl bg-gray-50 pl-9 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
            />
          </div>

          <button
            onClick={searchOrder}
            disabled={loadingOrder}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingOrder ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Search
          </button>
        </div>

        {order && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100 md:grid-cols-4">
            <Info label="Order" value={order.orderNumber} />
            <Info label="Payment" value={nice(order.paymentMethod)} />
            <Info label="Status" value={nice(order.paymentStatus)} />
            <Info label="Payable" value={`₹${Number(order.finalPayable || 0)}`} />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Refund details
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Amount">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                className="input"
                placeholder="Refund amount"
              />
            </Field>

            <Field label="Refund Type">
              <select
                value={form.refundType}
                onChange={(e) => update("refundType", e.target.value)}
                className="input"
                disabled
              >
                <option value="full">Full</option>
                <option value="partial">Partial</option>
              </select>
            </Field>

            <Field label="Refund Mode">
              <select value={form.refundMode} className="input" disabled>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>

            <Field label="Refund Method">
              <select
                value={form.refundMethod}
                onChange={(e) => update("refundMethod", e.target.value)}
                className="input"
                disabled={isRazorpayOrder}
              >
                {availableMethods.map((m) => (
                  <option key={m} value={m}>
                    {nice(m)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Reason">
                <input
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                  className="input"
                  placeholder="Refund reason"
                />
              </Field>
            </div>

            {!isRazorpayOrder && (
              <div className="md:col-span-2">
                <Field label="Admin Note">
                  <textarea
                    value={form.adminNote}
                    onChange={(e) => update("adminNote", e.target.value)}
                    rows={4}
                    className="input min-h-[110px] resize-none py-3"
                    placeholder="Internal note"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-base font-semibold text-gray-950">
            Proof / media
          </h2>

          <button
            onClick={() => setMediaOpen(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-medium text-white"
          >
            <FileImage size={16} />
            Select Proof from Media
          </button>

          {!proofs.length ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No proof selected.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {proofs.map((proof, index) => (
                <div
                  key={`${proof.url}-${index}`}
                  className="relative overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100"
                >
                  <button
                    onClick={() => removeProof(index)}
                    className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-700 shadow"
                  >
                    <X size={14} />
                  </button>
                  <img
                    src={proof.url}
                    alt="Refund proof"
                    className="h-32 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {!isRazorpayOrder && form.refundMethod === "upi" && (
        <ManualBox title="UPI Details">
          <Field label="UPI ID">
            <input
              value={form.upiId}
              onChange={(e) => update("upiId", e.target.value)}
              className="input"
              placeholder="customer@upi"
            />
          </Field>
        </ManualBox>
      )}

      {!isRazorpayOrder && form.refundMethod === "bank_transfer" && (
        <ManualBox title="Bank Details">
          <Field label="Account Holder Name">
            <input
              value={form.accountHolderName}
              onChange={(e) => update("accountHolderName", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Bank Name">
            <input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Account Last 4 Digits">
            <input
              value={form.accountNumberLast4}
              onChange={(e) => update("accountNumberLast4", e.target.value)}
              className="input"
              maxLength={4}
            />
          </Field>

          <Field label="IFSC">
            <input
              value={form.ifsc}
              onChange={(e) => update("ifsc", e.target.value.toUpperCase())}
              className="input"
            />
          </Field>
        </ManualBox>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={() => router.push("/refunds/list")}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-200"
        >
          Cancel
        </button>

        <button
          onClick={createRefund}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {creating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Create Refund
        </button>
      </div>

      <p className="mt-8 text-center text-xs font-medium text-gray-400">
        Powered by Razorpay
      </p>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        multiple
        folder="miray/refunds"
        onSelect={handleMediaSelect}
      />

      <style jsx>{`
        .input {
          height: 44px;
          width: 100%;
          border-radius: 16px;
          background: #f9fafb;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
          box-shadow: inset 0 0 0 1px #f3f4f6;
        }
        .input:focus {
          background: white;
          box-shadow: inset 0 0 0 1px #d1d5db;
        }
        .input:disabled {
          cursor: not-allowed;
          color: #6b7280;
          background: #f3f4f6;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value || "—"}</p>
    </div>
  );
}

function ManualBox({ title, children }) {
  return (
    <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-4 text-base font-semibold text-gray-950">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}