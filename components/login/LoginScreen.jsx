"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import useLoginStore from "../../store/useLoginStore";
import {
  BadgeCheck,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";

const OATCLUB_LOGO_URL =
  "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png";

export default function LoginScreen() {
  const router = useRouter();

  const BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useLoginStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const { data } = await axios.post(`${BASE_URL}/api/admin-users/login`, {
        username: username.trim(),
        password,
      });

      if (!data?.token) throw new Error("Token missing from response");

      login({ token: data.token, admin: data.admin });
      router.push("/");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-4 py-10 text-oat-text">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(9,9,11,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden min-h-[620px] bg-zinc-950 p-9 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
              <Crown size={14} />
              VIP Admin Access
            </div>

            <h1 className="mt-8 max-w-sm text-5xl font-black leading-[1.02] tracking-tight">
              OATCLUB command room.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-300">
              Sign in to control orders, campaigns, products, customer journeys,
              and daily brand operations.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              [ShieldCheck, "Secure admin session"],
              [BadgeCheck, "Role based workspace"],
              [Fingerprint, "Private operations layer"],
            ].map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium text-zinc-100">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12">
          <div className="mb-9 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center justify-center">
              <img
                src={OATCLUB_LOGO_URL}
                alt="OATCLUB"
                className="h-14 w-auto object-contain"
              />
            </div>

            <h1 className="text-[34px] font-black leading-tight tracking-tight text-oat-text">
              Welcome back
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Enter your admin credentials to continue to OATCLUB.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-900">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <User size={16} />
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-950/5"
                  placeholder="admin username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <KeyRound size={16} />
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-12 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-950/5"
                  placeholder="secure password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-950"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(9,9,11,0.18)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? "Logging in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500 lg:justify-start">
            <Lock size={14} />
            <p>Protected OATCLUB admin access</p>
          </div>
        </section>
      </div>
    </div>
  );
}
