"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useLoginStore from "../../store/useLoginStore";
import { Lock, User, LogIn } from "lucide-react";

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useLoginStore((state) => state.login);

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ simple mock login
    login(username);

    // ✅ single fixed route
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-800 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-wide">
            Miray Fashion
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Admin Login Portal
          </p>
        </div>

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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition duration-300"
          >
            <LogIn size={18} />
            Login
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Miray Fashion Admin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
