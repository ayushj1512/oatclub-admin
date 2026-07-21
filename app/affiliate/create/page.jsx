"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
} from "lucide-react";

import {
  defaultAffiliateForm,
  useAdminAffiliateStore,
} from "@/store/adminAffiliateStore";

import {
  AffiliatePageHeader,
  PrimaryButton,
  SectionCard,
} from "@/components/affiliate/AffiliateUI";

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black";

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500";

export default function CreateAffiliatePage() {
  const router = useRouter();

  const {
    createAffiliate,
    mutationLoading,
    error,
  } = useAdminAffiliateStore();

  const [form, setForm] = useState(
    structuredClone(defaultAffiliateForm)
  );

  const update = (path, value) => {
    setForm((current) => {
      const next = structuredClone(current);
      const keys = path.split(".");
      let target = next;

      keys.slice(0, -1).forEach((key) => {
        target[key] = target[key] || {};
        target = target[key];
      });

      target[keys.at(-1)] = value;
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      const data = await createAffiliate(form);
      const id = data?.affiliate?._id;

      router.push(id ? `/affiliate/${id}` : "/affiliate/all");
    } catch {
      // Store handles error.
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <form
        onSubmit={submit}
        className="mx-auto max-w-[1400px] space-y-7"
      >
        <AffiliatePageHeader
          title="Create Affiliate"
          description="Create an influencer account, issue a coupon and configure commission and payout rules."
          backHref="/affiliate/all"
          actions={
            <PrimaryButton
              type="submit"
              disabled={mutationLoading}
            >
              {mutationLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save Affiliate
            </PrimaryButton>
          }
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <SectionCard
          title="Basic Information"
          description="Login and profile information for the influencer."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Full Name">
              <input
                required
                value={form.name}
                onChange={(event) =>
                  update("name", event.target.value)
                }
                className={inputClass}
                placeholder="Influencer name"
              />
            </Field>

            <Field label="Username">
              <input
                required
                value={form.username}
                onChange={(event) =>
                  update("username", event.target.value)
                }
                className={inputClass}
                placeholder="username"
              />
            </Field>

            <Field label="Temporary Password">
              <input
                required
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) =>
                  update("password", event.target.value)
                }
                className={inputClass}
                placeholder="Minimum 6 characters"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  update("email", event.target.value)
                }
                className={inputClass}
                placeholder="email@example.com"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(event) =>
                  update("phone", event.target.value)
                }
                className={inputClass}
                placeholder="9876543210"
              />
            </Field>

            <Field label="State">
              <input
                value={form.state}
                onChange={(event) =>
                  update("state", event.target.value)
                }
                className={inputClass}
                placeholder="Delhi"
              />
            </Field>

            <Field label="Platform">
              <select
                value={form.platform}
                onChange={(event) =>
                  update("platform", event.target.value)
                }
                className={inputClass}
              >
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
                <option value="snapchat">Snapchat</option>
                <option value="twitter">Twitter</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value)
                }
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Coupon Configuration"
          description="The customer-facing discount code attached to this affiliate."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Coupon Code">
              <input
                required
                value={form.coupon.code}
                onChange={(event) =>
                  update(
                    "coupon.code",
                    event.target.value.toUpperCase()
                  )
                }
                className={inputClass}
                placeholder="RIYA10"
              />
            </Field>

            <Field label="Discount Type">
              <select
                value={form.coupon.discountType}
                onChange={(event) =>
                  update(
                    "coupon.discountType",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat amount</option>
              </select>
            </Field>

            <Field label="Discount Value">
              <input
                type="number"
                min="0"
                value={form.coupon.discountValue}
                onChange={(event) =>
                  update(
                    "coupon.discountValue",
                    Number(event.target.value)
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Minimum Purchase">
              <input
                type="number"
                min="0"
                value={form.coupon.minPurchase}
                onChange={(event) =>
                  update(
                    "coupon.minPurchase",
                    Number(event.target.value)
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Maximum Discount">
              <input
                type="number"
                min="0"
                value={form.coupon.maxDiscount}
                onChange={(event) =>
                  update(
                    "coupon.maxDiscount",
                    Number(event.target.value)
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Valid Till">
              <input
                type="date"
                value={form.coupon.validTill}
                onChange={(event) =>
                  update("coupon.validTill", event.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Commission Rules"
          description="Defines how and when affiliate earnings become payable."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Commission Type">
              <select
                value={form.commission.type}
                onChange={(event) =>
                  update(
                    "commission.type",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat amount</option>
              </select>
            </Field>

            <Field label="Commission Value">
              <input
                type="number"
                min="0"
                value={form.commission.value}
                onChange={(event) =>
                  update(
                    "commission.value",
                    Number(event.target.value)
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Calculation Base">
              <select
                value={form.commission.calculationBase}
                onChange={(event) =>
                  update(
                    "commission.calculationBase",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="final_payable">
                  Final payable
                </option>
                <option value="subtotal">Subtotal</option>
              </select>
            </Field>

            <Field label="Approval Trigger">
              <select
                value={form.commission.approvalTrigger}
                onChange={(event) =>
                  update(
                    "commission.approvalTrigger",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="paid">Payment received</option>
                <option value="shipped">Order shipped</option>
                <option value="delivered">Order delivered</option>
              </select>
            </Field>

            <Field label="Hold Days">
              <input
                type="number"
                min="0"
                value={form.commission.holdDays}
                onChange={(event) =>
                  update(
                    "commission.holdDays",
                    Number(event.target.value)
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Payout Details"
          description="Saved account used by finance while recording payouts."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Payout Method">
              <select
                value={form.payoutAccount.method}
                onChange={(event) =>
                  update(
                    "payoutAccount.method",
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="upi">UPI</option>
                <option value="bank">Bank transfer</option>
                <option value="manual">Manual</option>
              </select>
            </Field>

            <Field label="UPI ID">
              <input
                value={form.payoutAccount.upiId}
                onChange={(event) =>
                  update(
                    "payoutAccount.upiId",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="name@upi"
              />
            </Field>

            <Field label="Account Holder">
              <input
                value={form.payoutAccount.accountHolderName}
                onChange={(event) =>
                  update(
                    "payoutAccount.accountHolderName",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Bank Name">
              <input
                value={form.payoutAccount.bankName}
                onChange={(event) =>
                  update(
                    "payoutAccount.bankName",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Account Number">
              <input
                value={form.payoutAccount.accountNumber}
                onChange={(event) =>
                  update(
                    "payoutAccount.accountNumber",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="IFSC Code">
              <input
                value={form.payoutAccount.ifscCode}
                onChange={(event) =>
                  update(
                    "payoutAccount.ifscCode",
                    event.target.value.toUpperCase()
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>
      </form>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}