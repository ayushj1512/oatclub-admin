// app/superadmin/add/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  UserPlus,
  ArrowLeft,
  Save,
  AtSign,
  KeyRound,
  StickyNote,
  UserRound,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Wand2,
} from "lucide-react";

import { useAdminUsersVerifyStore } from "@/store/adminUsersStore";
import { ROLE_DEFAULT_PERMS, ALL_PERMISSIONS } from "@/config/loginConfig";

const SESSION_KEY = "miray_superadmin_unlocked";
const ACTIVITY_KEY = "miray_superadmin_user_activity";

const cx = (...a) => a.filter(Boolean).join(" ");

const safeJsonParse = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

const pushActivity = (entry) => {
  const list = safeJsonParse(localStorage.getItem(ACTIVITY_KEY) || "[]", []);
  const next = [{ ...entry, at: new Date().toISOString() }, ...list].slice(
    0,
    200
  );
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
};

const normalizeUsername = (v) => String(v ?? "").trim().toLowerCase();
const normalizeEmail = (v) => String(v ?? "").trim().toLowerCase();

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

const parsePerms = (s) =>
  uniq(
    String(s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  );

export default function SuperAdminAddUser() {
  const router = useRouter();

const createUser = useAdminUsersVerifyStore((s) => s.createUser);
const fetchUsers = useAdminUsersVerifyStore((s) => s.fetchUsers);
const storeLoading = useAdminUsersVerifyStore((s) => s.loading);
const storeError = useAdminUsersVerifyStore((s) => s.error);
const clearError = useAdminUsersVerifyStore((s) => s.clearError);

  const [ready, setReady] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin",
    isActive: true,
    fullName: "",
    phone: "",
    profileImage: "",
    permissions: "",
    notes: "",
  });

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!ok) return router.replace("/superadmin");
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (storeError) setToast({ type: "error", msg: storeError });
  }, [storeError]);

  const username = useMemo(
    () => normalizeUsername(form.username),
    [form.username]
  );

  const email = useMemo(() => normalizeEmail(form.email), [form.email]);

  const pass = useMemo(() => String(form.password || ""), [form.password]);

  const canSubmit = useMemo(() => {
    return (
      username.length >= 3 &&
      !!email &&
      pass.trim().length >= 6 &&
      !storeLoading
    );
  }, [username, email, pass, storeLoading]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyRoleDefaults = () => {
    const role = String(form.role || "admin");
    const defaults = ROLE_DEFAULT_PERMS[role] || [];

    const computed = defaults.includes("*")
      ? ["*"]
      : defaults.length
      ? defaults
      : role === "admin"
      ? ALL_PERMISSIONS
      : [];

    setField("permissions", computed.join(", "));
    setToast({ type: "success", msg: `Permissions set for role: ${role}` });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const finalUsername = normalizeUsername(form.username);
    const finalEmail = normalizeEmail(form.email);
    const finalPassword = String(form.password || "").trim();

    if (finalUsername.length < 3) {
      return setToast({
        type: "error",
        msg: "Username must be at least 3 characters.",
      });
    }

    if (!finalEmail) {
      return setToast({ type: "error", msg: "Email is required." });
    }

    if (finalPassword.length < 6) {
      return setToast({
        type: "error",
        msg: "Password must be at least 6 characters.",
      });
    }

    setToast(null);
    clearError?.();

    try {
      const role = String(form.role || "admin");
      const typedPerms = parsePerms(form.permissions);
      const roleDefaults = ROLE_DEFAULT_PERMS[role] || [];

      const finalPerms = typedPerms.length
        ? typedPerms
        : roleDefaults.includes("*")
        ? ["*"]
        : role === "admin"
        ? ALL_PERMISSIONS
        : roleDefaults;

      const payload = {
        username: finalUsername,
        email: finalEmail,
        password: finalPassword,
        role,
        isActive: !!form.isActive,
        fullName: String(form.fullName || "").trim(),
        phone: String(form.phone || "").trim(),
        profileImage: String(form.profileImage || "").trim(),
        permissions: uniq(finalPerms),
      };

      const data = await createUser(payload);

      pushActivity({
        action: "CREATED_ADMIN_USER",
        userId: data?.user?._id || "—",
        meta: {
          username: finalUsername,
          email: finalEmail,
          role: payload.role,
          isActive: payload.isActive,
        },
      });

      setToast({
        type: "success",
        msg: `User created ✅ (${data?.user?._id || "id"})`,
      });

      fetchUsers?.().catch(() => {});

      setForm((prev) => ({
        ...prev,
        username: "",
        email: "",
        password: "",
        fullName: "",
        phone: "",
        profileImage: "",
        permissions: "",
        notes: "",
      }));

      setTimeout(() => router.push("/superadmin/manage"), 350);
    } catch (err) {
      setToast({ type: "error", msg: err?.message || "Create failed" });
    }
  };

  if (!ready) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-sky-400/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] opacity-40 [background-size:22px_22px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
              <Shield className="text-blue-700" size={20} />
            </div>

            <div>
              <div className="text-sm text-gray-500">Superadmin</div>
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <UserPlus className="text-blue-700" size={22} />
                Add User
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/superadmin/manage")}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 transition hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-3xl border border-blue-100 bg-white/80 p-5 shadow-sm backdrop-blur lg:col-span-2">
            <div className="flex items-center gap-2">
              <UserRound className="text-blue-700" size={18} />
              <div className="font-semibold">New Admin Account</div>
            </div>

            <div className="mt-3 text-sm leading-relaxed text-gray-600">
              Create a new admin user. If permissions are left empty, defaults
              are applied by role.
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
              Admin role gets <b>all permissions</b> except superadmin{" "}
              <b>*</b>.
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white/80 shadow-sm backdrop-blur lg:col-span-3">
            <form onSubmit={onSubmit}>
              <div className="border-b border-gray-100 p-5">
                <div className="font-semibold text-gray-900">Create User</div>
                <div className="mt-1 text-sm text-gray-600">
                  Fill details below and hit Save.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <Field label="Username *">
                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                    <AtSign size={16} className="text-gray-500" />
                    <input
                      value={form.username}
                      onChange={(e) => setField("username", e.target.value)}
                      className="w-full bg-transparent outline-none"
                      placeholder="e.g. admin1"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    Saved as: <b>@{username || "—"}</b>
                  </div>
                </Field>

                <Field label="Email *">
                  <input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                    placeholder="e.g. admin1@oatclub.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </Field>

                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => setField("role", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                  >
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                    <option value="staff">staff</option>
                    <option value="influencer">influencer</option>
                    <option value="viewer">viewer</option>
                    <option value="customer_care">customer_care</option>
                    <option value="warehouse">warehouse</option>
                  </select>

                  <button
                    type="button"
                    onClick={applyRoleDefaults}
                    className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm transition hover:bg-gray-50"
                  >
                    <Wand2 size={16} />
                    Auto permissions
                  </button>
                </Field>

                <Field label="Active">
                  <button
                    type="button"
                    onClick={() => setField("isActive", !form.isActive)}
                    className={cx(
                      "inline-flex w-full items-center justify-between rounded-2xl border px-3 py-2 transition",
                      form.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    )}
                  >
                    <span className="text-sm font-semibold">
                      {form.isActive ? "Active" : "Inactive"}
                    </span>
                    {form.isActive ? (
                      <ToggleRight size={18} />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </button>
                </Field>

                <Field label="Full Name" full>
                  <input
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Profile Image URL">
                  <input
                    value={form.profileImage}
                    onChange={(e) => setField("profileImage", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Password *" full>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                      <KeyRound size={16} className="text-gray-500" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className="w-full bg-transparent outline-none"
                        placeholder="min 6 chars"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="inline-flex h-10 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white transition hover:bg-gray-50"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Permissions (comma separated)" full>
                  <input
                    value={form.permissions}
                    onChange={(e) => setField("permissions", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 outline-none"
                    placeholder={`e.g. ${ALL_PERMISSIONS.slice(0, 3).join(
                      ", "
                    )} ...`}
                  />
                  <div className="mt-2 text-[11px] text-gray-500">
                    Leave empty to auto-apply role defaults. Use <b>*</b> only
                    for <b>superadmin</b>.
                  </div>
                </Field>

                <Field label="Notes" full>
                  <div className="flex items-start gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                    <StickyNote size={16} className="mt-0.5 text-gray-500" />
                    <textarea
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      className="min-h-[90px] w-full bg-transparent outline-none"
                      placeholder="Optional notes, not saved to backend..."
                    />
                  </div>
                </Field>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <AnimatePresence mode="popLayout">
                  {toast && (
                    <motion.div
                      key={toast.type + toast.msg}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={cx(
                        "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                        toast.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      )}
                    >
                      {toast.type === "success" ? (
                        <CheckCircle2 size={16} className="mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="mt-0.5" />
                      )}
                      <div>{toast.msg}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/superadmin/manage")}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold text-white transition",
                      canSubmit
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "cursor-not-allowed bg-blue-300"
                    )}
                  >
                    <Save size={16} />
                    {storeLoading ? "Saving..." : "Save User"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          After creating, you’ll be redirected to{" "}
          <b>/superadmin/manage</b>.
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      {children}
    </div>
  );
}