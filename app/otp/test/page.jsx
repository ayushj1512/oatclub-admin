"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";

import toast from "react-hot-toast";

import { useOtpStore } from "@/store/otpStore";

const initialForm = {
  identifier: "",
  name: "",
  purpose: "order_verification",
  channel: "email",
};

const normalizePhone = (value = "") => {
  let phone = String(value).replace(/\D/g, "");

  if (phone.startsWith("91") && phone.length === 12) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0") && phone.length === 11) {
    phone = phone.slice(1);
  }

  return phone;
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
  const [referenceId, setReferenceId] =
    useState("");
  const [sentDetails, setSentDetails] =
    useState(null);
  const [verified, setVerified] =
    useState(false);
  const [resendSeconds, setResendSeconds] =
    useState(0);

  const isWhatsapp =
    form.channel === "whatsapp";

  const channelLabel = isWhatsapp
    ? "WhatsApp"
    : "Email";

  const IdentifierIcon = isWhatsapp
    ? MessageCircle
    : Mail;

  const normalizedIdentifier = useMemo(() => {
    if (isWhatsapp) {
      return normalizePhone(form.identifier);
    }

    return form.identifier.trim().toLowerCase();
  }, [form.identifier, isWhatsapp]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        Math.max(0, current - 1),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectChannel = (channel) => {
    setForm((current) => ({
      ...current,
      channel,
      identifier: "",
    }));

    setOtp("");
    setReferenceId("");
    setSentDetails(null);
    setVerified(false);
    setResendSeconds(0);
  };

  const validateIdentifier = () => {
    if (!normalizedIdentifier) {
      toast.error(
        isWhatsapp
          ? "WhatsApp number is required"
          : "Email address is required",
      );

      return false;
    }

    if (
      isWhatsapp &&
      !/^[6-9]\d{9}$/.test(normalizedIdentifier)
    ) {
      toast.error(
        "Enter a valid 10-digit Indian WhatsApp number",
      );

      return false;
    }

    if (
      !isWhatsapp &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedIdentifier,
      )
    ) {
      toast.error(
        "Enter a valid email address",
      );

      return false;
    }

    return true;
  };

  const buildPayload = (action = "send") => ({
    ...form,
    identifier: normalizedIdentifier,
    name: form.name.trim(),
    metadata: {
      source: "admin_testing_page",
      action,
      channel: form.channel,
    },
  });

  const applySentResponse = (response) => {
    const details = response?.data || null;

    setReferenceId(
      details?.referenceId || "",
    );
    setSentDetails(details);
    setOtp("");
    setVerified(false);

    setResendSeconds(
      Number(
        details?.resendAvailableInSeconds ||
        60,
      ),
    );
  };

  const handleSend = async (event) => {
    event.preventDefault();

    if (!validateIdentifier()) return;

    try {
      const response = await sendOTP(
        buildPayload("send"),
      );

      applySentResponse(response);

      toast.success(
        `OTP sent through ${channelLabel}`,
      );
    } catch (error) {
      toast.error(
        error?.message || "Failed to send OTP",
      );
    }
  };

  const handleResend = async () => {
    if (
      sending ||
      resendSeconds > 0 ||
      !validateIdentifier()
    ) {
      return;
    }

    try {
      const response = await resendOTP(
        buildPayload("resend"),
      );

      applySentResponse(response);

      toast.success(
        `OTP resent through ${channelLabel}`,
      );
    } catch (error) {
      toast.error(
        error?.message || "Failed to resend OTP",
      );
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast.error(
        "Enter a valid 6-digit OTP",
      );

      return;
    }

    try {
      await verifyOTP({
        identifier: normalizedIdentifier,
        channel: form.channel,
        purpose: form.purpose,
        otp,
        referenceId,
      });

      setVerified(true);

      toast.success(
        "OTP verified successfully",
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "OTP verification failed",
      );
    }
  };

  const resetTest = () => {
    setForm(initialForm);
    setOtp("");
    setReferenceId("");
    setSentDetails(null);
    setVerified(false);
    setResendSeconds(0);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/otp")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-black sm:mb-5"
        >
          <ArrowLeft size={17} />
          Back to OTP
        </button>

        <section className="rounded-[24px] border border-zinc-100 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-7">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white sm:h-12 sm:w-12">
              <KeyRound size={21} />
            </span>

            <div className="min-w-0">
              <h1 className="text-xl font-black text-zinc-950 sm:text-2xl">
                Test OTP Service
              </h1>

              <p className="mt-1 text-sm leading-5 text-zinc-500">
                Send and verify an OTP through
                Email or WhatsApp.
              </p>
            </div>
          </div>

          {!sentDetails ? (
            <form
              onSubmit={handleSend}
              className="mt-6 space-y-5 sm:mt-7"
            >
              {/* Channel */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Delivery channel
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectChannel("email")
                    }
                    className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${!isWhatsapp
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                      }`}
                  >
                    <Mail size={17} />
                    Email
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectChannel("whatsapp")
                    }
                    className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${isWhatsapp
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-400"
                      }`}
                  >
                    <MessageCircle size={17} />
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Customer name
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Enter customer name"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none transition focus:border-black focus:bg-white sm:text-sm"
                />
              </div>

              {/* Identifier */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {isWhatsapp
                    ? "WhatsApp number"
                    : "Email address"}
                </label>

                <div className="relative mt-2">
                  <IdentifierIcon
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    type={
                      isWhatsapp
                        ? "tel"
                        : "email"
                    }
                    inputMode={
                      isWhatsapp
                        ? "numeric"
                        : "email"
                    }
                    required
                    value={form.identifier}
                    onChange={(event) =>
                      updateField(
                        "identifier",
                        isWhatsapp
                          ? event.target.value
                            .replace(
                              /[^\d+\s-]/g,
                              "",
                            )
                            .slice(0, 16)
                          : event.target.value,
                      )
                    }
                    placeholder={
                      isWhatsapp
                        ? "9876543210"
                        : "customer@example.com"
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-base outline-none transition focus:border-black focus:bg-white sm:text-sm"
                  />
                </div>

                {isWhatsapp && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Indian WhatsApp number. You can
                    enter 9876543210 or +91 format.
                  </p>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  OTP purpose
                </label>

                <select
                  value={form.purpose}
                  onChange={(event) =>
                    updateField(
                      "purpose",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base outline-none focus:border-black sm:text-sm"
                >
                  <option value="login">
                    Login
                  </option>

                  <option value="signup">
                    Signup
                  </option>

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
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isWhatsapp
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-zinc-950 hover:bg-black"
                  }`}
              >
                {sending ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Send through {channelLabel}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-6 sm:mt-7">
              {/* Sent status */}
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-green-800">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    OTP sent through{" "}
                    {channelLabel} to{" "}
                    <span className="break-all">
                      {sentDetails?.identifier ||
                        form.identifier}
                    </span>
                  </span>
                </p>

                <p className="mt-2 break-all text-xs leading-5 text-green-700">
                  Reference: {referenceId}
                </p>
              </div>

              {verified ? (
                <div className="mt-5 rounded-2xl bg-zinc-950 p-5 text-center text-white sm:p-6">
                  <CheckCircle2
                    size={38}
                    className="mx-auto"
                  />

                  <h2 className="mt-3 text-xl font-bold">
                    OTP Verified
                  </h2>

                  <p className="mt-2 text-sm text-zinc-300">
                    The {channelLabel} OTP service
                    is working correctly.
                  </p>

                  <button
                    type="button"
                    onClick={resetTest}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black sm:w-auto"
                  >
                    <RotateCcw size={16} />
                    Test Another OTP
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleVerify}
                  className="mt-5"
                >
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Enter received OTP
                  </label>

                  <input
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-2xl font-black tracking-[0.3em] outline-none transition focus:border-black focus:bg-white sm:px-4 sm:text-3xl sm:tracking-[0.45em]"
                  />

                  <button
                    type="submit"
                    disabled={
                      verifying ||
                      otp.length !== 6
                    }
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
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
                      disabled={
                        sending ||
                        resendSeconds > 0
                      }
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        size={16}
                        className={
                          sending
                            ? "animate-spin"
                            : ""
                        }
                      />

                      {resendSeconds > 0
                        ? `Resend in ${resendSeconds}s`
                        : "Resend OTP"}
                    </button>

                    <button
                      type="button"
                      onClick={resetTest}
                      className="min-h-12 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                    >
                      Change {channelLabel}
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
