"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  ShieldCheck,
  LogOut,
  Lock,
  Unlock,
  UserRound,
} from "lucide-react";
import { useAdminUsersVerifyStore } from "@/store/adminUsersStore";
import useLoginStore from "@/store/useLoginStore";

const roles = [
  "all",
  "superadmin",
  "admin",
  "staff",
  "customer_care",
  "influencer",
  "viewer",
];

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
};

export default function ManageSessionPage() {
  const currentAdmin = useLoginStore((state) => state.admin);

  const {
    users,
    loading,
    actionLoading,
    error,
    fetchUsers,
    forceLogoutUser,
    unlockUser,
    updateUser,
    clearError,
  } = useAdminUsersVerifyStore();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) => {
      const term = search.toLowerCase().trim();

      const matchesSearch =
        !term ||
        user.username?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.fullName?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term);

      const matchesRole = role === "all" || user.role === role;

      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const handleForceLogout = async (user) => {
    if (!user?._id) return;

    const ok = window.confirm(
      `Force logout ${user.fullName || user.username || user.email}?`
    );

    if (!ok) return;

    await forceLogoutUser(user._id);
  };

  const handleToggleActive = async (user) => {
    if (!user?._id) return;

    const nextActive = !user.isActive;

    const ok = window.confirm(
      nextActive
        ? `Enable ${user.username}?`
        : `Disable ${user.username}? This will logout their active session.`
    );

    if (!ok) return;

    await updateUser(user._id, { isActive: nextActive });
  };

  const handleUnlock = async (user) => {
    if (!user?._id) return;
    await unlockUser(user._id);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            <ShieldCheck size={14} />
            Superadmin Control
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
            Manage Sessions
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Control admin access, disable accounts, unlock locked users, and
            force logout active sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      <section className="mb-5 grid gap-3 rounded-[2rem] bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={search}
            onChange={(e) => {
              clearError?.();
              setSearch(e.target.value);
            }}
            placeholder="Search by name, username, email, phone..."
            className="w-full rounded-2xl bg-[var(--surface-soft)] py-3 pl-11 pr-4 text-sm outline-none transition focus:bg-white focus:shadow-sm"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm capitalize outline-none transition focus:bg-white focus:shadow-sm"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All roles" : item.replace("_", " ")}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1.4fr] gap-4 bg-[var(--surface-soft)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] lg:grid">
          <div>User</div>
          <div>Role</div>
          <div>Status</div>
          <div>Last Login</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">
            Loading users...
          </div>
        ) : filteredUsers.length ? (
          <div className="divide-y divide-black/5">
            {filteredUsers.map((user) => {
              const isSelf = String(user._id) === String(currentAdmin?._id);
              const isLocked =
                user.lockUntil && new Date(user.lockUntil) > new Date();

              return (
                <article
                  key={user._id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-[var(--surface-soft)] lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.4fr] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)]">
                      {user.profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.profileImage}
                          alt={user.fullName || user.username}
                          className="size-11 rounded-2xl object-cover"
                        />
                      ) : (
                        <UserRound size={19} className="text-[var(--text-muted)]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {user.fullName || user.username || "Admin User"}
                        {isSelf ? (
                          <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {user.email}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium capitalize text-[var(--text)]">
                      {user.role?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Active" : "Disabled"}
                    </span>

                    {isLocked ? (
                      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        Locked
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm text-[var(--text-muted)]">
                    {formatDate(user.lastLogin)}
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleUnlock(user)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-soft)] disabled:opacity-60"
                      >
                        <Unlock size={14} />
                        Unlock
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleForceLogout(user)}
                      disabled={actionLoading || isSelf}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading || isSelf}
                      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.isActive
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {user.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                      {user.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">
            No admin users found.
          </div>
        )}
      </section>
    </main>
  );
}