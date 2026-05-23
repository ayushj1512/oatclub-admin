"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import useLoginStore from "@/store/useLoginStore";
import { Loader2, Save, KeyRound, UserRound } from "lucide-react";

export default function ProfilePage() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const { admin, token } = useLoginStore();

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    username: "",
    role: "",
    email: "",
    fullName: "",
    phone: "",
    profileImage: "",
  });

  const [passForm, setPassForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!admin?._id) return;

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

  const handleSaveProfile = async () => {
    if (!admin?._id) return;

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

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

      setSuccess(data.message || "Profile updated successfully");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to update profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to update password"
      );
    } finally {
      setChangingPass(false);
    }
  };

  if (!admin?._id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfafb] px-4 text-gray-700">
        <div className="rounded-2xl border border-[#800020]/10 bg-white px-6 py-5 text-sm shadow-sm">
          Please login again.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfafb] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-2xl border border-[#800020]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#800020] text-white shadow-[0_12px_24px_rgba(128,0,32,0.18)]">
              <UserRound size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
                My Profile
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Manage your admin details and password.
              </p>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mb-5 rounded-2xl border p-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="rounded-2xl border border-[#800020]/10 bg-white p-5 shadow-[0_16px_40px_rgba(128,0,32,0.05)] sm:p-7">
          <h2 className="mb-5 text-base font-semibold text-gray-950">
            Profile Details
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Username">
              <input
                name="username"
                value={form.username}
                disabled
                className="input-disabled"
              />
            </Field>

            <Field label="Role">
              <input
                name="role"
                value={form.role}
                disabled
                className="input-disabled capitalize"
              />
            </Field>

            <Field label="Full Name">
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="input-main"
                placeholder="Enter full name"
              />
            </Field>

            <Field label="Email">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-main"
                placeholder="Enter email"
              />
            </Field>

            <Field label="Phone">
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="input-main"
                placeholder="Enter phone number"
              />
            </Field>

            <Field label="Profile Image URL">
              <input
                name="profileImage"
                value={form.profileImage}
                onChange={handleChange}
                className="input-main"
                placeholder="https://..."
              />
            </Field>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(128,0,32,0.18)] transition hover:bg-[#6f001c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Save size={17} />
              )}
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="mt-9 border-t border-[#800020]/10 pt-7">
            <h2 className="mb-5 text-base font-semibold text-gray-950">
              Change Password
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="New Password">
                <input
                  name="newPassword"
                  type="password"
                  value={passForm.newPassword}
                  onChange={handlePassChange}
                  className="input-main"
                  placeholder="••••••••"
                />
              </Field>

              <Field label="Confirm Password">
                <input
                  name="confirmPassword"
                  type="password"
                  value={passForm.confirmPassword}
                  onChange={handlePassChange}
                  className="input-main"
                  placeholder="••••••••"
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPass}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#800020] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {changingPass ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <KeyRound size={17} />
              )}
              {changingPass ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-main {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(128, 0, 32, 0.14);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: all 180ms ease;
        }

        .input-main:focus {
          border-color: rgba(128, 0, 32, 0.45);
          box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.08);
        }

        .input-disabled {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(128, 0, 32, 0.08);
          background: #fafafa;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #6b7280;
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}