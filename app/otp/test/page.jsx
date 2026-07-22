"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const initialForm = {
  identifier: "",
  name: "",
  purpose: "login",
  channel: "email",
};

export default function OtpTestingPage() {
  const router = useRouter();

  const {
    sendOTP,
    resendOTP,
    verifyOTP,
    sending,
    verifying,
  } = useOtpStore();

  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [sentDetails, setSentDetails] = useState(null);
  const [verified, setVerified] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSend = async (event) => {
    event.preventDefault();

    if (!form.identifier.trim()) {
      return toast.error("Email address is required");
    }

    try {
      const response = await sendOTP({
        ...form,
        identifier: form.identifier.trim(),
        name: form.name.trim(),
        metadata: {
          source: "admin_testing_page",
        },
      });

      const details = response?.data || null;

      setReferenceId(details?.referenceId || "");
      setSentDetails(details);
      setOtp("");
      setVerified(false);

      toast.success("OTP sent successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to send OTP");
    }
  };

  const handleResend = async () => {
    try {
      const response = await resendOTP({
        ...form,
        identifier: form.identifier.trim(),
        name: form.name.trim(),
        metadata: {
          source: "admin_testing_page",
          action: "resend",
        },
      });

      const details = response?.data || null;

      setReferenceId(details?.referenceId || "");
      setSentDetails(details);
      setOtp("");
      setVerified(false);

      toast.success("OTP resent successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to resend OTP");
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      return toast.error("Enter a valid 6-digit OTP");
    }

    try {
      await verifyOTP({
        identifier: form.identifier.trim(),
        channel: form.channel,
        purpose: form.purpose,
        otp,
        referenceId,
      });

      setVerified(true);
      toast.success("OTP verified successfully");
    } catch (error) {
      toast.error(error?.message || "OTP verification failed");
    }
  };

  const resetTest = () => {
    setForm(initialForm);
    setOtp("");
    setReferenceId("");
    setSentDetails(null);
    setVerified(false);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/otp")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-black"
        >
          <ArrowLeft size={17} />
          Back to OTP
        </button>

        <section className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <KeyRound size={21} />
            </span>

            <div>
              <h1 className="text-2xl font-black text-zinc-950">
                Test OTP Service
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Send an OTP to an email address and verify it here.
              </p>
            </div>
          </div>

          {!sentDetails ? (
            <form onSubmit={handleSend} className="mt-7 space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Customer name
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Enter customer name"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email address
                </label>

                <div className="relative mt-2">
                  <Mail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    type="email"
                    required
                    value={form.identifier}
                    onChange={(event) =>
                      updateField("identifier", event.target.value)
                    }
                    placeholder="customer@example.com"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  OTP purpose
                </label>

                <select
                  value={form.purpose}
                  onChange={(event) =>
                    updateField("purpose", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="login">Login</option>
                  <option value="signup">Signup</option>
                  <option value="email_verification">
                    Email Verification
                  </option>
                  <option value="password_reset">
                    Password Reset
                  </option>
                  <option value="order_verification">
                    Order Verification
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Send Test OTP
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-7">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
                  <CheckCircle2 size={17} />
                  OTP sent to {sentDetails?.identifier || form.identifier}
                </p>

                <p className="mt-2 break-all text-xs text-green-700">
                  Reference: {referenceId}
                </p>
              </div>

              {verified ? (
                <div className="mt-5 rounded-2xl bg-zinc-950 p-6 text-center text-white">
                  <CheckCircle2 size={38} className="mx-auto" />

                  <h2 className="mt-3 text-xl font-bold">
                    OTP Verified
                  </h2>

                  <p className="mt-2 text-sm text-zinc-300">
                    The OTP service is working correctly.
                  </p>

                  <button
                    type="button"
                    onClick={resetTest}
                    className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black"
                  >
                    Test Another Email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerify} className="mt-5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Enter received OTP
                  </label>

                  <input
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    inputMode="numeric"
                    placeholder="000000"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-3xl font-black tracking-[0.45em] outline-none focus:border-black focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={verifying}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Verify OTP
                      </>
                    )}
                  </button>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={sending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={16}
                        className={sending ? "animate-spin" : ""}
                      />
                      Resend OTP
                    </button>

                    <button
                      type="button"
                      onClick={resetTest}
                      className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700"
                    >
                      Change Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}