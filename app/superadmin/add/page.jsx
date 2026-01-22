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

// ✅ connect store (adjust path if needed)
import { useAdminPanelStore } from "@/store/adminPanelUSer.store";

// ✅ permissions config
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
  const next = [{ ...entry, at: new Date().toISOString() }, ...list].slice(0, 200);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  return next;
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

  // ✅ store actions/state
  const createUser = useAdminPanelStore((s) => s.createUser);
  const fetchUsers = useAdminPanelStore((s) => s.fetchUsers);
  const storeLoading = useAdminPanelStore((s) => s.loading);
  const storeError = useAdminPanelStore((s) => s.error);
  const clearError = useAdminPanelStore((s) => s.clearError);

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
    permissions: "", // comma separated
    notes: "", // UI-only
  });

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!ok) return router.replace("/superadmin");
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (storeError) setToast({ type: "error", msg: storeError });
  }, [storeError]);

  const username = useMemo(() => normalizeUsername(form.username), [form.username]);
  const email = useMemo(() => normalizeEmail(form.email), [form.email]);
  const pass = useMemo(() => String(form.password || ""), [form.password]);

  const canSubmit = useMemo(() => {
    return username.length >= 3 && !!email && pass.trim().length >= 6 && !storeLoading;
  }, [username, email, pass, storeLoading]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ✅ Auto-fill permissions by role (admin gets all except "*")
  const applyRoleDefaults = () => {
    const r = String(form.role || "admin");
    const defaults = ROLE_DEFAULT_PERMS[r] || [];
    // keep "*" only for superadmin; for others use ALL_PERMISSIONS fallback if needed
    const computed =
      defaults.includes("*") ? ["*"] : defaults.length ? defaults : r === "admin" ? ALL_PERMISSIONS : [];

    setField("permissions", computed.join(", "));
    setToast({ type: "success", msg: `Permissions set for role: ${r}` });
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();

    const u = normalizeUsername(form.username);
    const em = normalizeEmail(form.email);
    const p = String(form.password || "").trim();

    if (!u || u.length < 3) return setToast({ type: "error", msg: "Username must be at least 3 characters." });
    if (!em) return setToast({ type: "error", msg: "Email is required." });
    if (p.length < 6) return setToast({ type: "error", msg: "Password must be at least 6 characters." });

    setToast(null);
    clearError?.();

    try {
      const role = String(form.role || "admin");

      // ✅ If permissions empty, set role defaults
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
        username: u,
        email: em,
        password: p,
        role,
        isActive: !!form.isActive,
        fullName: String(form.fullName || "").trim(),
        phone: String(form.phone || "").trim(),
        profileImage: String(form.profileImage || "").trim(),
        permissions: uniq(finalPerms),
      };

      const d = await createUser(payload);

      pushActivity({
        action: "CREATED_ADMIN_USER",
        userId: d?.user?._id || "—",
        meta: { username: u, email: em, role: payload.role, isActive: payload.isActive },
      });

      setToast({ type: "success", msg: `User created ✅ (${d?.user?._id || "id"})` });

      fetchUsers?.().catch(() => {});
      setForm((p0) => ({
        ...p0,
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
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-blue-600/15 blur-[110px] rounded-full" />
        <div className="absolute -bottom-44 -right-44 w-[620px] h-[620px] bg-sky-400/15 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Shield className="text-blue-700" size={20} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Superadmin</div>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <UserPlus className="text-blue-700" size={22} />
                Add User
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/superadmin/manage")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Info */}
          <div className="lg:col-span-2 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm p-5">
            <div className="flex items-center gap-2">
              <UserRound className="text-blue-700" size={18} />
              <div className="font-semibold">New Admin Account</div>
            </div>

            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Create a new admin user. If permissions are left empty, defaults are applied by role.
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
              Admin role gets <b>all permissions</b> (except superadmin <b>*</b>).
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm overflow-hidden">
            <form onSubmit={onSubmit}>
              <div className="p-5 border-b border-gray-100">
                <div className="font-semibold text-gray-900">Create User</div>
                <div className="text-sm text-gray-600 mt-1">Fill details below and hit Save.</div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Username *">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                    <AtSign size={16} className="text-gray-500" />
                    <input
                      value={form.username}
                      onChange={(e) => setField("username", e.target.value)}
                      className="w-full outline-none bg-transparent"
                      placeholder="e.g. admin1"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2">
                    Saved as: <b>@{username || "—"}</b>
                  </div>
                </Field>

                <Field label="Email *">
                  <input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
                    placeholder="e.g. admin1@miray.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </Field>

                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => setField("role", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
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
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition text-sm"
                    title="Auto set permissions by role"
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
                      "w-full inline-flex items-center justify-between px-3 py-2 rounded-2xl border transition",
                      form.isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    )}
                  >
                    <span className="text-sm font-semibold">{form.isActive ? "Active" : "Inactive"}</span>
                    {form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </Field>

                <Field label="Full Name" full>
                  <input
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Profile Image URL">
                  <input
                    value={form.profileImage}
                    onChange={(e) => setField("profileImage", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Password *" full>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 flex-1">
                      <KeyRound size={16} className="text-gray-500" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className="w-full outline-none bg-transparent"
                        placeholder="min 6 chars"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="inline-flex items-center justify-center w-12 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                      title={showPass ? "Hide" : "Show"}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Permissions (comma separated)" full>
                  <input
                    value={form.permissions}
                    onChange={(e) => setField("permissions", e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 outline-none"
                    placeholder={`e.g. ${ALL_PERMISSIONS.slice(0, 3).join(", ")} ...`}
                  />
                  <div className="text-[11px] text-gray-500 mt-2">
                    Leave empty to auto-apply role defaults. Use <b>*</b> only for <b>superadmin</b>.
                  </div>
                </Field>

                <Field label="Notes" full>
                  <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                    <StickyNote size={16} className="text-gray-500 mt-0.5" />
                    <textarea
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      className="w-full outline-none bg-transparent min-h-[90px]"
                      placeholder="Optional notes (not saved to backend)..."
                    />
                  </div>
                </Field>
              </div>

              <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-red-50 border-red-200 text-red-800"
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

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => router.push("/superadmin/manage")}
                    className="px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cx(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white font-semibold transition",
                      canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300"
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

        <div className="mt-6 text-xs text-gray-500">After creating, you’ll be redirected to <b>/superadmin/manage</b>.</div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-semibold text-gray-800 block mb-2">{label}</label>
      {children}
    </div>
  );
}
