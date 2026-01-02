"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import useLoginStore from "@/store/useLoginStore";
import { Loader2, Save, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const { admin, token, logout } = useLoginStore();

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Profile form state
  const [form, setForm] = useState({
    username: "",
    role: "",
    email: "",
    fullName: "",
    phone: "",
    profileImage: "",
  });

  // ✅ Password form state
  const [passForm, setPassForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // ✅ Load profile (from store / API fallback)
  useEffect(() => {
    if (!admin?._id) return;

    // Pre-fill from store (fast)
    setForm({
      username: admin.username || "",
      role: admin.role || "",
      email: admin.email || "",
      fullName: admin.fullName || "",
      phone: admin.phone || "",
      profileImage: admin.profileImage || "",
    });
  }, [admin]);

  const headers = () => ({
    Authorization: `Bearer ${token || localStorage.getItem("adminToken")}`,
  });

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePassChange = (e) => {
    setError("");
    setSuccess("");
    setPassForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ✅ Update personal info (NOT permissions)
  const handleSaveProfile = async () => {
    if (!admin?._id) return;

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      // ✅ only fields allowed
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        profileImage: form.profileImage,
      };

      const { data } = await axios.patch(
        `${BASE_URL}/api/admin-users/${admin._id}`,
        payload,
        { headers: headers() }
      );

      setSuccess(data.message || "Profile updated");

      // ✅ Update store admin (optional: keep UI in sync)
      // You can add updateAdmin() in login store if you want
      // For now: refresh page state only
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ✅ Change password
  const handleChangePassword = async () => {
    if (!admin?._id) return;

    if (!passForm.newPassword || passForm.newPassword.length < 6) {
      return setError("New password must be at least 6 characters");
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setChangingPass(true);
      setError("");
      setSuccess("");

      const { data } = await axios.patch(
        `${BASE_URL}/api/admin-users/${admin._id}/password`,
        { newPassword: passForm.newPassword },
        { headers: headers() }
      );

      setSuccess(data.message || "Password updated successfully");

      setPassForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to update password");
    } finally {
      setChangingPass(false);
    }
  };

  if (!admin?._id) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        <p>Please login again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>

        {/* Alerts */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* ============================= */}
        {/* ✅ PROFILE DETAILS */}
        {/* ============================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              name="username"
              value={form.username}
              disabled
              className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-gray-700"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              name="role"
              value={form.role}
              disabled
              className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-gray-700"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Profile Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image URL</label>
            <input
              name="profileImage"
              value={form.profileImage}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Save Profile Button */}
        <div className="mt-6">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* ============================= */}
        {/* ✅ CHANGE PASSWORD */}
        {/* ============================= */}
        <div className="mt-10 border-t pt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Change Password</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                name="newPassword"
                type="password"
                value={passForm.newPassword}
                onChange={handlePassChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={passForm.confirmPassword}
                onChange={handlePassChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={changingPass}
            className="mt-5 bg-gray-900 hover:bg-black disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            {changingPass ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
            {changingPass ? "Updating..." : "Update Password"}
          </button>
        </div>

      
      </div>
    </div>
  );
}
