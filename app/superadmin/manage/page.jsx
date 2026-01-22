// app/superadmin/manage/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Trash2,
  RefreshCw,
  Shield,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowLeft,
  ArrowRight,
  UserRound,
  StickyNote,
  KeyRound,
  AtSign,
  Plus,
  History,
  Mail,
  Phone,
  Image as ImageIcon,
  BadgeCheck,
  LockOpen,
  Settings2,
  Wand2,
} from "lucide-react";

import { useAdminPanelStore } from "@/store/adminPanelUSer.store";
import { ROLE_DEFAULT_PERMS, ALL_PERMISSIONS } from "@/config/loginConfig";

const SESSION_KEY = "miray_superadmin_unlocked";
const ACTIVITY_KEY = "miray_superadmin_user_activity";

const cx = (...a) => a.filter(Boolean).join(" ");

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

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

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const parsePerms = (s) =>
  uniq(
    String(s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  );

const permsForRole = (role) => {
  const r = String(role || "admin");
  const defaults = ROLE_DEFAULT_PERMS[r] || [];
  if (defaults.includes("*")) return ["*"];
  if (r === "admin") return [...ALL_PERMISSIONS]; // ✅ admin gets all (except "*")
  return defaults;
};

export default function SuperAdminManageUsers() {
  const router = useRouter();

  // store
  const users = useAdminPanelStore((s) => s.users);
  const total = useAdminPanelStore((s) => s.total);
  const page = useAdminPanelStore((s) => s.page);
  const limit = useAdminPanelStore((s) => s.limit);
  const totalPages = useAdminPanelStore((s) => s.totalPages);
  const filters = useAdminPanelStore((s) => s.filters);
  const loading = useAdminPanelStore((s) => s.loading);
  const error = useAdminPanelStore((s) => s.error);

  const setFilters = useAdminPanelStore((s) => s.setFilters);
  const setPage = useAdminPanelStore((s) => s.setPage);
  const setLimit = useAdminPanelStore((s) => s.setLimit);
  const clearError = useAdminPanelStore((s) => s.clearError);

  const fetchUsers = useAdminPanelStore((s) => s.fetchUsers);
  const updateUser = useAdminPanelStore((s) => s.updateUser);
  const updateRoleAndPermissions = useAdminPanelStore((s) => s.updateRoleAndPermissions);
  const changePassword = useAdminPanelStore((s) => s.changePassword);
  const unlockUser = useAdminPanelStore((s) => s.unlockUser);
  const deleteUser = useAdminPanelStore((s) => s.deleteUser);

  const [ready, setReady] = useState(false);

  // local filter inputs
  const [q, setQ] = useState(filters.search || "");
  const [role, setRole] = useState(filters.role || "");
  const [isActive, setIsActive] = useState(filters.isActive ?? "");

  // activity + toast
  const [activity, setActivity] = useState([]);
  const [toast, setToast] = useState(null);

  // gate + activity
  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!ok) return router.replace("/superadmin");
    setReady(true);

    setActivity(safeJsonParse(localStorage.getItem(ACTIVITY_KEY) || "[]", []));
    setLimit(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchUsers().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, limit, filters.search, filters.role, filters.isActive]);

  useEffect(() => {
    if (error) setToast({ type: "error", msg: error });
  }, [error]);

  const applyFilters = () => {
    clearError?.();
    setFilters({ search: q, role, isActive });
    setPage(1);
  };

  const resetFilters = () => {
    clearError?.();
    setQ("");
    setRole("");
    setIsActive("");
    setFilters({ search: "", role: "", isActive: "" });
    setPage(1);
  };

  // ✅ permissions editor (role-aware)
  const editPermissions = async (u) => {
    const id = u._id;
    if (!id) return;

    const nextRole = prompt(
      "Role (superadmin/admin/staff/influencer/viewer/customer_care/warehouse):",
      u.role || "admin"
    );
    if (nextRole === null) return;

    const r = String(nextRole || "admin").trim();

    const nextPermsRaw = prompt(
      `Permissions (comma separated). Leave empty to use role defaults.\nTip: admin = all permissions, superadmin = *`,
      Array.isArray(u.permissions) ? u.permissions.join(", ") : ""
    );
    if (nextPermsRaw === null) return;

    const typed = parsePerms(nextPermsRaw);
    const finalPerms = typed.length ? typed : permsForRole(r);

    // guard: only superadmin should have "*"
    const safeFinal = r === "superadmin" ? finalPerms : finalPerms.filter((p) => p !== "*");

    try {
      await updateRoleAndPermissions(id, { role: r, permissions: safeFinal });

      const nextActivity = pushActivity({
        action: "UPDATED_ROLE_PERMISSIONS",
        userId: id,
        meta: { username: u.username || "", email: u.email || "", role: r, permissions: safeFinal },
      });
      setActivity(nextActivity);

      setToast({ type: "success", msg: "Role/permissions updated ✅" });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Update failed" });
    }
  };

  const applyRoleDefaultsToUser = async (u) => {
    const id = u._id;
    if (!id) return;

    const r = String(u.role || "admin");
    const defaults = permsForRole(r);
    const safeDefaults = r === "superadmin" ? defaults : defaults.filter((p) => p !== "*");

    try {
      await updateRoleAndPermissions(id, { role: r, permissions: safeDefaults });

      const nextActivity = pushActivity({
        action: "APPLIED_ROLE_DEFAULTS",
        userId: id,
        meta: { username: u.username || "", role: r },
      });
      setActivity(nextActivity);

      setToast({ type: "success", msg: `Defaults applied for ${r} ✅` });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Failed" });
    }
  };

  const editProfile = async (u) => {
    const id = u._id;
    if (!id) return;

    const fullName = prompt("Full name:", u.fullName || "");
    if (fullName === null) return;

    const phone = prompt("Phone:", u.phone || "");
    if (phone === null) return;

    const profileImage = prompt("Profile image URL:", u.profileImage || "");
    if (profileImage === null) return;

    const nextIsActive = confirm("Should this account be ACTIVE? (OK=Active, Cancel=Inactive)");

    try {
      await updateUser(id, {
        fullName: String(fullName || "").trim(),
        phone: String(phone || "").trim(),
        profileImage: String(profileImage || "").trim(),
        isActive: nextIsActive,
      });

      const nextActivity = pushActivity({
        action: "UPDATED_PROFILE",
        userId: id,
        meta: { username: u.username || "", email: u.email || "", isActive: nextIsActive },
      });
      setActivity(nextActivity);

      setToast({ type: "success", msg: "Profile updated ✅" });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Update failed" });
    }
  };

  const toggleActive = async (u) => {
    const id = u._id;
    if (!id) return;

    try {
      await updateUser(id, { isActive: !u.isActive });

      const nextActivity = pushActivity({
        action: "TOGGLED_ACTIVE",
        userId: id,
        meta: { username: u.username || "", isActive: !u.isActive },
      });
      setActivity(nextActivity);

      setToast({ type: "success", msg: `User ${!u.isActive ? "activated" : "deactivated"} ✅` });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Toggle failed" });
    }
  };

  const setPasswordOnly = async (u) => {
    const id = u._id;
    if (!id) return;

    const next = prompt(`New password for @${u.username || "—"} (min 6 chars):`);
    if (next === null) return;

    const trimmed = String(next || "").trim();
    if (trimmed.length < 6) return setToast({ type: "error", msg: "Password must be at least 6 characters" });

    try {
      await changePassword(id, trimmed);
      const nextActivity = pushActivity({
        action: "UPDATED_PASSWORD",
        userId: id,
        meta: { username: u.username || "", email: u.email || "" },
      });
      setActivity(nextActivity);
      setToast({ type: "success", msg: "Password updated ✅" });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Password update failed" });
    }
  };

  const unlock = async (u) => {
    const id = u._id;
    if (!id) return;

    try {
      await unlockUser(id);
      const nextActivity = pushActivity({
        action: "UNLOCKED_USER",
        userId: id,
        meta: { username: u.username || "", email: u.email || "" },
      });
      setActivity(nextActivity);
      setToast({ type: "success", msg: "User unlocked ✅" });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Unlock failed" });
    }
  };

  const removeUser = async (u) => {
    const id = u._id;
    if (!id) return;

    if (!confirm(`Delete ${u.username || u.email || "this user"} permanently?`)) return;

    try {
      await deleteUser(id);

      const nextActivity = pushActivity({
        action: "DELETED_ADMIN_USER",
        userId: id,
        meta: { username: u.username || "", email: u.email || "" },
      });
      setActivity(nextActivity);

      if (users.length === 1 && page > 1) setPage(page - 1);
      setToast({ type: "success", msg: "User deleted ✅" });
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Delete failed" });
    }
  };

  const pages = useMemo(() => Math.max(1, totalPages || 1), [totalPages]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-blue-600/15 blur-[110px] rounded-full" />
        <div className="absolute -bottom-44 -right-44 w-[620px] h-[620px] bg-sky-400/15 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-5 py-10 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Shield className="text-blue-700" size={20} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Superadmin</div>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <Users className="text-blue-700" size={22} />
                Manage Admin Users
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/superadmin")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
            >
              <ArrowLeft size={16} />
              Vault
            </button>

            <button
              onClick={() => fetchUsers().catch(() => {})}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={() => router.push("/superadmin/activity")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
              title="View full activity"
            >
              <History size={16} />
              Activity
            </button>

            <button
              onClick={() => router.push("/superadmin/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
            >
              <Plus size={16} />
              Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Search</label>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                <Search size={16} className="text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search username/email/fullName/phone..."
                  className="w-full outline-none bg-transparent text-sm"
                />
              </div>
            </div>

            <div className="w-full lg:w-56">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm outline-none"
              >
                <option value="">All</option>
                <option value="superadmin">superadmin</option>
                <option value="admin">admin</option>
                <option value="staff">staff</option>
                <option value="influencer">influencer</option>
                <option value="viewer">viewer</option>
                <option value="customer_care">customer_care</option>
                <option value="warehouse">warehouse</option>
              </select>
            </div>

            <div className="w-full lg:w-56">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Status</label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm outline-none"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
              >
                <Filter size={16} />
                Apply
              </button>

              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 flex items-center justify-between">
            <span>
              Total: <b>{total}</b>
            </span>
            <span>
              Page <b>{page}</b> / <b>{pages}</b>
            </span>
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.type + toast.msg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={cx(
                "mt-4 rounded-2xl border px-4 py-3 text-sm w-full",
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              )}
            >
              <div className="flex items-start gap-2">
                {toast.type === "success" ? <CheckCircle2 size={16} className="mt-0.5" /> : <XCircle size={16} className="mt-0.5" />}
                <div className="flex-1">{toast.msg}</div>
                <button
                  onClick={() => setToast(null)}
                  className="text-xs px-2 py-1 rounded-full bg-white/60 border border-gray-200 hover:bg-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Users */}
          <div className="xl:col-span-2 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <UserRound size={18} className="text-blue-700" /> Users
              </div>
              <div className="text-xs text-gray-500">Mongo _id based</div>
            </div>

            {loading ? (
              <div className="p-5 text-gray-600">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-5 text-gray-600">No users found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map((u) => {
                  const roleDefaults = permsForRole(u.role);
                  const isUsingDefaults =
                    Array.isArray(u.permissions) &&
                    u.permissions.length > 0 &&
                    u.permissions.join("|") === roleDefaults.join("|");

                  return (
                    <motion.div key={u._id} layout className="p-4 md:p-5 hover:bg-blue-50/40 transition">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded-full border border-blue-100 bg-white text-blue-700 inline-flex items-center gap-1">
                              <AtSign size={12} /> {u.username || "—"}
                            </span>

                            <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700 inline-flex items-center gap-1">
                              <Mail size={12} /> <span className="truncate max-w-[220px]">{u.email || "—"}</span>
                            </span>

                            <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700 inline-flex items-center gap-1">
                              <BadgeCheck size={12} /> {u.role || "admin"}
                            </span>

                            <span
                              className={cx(
                                "text-xs px-2 py-1 rounded-full border",
                                u.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-red-200 bg-red-50 text-red-700"
                              )}
                            >
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 size={14} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <XCircle size={14} /> Inactive
                                </span>
                              )}
                            </span>

                            {isUsingDefaults ? (
                              <span className="text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600">
                                defaults
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <UserRound size={14} className="text-gray-500 mt-0.5" />
                              <div className="truncate">{u.fullName || "—"}</div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Phone size={14} className="text-gray-500 mt-0.5" />
                              <div className="truncate">{u.phone || "—"}</div>
                            </div>

                            <div className="flex items-start gap-2 sm:col-span-2">
                              <StickyNote size={14} className="text-gray-500 mt-0.5" />
                              <div className="truncate">
                                Permissions:{" "}
                                <b>
                                  {Array.isArray(u.permissions) && u.permissions.length ? u.permissions.join(", ") : "—"}
                                </b>
                              </div>
                            </div>

                            {u.profileImage ? (
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <ImageIcon size={14} className="text-gray-500 mt-0.5" />
                                <div className="truncate">{u.profileImage}</div>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              Created: <b>{fmtDate(u.createdAt)}</b>
                            </span>
                            <span>
                              Updated: <b>{fmtDate(u.updatedAt)}</b>
                            </span>
                            <span>
                              Last login: <b>{fmtDate(u.lastLogin)}</b>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleActive(u)}
                            className="px-3 py-2 rounded-2xl text-sm border border-gray-200 bg-white hover:bg-gray-50 transition"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            onClick={() => unlock(u)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm border border-gray-200 bg-white hover:bg-gray-50 transition"
                            title="Unlock user"
                          >
                            <LockOpen size={16} />
                            Unlock
                          </button>

                          <button
                            onClick={() => setPasswordOnly(u)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                            title="Change Password"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => editProfile(u)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                            title="Edit profile"
                          >
                            <Settings2 size={16} />
                          </button>

                          <button
                            onClick={() => editPermissions(u)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                            title="Edit role/permissions"
                          >
                            <BadgeCheck size={16} />
                          </button>

                          <button
                            onClick={() => applyRoleDefaultsToUser(u)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                            title="Apply role defaults"
                          >
                            <Wand2 size={16} />
                          </button>

                          <button
                            onClick={() => removeUser(u)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-red-600 hover:bg-red-700 transition text-white"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="p-4 md:p-5 flex items-center justify-between border-t border-gray-100">
              <button
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
                className={cx(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border transition",
                  page <= 1 ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-white border-gray-200 hover:bg-gray-50"
                )}
              >
                <ArrowLeft size={16} />
                Prev
              </button>

              <div className="text-sm text-gray-600">
                Page <b>{page}</b> / <b>{pages}</b>
              </div>

              <button
                disabled={page >= pages}
                onClick={() => setPage(Math.min(pages, page + 1))}
                className={cx(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border transition",
                  page >= pages ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-white border-gray-200 hover:bg-gray-50"
                )}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-blue-700" /> Activity
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/superadmin/activity")}
                  className="text-xs px-3 py-1 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition inline-flex items-center gap-1"
                >
                  <History size={14} />
                  Full
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem(ACTIVITY_KEY);
                    setActivity([]);
                  }}
                  className="text-xs px-3 py-1 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="px-4 md:px-5 pb-5">
              <div className="text-xs text-gray-500 mb-3">Local actions log (stored in this browser).</div>

              {activity.length === 0 ? (
                <div className="text-sm text-gray-600">No recent activity yet.</div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                  {activity.map((a, idx) => (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-sm font-semibold text-gray-900">{a.action}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="text-gray-500">User:</span> <b>{a.userId || "—"}</b>
                      </div>
                      {a?.meta?.username ? <div className="text-xs text-gray-600 mt-1">@{a.meta.username}</div> : null}
                      {a?.meta?.email ? <div className="text-xs text-gray-600 mt-1">{a.meta.email}</div> : null}
                      {a?.meta?.role ? <div className="text-xs text-gray-600 mt-1">role: <b>{a.meta.role}</b></div> : null}
                      <div className="text-[11px] text-gray-500 mt-2">{fmtDate(a.at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Permissions: admin = all, superadmin = "*". Use “Apply defaults” to set permissions from role.
        </div>
      </div>
    </div>
  );
}
