"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";

import useLoginStore from "../../store/useLoginStore";
import { Lock, User, LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-8 text-gray-900">
      <div className="w-full max-w-[460px] rounded-[32px] border border-gray-100 bg-white p-7 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-9">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
              <Image
                src="https://www.mirayfashions.com/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdjtva6hec%2Fimage%2Fupload%2Fv1764916639%2Fmiray%2Fmedia%2Fk0yvgu5m0ij1husm3ugh.png&w=256&q=75"
                alt="Miray Logo"
                width={160}
                height={70}
                priority
                className="h-auto w-[160px]"
              />
            </div>
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-gray-950">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Login to continue to your Miray admin dashboard
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>

            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#800020]/40 focus:ring-4 focus:ring-[#800020]/5"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#800020]/40 focus:ring-4 focus:ring-[#800020]/5"
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-[#800020]"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#800020] py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(128,0,32,0.18)] transition hover:bg-[#6f001c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LogIn size={18} />
            )}

            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>© 2026 Miray Admin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}