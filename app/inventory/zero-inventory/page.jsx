"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Lock,
  Loader2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

const PASSCODE = "1170";

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
      {label}
    </p>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const Pill = ({ children, tone = "default" }) => {
  const styles =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
};

export default function ZeroInventoryPage() {
  const { zeroAllVariantStock, saving } = useAdminProductStore();

  const [passcode, setPasscode] = useState("");
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [passcodeError, setPasscodeError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const canValidate = useMemo(() => passcode.trim().length > 0, [passcode]);

  const canZeroInventory = useMemo(() => {
    return passcodeVerified && confirmText.trim().toUpperCase() === "ZERO";
  }, [passcodeVerified, confirmText]);

  const handleValidatePasscode = () => {
    const entered = String(passcode || "").trim();

    if (!entered) {
      setPasscodeVerified(false);
      setPasscodeError("Passcode is required.");
      return;
    }

    if (entered !== PASSCODE) {
      setPasscodeVerified(false);
      setPasscodeError("Invalid passcode.");
      return;
    }

    setPasscodeError("");
    setPasscodeVerified(true);
  };

  const handleZeroInventory = async () => {
    if (!passcodeVerified) {
      setPasscodeError("Please validate the passcode first.");
      return;
    }

    if (confirmText.trim().toUpperCase() !== "ZERO") return;

    try {
      const result = await zeroAllVariantStock();
      setLastResult(result || null);
      setConfirmText("");
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasscodeChange = (e) => {
    setPasscode(e.target.value);
    if (passcodeVerified) setPasscodeVerified(false);
    if (passcodeError) setPasscodeError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Pill tone="danger">Restricted Action</Pill>
              <Pill>Inventory Control</Pill>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Zero Variant Inventory
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Use this page to set all variant inventory stock to zero across variable
              products. This is a protected action and requires passcode validation
              before execution.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <StatCard label="Passcode" value={passcodeVerified ? "Verified" : "Pending"} />
            <StatCard
              label="Confirmation"
              value={confirmText.trim().toUpperCase() === "ZERO" ? "Ready" : "Pending"}
            />
            <StatCard label="Execution" value={saving ? "Running" : "Idle"} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    High Risk Inventory Operation
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    This action will update all variable products and mark their variant
                    stock as zero. Please proceed only after verification.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill tone="danger">All variants → stock 0</Pill>
                    <Pill>Variable products only</Pill>
                    <Pill>Passcode protected</Pill>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 px-6 py-6">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-700" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                    Step 1 · Validate Passcode
                  </h3>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    type="password"
                    value={passcode}
                    onChange={handlePasscodeChange}
                    placeholder="Enter passcode"
                    className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />

                  <button
                    type="button"
                    onClick={handleValidatePasscode}
                    disabled={!canValidate || saving}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Validate Passcode
                  </button>
                </div>

                {passcodeError ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                    <ShieldAlert className="h-4 w-4" />
                    {passcodeError}
                  </div>
                ) : null}

                {passcodeVerified ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    <ShieldCheck className="h-4 w-4" />
                    Passcode validated successfully
                  </div>
                ) : null}
              </section>

              <section className={!passcodeVerified ? "opacity-60" : ""}>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                    Step 2 · Confirmation
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Type <span className="font-semibold text-gray-900">ZERO</span> to enable
                    the final action.
                  </p>
                </div>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "ZERO" to confirm'
                  disabled={!passcodeVerified || saving}
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm uppercase text-gray-900 outline-none transition focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                {passcodeVerified && confirmText.trim().toUpperCase() === "ZERO" ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmation accepted
                  </div>
                ) : null}
              </section>

              <section className="border-t border-gray-200 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleZeroInventory}
                    disabled={!canZeroInventory || saving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Zeroing Inventory...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Mark All Variant Inventory as Zero
                      </>
                    )}
                  </button>

                  <p className="text-xs leading-5 text-gray-500">
                    This action remains disabled until the passcode is validated and the
                    confirmation text is entered correctly.
                  </p>
                </div>
              </section>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900">Operational Notes</h3>

              <div className="mt-4 space-y-4 text-sm leading-6 text-gray-600">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">What this action does</p>
                  <p className="mt-1">
                    Sets all variant stock values to zero for applicable variable products.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">Recommended usage</p>
                  <p className="mt-1">
                    Use only during planned inventory resets, audits, or controlled stock
                    shutdown scenarios.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">Security note</p>
                  <p className="mt-1">
                    Frontend validation is active here. For complete protection, the same
                    passcode verification should also be enforced in the backend API.
                  </p>
                </div>
              </div>
            </Card>

            {lastResult ? (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-gray-900">Last Execution Result</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Message
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {lastResult.message || "Completed"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Matched
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {Number(lastResult.matchedCount || 0)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Modified
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {Number(lastResult.modifiedCount || 0)}
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}