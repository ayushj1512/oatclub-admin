"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";

import useLoginStore from "../../store/useLoginStore";
import { Lock, User, LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginScreen() {
  const router = useRouter();

  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

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

      // ✅ Call backend login (UPDATED ENDPOINT)
      const { data } = await axios.post(`${BASE_URL}/api/admin-users/login`, {
        username: username.trim(), // ✅ clean input
        password,
      });

      // ✅ Expected response: { token, admin }
      if (!data?.token) throw new Error("Token missing from response");

      // ✅ Save session in store + localStorage adminToken
      login({ token: data.token, admin: data.admin });

      // ✅ Redirect
      router.push("/");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Login failed";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-800 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://res.cloudinary.com/djtva6hec/image/upload/v1767196261/miray/media/rwhqczcfjnmnvoytyrmh.png"
              alt="Miray Logo"
              width={160}
              height={70}
              priority
              style={{ width: "160px", height: "auto" }} // ✅ fixes Next/Image warning
            />
          </div>

          <p className="text-gray-500 text-sm">Admin Login Portal</p>
        </div>

        {/* ✅ Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition duration-300"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Admin Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
