"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BadgeIndianRupee,
  ExternalLink,
  KeyRound,
  Loader2,
  Package,
  Pencil,
  Save,
  TicketPercent,
  Users,
  X,
} from "lucide-react";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  PrimaryButton,
  SectionCard,
  StatCard,
  StatusBadge,
  TableLoader,
  formatCurrency,
  formatDate,
} from "@/components/affiliate/AffiliateUI";

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-black";

const emptyForm = (a = {}) => ({
  name: a.name || "",
  username: a.username || "",
  email: a.email || "",
  phone: a.phone || "",
  state: a.state || "",
  platform: a.platform || "instagram",
  status: a.status || "active",
  notes: a.notes || "",

  coupon: {
    code: a.coupon?.code || "",
    discountType: a.coupon?.discountType || "percentage",
    discountValue: a.coupon?.discountValue || 0,
    minPurchase: a.coupon?.minPurchase || 0,
    maxDiscount: a.coupon?.maxDiscount || 0,
  },

  commission: {
    type: a.commission?.type || "flat",
    value: a.commission?.value || 100,
    calculationBase:
      a.commission?.calculationBase || "final_payable",
    approvalTrigger:
      a.commission?.approvalTrigger || "delivered",
    holdDays: a.commission?.holdDays || 7,
  },

  payoutAccount: {
    method: a.payoutAccount?.method || "upi",
    upiId: a.payoutAccount?.upiId || "",
    accountHolderName:
      a.payoutAccount?.accountHolderName || "",
    bankName: a.payoutAccount?.bankName || "",
    accountNumber: "",
    ifscCode: a.payoutAccount?.ifscCode || "",
  },
});

export default function AffiliateDetailPage() {
  const { id } = useParams();

  const {
    affiliate,
    dashboard,
    orders,

    detailLoading,
    dashboardLoading,
    ordersLoading,
    mutationLoading,

    error,
    message,

    fetchAffiliateById,
    fetchAffiliateDashboard,
    fetchAffiliateOrders,
    updateAffiliate,
    updateAffiliateStatus,
    changeAffiliatePassword,
    clearFeedback,
  } = useAdminAffiliateStore();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [newPassword, setNewPassword] = useState("");

  const loadData = async () => {
    await Promise.all([
      fetchAffiliateById(id),
      fetchAffiliateDashboard(id),
      fetchAffiliateOrders(id, { page: 1, limit: 10 }),
    ]);
  };

  useEffect(() => {
    if (id) loadData().catch(() => {});
  }, [id]);

  useEffect(() => {
    if (affiliate) setForm(emptyForm(affiliate));
  }, [affiliate]);

  const updateField = (path, value) => {
    setForm((current) => {
      const next = structuredClone(current);
      const keys = path.split(".");
      let target = next;

      keys.slice(0, -1).forEach((key) => {
        target = target[key];
      });

      target[keys.at(-1)] = value;
      return next;
    });
  };

  const saveChanges = async (event) => {
    event.preventDefault();
    clearFeedback();

    try {
      const payload = {
        ...form,

        username: form.username.trim().toLowerCase(),

        coupon: {
          ...form.coupon,
          code: form.coupon.code.trim().toUpperCase(),
          discountValue: Number(form.coupon.discountValue || 0),
          minPurchase: Number(form.coupon.minPurchase || 0),
          maxDiscount: Number(form.coupon.maxDiscount || 0),
        },

        commission: {
          ...form.commission,
          value: Number(form.commission.value || 0),
          holdDays: Number(form.commission.holdDays || 0),
        },

        payoutAccount: {
          ...form.payoutAccount,
          ifscCode: form.payoutAccount.ifscCode
            .trim()
            .toUpperCase(),
        },
      };

      if (!payload.payoutAccount.accountNumber) {
        delete payload.payoutAccount.accountNumber;
      }

      await updateAffiliate(id, payload);

      if (newPassword.trim()) {
        await changeAffiliatePassword(id, newPassword.trim());
      }

      await loadData();

      setEditing(false);
      setNewPassword("");
    } catch {}
  };

  const toggleStatus = async () => {
    const status =
      affiliate.status === "active" ? "paused" : "active";

    await updateAffiliateStatus(id, { status });
    await loadData();
  };

  if (detailLoading && !affiliate) {
    return <TableLoader />;
  }

  if (!affiliate) {
    return <EmptyState title="Affiliate not found" />;
  }

  const stats = dashboard?.stats || affiliate.stats || {};

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <AffiliatePageHeader
          title={affiliate.name}
          description={`${affiliate.affiliateNumber} · @${affiliate.username}`}
          backHref="/affiliate/all"
          actions={
            <>
              {editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setForm(emptyForm(affiliate));
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold uppercase"
                >
                  <X size={14} />
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleStatus}
                    className="h-11 rounded-xl border border-neutral-200 px-4 text-xs font-semibold uppercase"
                  >
                    {affiliate.status === "active"
                      ? "Pause Affiliate"
                      : "Activate Affiliate"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold uppercase"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <PrimaryButton
                    href={`/affiliate/orders?affiliate=${id}`}
                  >
                    <ExternalLink size={14} />
                    View Orders
                  </PrimaryButton>
                </>
              )}
            </>
          }
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {editing ? (
          <form onSubmit={saveChanges} className="space-y-6">
            <SectionCard title="Affiliate Details">
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Name">
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                  />
                </Field>

                <Field label="Username">
                  <input
                    required
                    className={inputClass}
                    value={form.username}
                    onChange={(e) =>
                      updateField("username", e.target.value)
                    }
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) =>
                      updateField("email", e.target.value)
                    }
                  />
                </Field>

                <Field label="Phone">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) =>
                      updateField("phone", e.target.value)
                    }
                  />
                </Field>

                <Field label="State">
                  <input
                    className={inputClass}
                    value={form.state}
                    onChange={(e) =>
                      updateField("state", e.target.value)
                    }
                  />
                </Field>

                <Field label="Platform">
                  <select
                    className={inputClass}
                    value={form.platform}
                    onChange={(e) =>
                      updateField("platform", e.target.value)
                    }
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="snapchat">Snapchat</option>
                    <option value="website">Website</option>
                    <option value="other">Other</option>
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="paused">Paused</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </Field>

                <Field label="New Password">
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />

                    <input
                      type="password"
                      minLength={6}
                      className={`${inputClass} pl-9`}
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Leave blank"
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Coupon">
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Coupon Code">
                    <input
                      className={inputClass}
                      value={form.coupon.code}
                      onChange={(e) =>
                        updateField(
                          "coupon.code",
                          e.target.value.toUpperCase()
                        )
                      }
                    />
                  </Field>

                  <Field label="Discount Type">
                    <select
                      className={inputClass}
                      value={form.coupon.discountType}
                      onChange={(e) =>
                        updateField(
                          "coupon.discountType",
                          e.target.value
                        )
                      }
                    >
                      <option value="percentage">Percentage</option>
                      <option value="flat">Flat</option>
                    </select>
                  </Field>

                  <Field label="Discount Value">
                    <input
                      type="number"
                      className={inputClass}
                      value={form.coupon.discountValue}
                      onChange={(e) =>
                        updateField(
                          "coupon.discountValue",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Minimum Purchase">
                    <input
                      type="number"
                      className={inputClass}
                      value={form.coupon.minPurchase}
                      onChange={(e) =>
                        updateField(
                          "coupon.minPurchase",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Maximum Discount">
                    <input
                      type="number"
                      className={inputClass}
                      value={form.coupon.maxDiscount}
                      onChange={(e) =>
                        updateField(
                          "coupon.maxDiscount",
                          e.target.value
                        )
                      }
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Commission">
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      className={inputClass}
                      value={form.commission.type}
                      onChange={(e) =>
                        updateField(
                          "commission.type",
                          e.target.value
                        )
                      }
                    >
                      <option value="flat">Flat</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </Field>

                  <Field label="Value">
                    <input
                      type="number"
                      className={inputClass}
                      value={form.commission.value}
                      onChange={(e) =>
                        updateField(
                          "commission.value",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Approval Trigger">
                    <select
                      className={inputClass}
                      value={form.commission.approvalTrigger}
                      onChange={(e) =>
                        updateField(
                          "commission.approvalTrigger",
                          e.target.value
                        )
                      }
                    >
                      <option value="paid">Paid</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </Field>

                  <Field label="Hold Days">
                    <input
                      type="number"
                      className={inputClass}
                      value={form.commission.holdDays}
                      onChange={(e) =>
                        updateField(
                          "commission.holdDays",
                          e.target.value
                        )
                      }
                    />
                  </Field>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Payout Account">
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Method">
                  <select
                    className={inputClass}
                    value={form.payoutAccount.method}
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.method",
                        e.target.value
                      )
                    }
                  >
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>

                <Field label="UPI ID">
                  <input
                    className={inputClass}
                    value={form.payoutAccount.upiId}
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.upiId",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field label="Account Holder">
                  <input
                    className={inputClass}
                    value={
                      form.payoutAccount.accountHolderName
                    }
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.accountHolderName",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field label="Bank Name">
                  <input
                    className={inputClass}
                    value={form.payoutAccount.bankName}
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.bankName",
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field label="New Account Number">
                  <input
                    className={inputClass}
                    value={form.payoutAccount.accountNumber}
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.accountNumber",
                        e.target.value
                      )
                    }
                    placeholder="Leave blank to keep existing"
                  />
                </Field>

                <Field label="IFSC">
                  <input
                    className={inputClass}
                    value={form.payoutAccount.ifscCode}
                    onChange={(e) =>
                      updateField(
                        "payoutAccount.ifscCode",
                        e.target.value.toUpperCase()
                      )
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={mutationLoading}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-black px-6 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50"
              >
                {mutationLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total Orders"
                value={stats.totalOrders || 0}
                icon={Package}
                loading={dashboardLoading}
              />

              <StatCard
                label="Revenue"
                value={formatCurrency(stats.totalRevenue)}
                icon={BadgeIndianRupee}
                loading={dashboardLoading}
              />

              <StatCard
                label="Pending Commission"
                value={formatCurrency(stats.pendingCommission)}
                icon={TicketPercent}
                loading={dashboardLoading}
              />

              <StatCard
                label="Approved Commission"
                value={formatCurrency(stats.approvedCommission)}
                icon={TicketPercent}
                loading={dashboardLoading}
              />

              <StatCard
                label="Paid Commission"
                value={formatCurrency(stats.paidCommission)}
                icon={Users}
                loading={dashboardLoading}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <SectionCard title="Affiliate Profile">
                <dl className="divide-y divide-neutral-100 p-5">
                  <Info label="Status">
                    <StatusBadge status={affiliate.status} />
                  </Info>
                  <Info label="Platform">
                    {affiliate.platform}
                  </Info>
                  <Info label="Email">
                    {affiliate.email || "—"}
                  </Info>
                  <Info label="Phone">
                    {affiliate.phone || "—"}
                  </Info>
                  <Info label="State">
                    {affiliate.state || "—"}
                  </Info>
                  <Info label="Created">
                    {formatDate(affiliate.createdAt)}
                  </Info>
                </dl>
              </SectionCard>

              <SectionCard title="Coupon">
                <dl className="divide-y divide-neutral-100 p-5">
                  <Info label="Code">
                    {affiliate.coupon?.code || "—"}
                  </Info>
                  <Info label="Discount">
                    {affiliate.coupon?.discountValue || 0}
                    {affiliate.coupon?.discountType ===
                    "percentage"
                      ? "%"
                      : " flat"}
                  </Info>
                  <Info label="Minimum Purchase">
                    {formatCurrency(
                      affiliate.coupon?.minPurchase
                    )}
                  </Info>
                  <Info label="Maximum Discount">
                    {formatCurrency(
                      affiliate.coupon?.maxDiscount
                    )}
                  </Info>
                </dl>
              </SectionCard>

              <SectionCard title="Commission & Payout">
                <dl className="divide-y divide-neutral-100 p-5">
                  <Info label="Commission">
                    {affiliate.commission?.type === "flat"
                      ? formatCurrency(
                          affiliate.commission?.value
                        )
                      : `${affiliate.commission?.value || 0}%`}
                  </Info>
                  <Info label="Approval">
                    {affiliate.commission?.approvalTrigger}
                  </Info>
                  <Info label="Hold Period">
                    {affiliate.commission?.holdDays || 0} days
                  </Info>
                  <Info label="Pending Payout">
                    {formatCurrency(
                      affiliate.payoutSummary?.pendingPayout
                    )}
                  </Info>
                  <Info label="Total Paid">
                    {formatCurrency(
                      affiliate.payoutSummary?.totalPaid
                    )}
                  </Info>
                </dl>
              </SectionCard>
            </div>

            <SectionCard title="Recent Affiliate Orders">
              {ordersLoading ? (
                <TableLoader />
              ) : orders.length === 0 ? (
                <EmptyState title="No affiliate orders found" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full">
                    <thead className="bg-neutral-50 text-left text-xs">
                      <tr>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Customer</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Commission</th>
                        <th className="px-5 py-3">Payment</th>
                        <th className="px-5 py-3">Fulfillment</th>
                        <th className="px-5 py-3">Created</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td className="px-5 py-4 font-semibold">
                            {order.orderNumber}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {order.shippingAddressSnapshot
                              ?.fullName || "Customer"}
                          </td>

                          <td className="px-5 py-4">
                            {formatCurrency(order.finalPayable)}
                          </td>

                          <td className="px-5 py-4">
                            {formatCurrency(
                              order.affiliateEvaluation?.amount
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={order.paymentStatus}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={order.fulfillmentStatus}
                            />
                          </td>

                          <td className="px-5 py-4 text-xs text-neutral-500">
                            {formatDate(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-right text-sm text-black">
        {children}
      </dd>
    </div>
  );
}