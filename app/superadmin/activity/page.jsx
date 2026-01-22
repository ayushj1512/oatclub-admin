// app/superadmin/activity/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  ArrowLeft,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Hash,
  AtSign,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  KeyRound,
  Pencil,
  Plus,
  ToggleRight,
} from "lucide-react";

const SESSION_KEY = "miray_superadmin_unlocked";
const ACTIVITY_KEY = "miray_superadmin_user_activity";
const PIN_ACTIVITY_KEY = "miray_superadmin_vault_activity";

const cx = (...a) => a.filter(Boolean).join(" ");

const safeJsonParse = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const ACTION_MAP = {
  // panel
  CREATED_ADMIN_USER: { label: "Created User", icon: Plus, tone: "blue" },
  UPDATED_ADMIN_USER: { label: "Updated User", icon: Pencil, tone: "blue" },
  DELETED_ADMIN_USER: { label: "Deleted User", icon: Trash2, tone: "red" },
  TOGGLED_ACTIVE: { label: "Toggled Active", icon: ToggleRight, tone: "amber" },
  UPDATED_PASSWORD: { label: "Password Updated", icon: KeyRound, tone: "amber" },
  UNLOCKED_USER: { label: "Unlocked User", icon: Unlock, tone: "emerald" },

  // legacy (older keys)
  CREATED_USER: { label: "Created User", icon: Plus, tone: "blue" },
  UPDATED_USER: { label: "Updated User", icon: Pencil, tone: "blue" },
  DELETED_USER: { label: "Deleted User", icon: Trash2, tone: "red" },

  // vault
  VAULT_UNLOCKED: { label: "Vault Unlocked", icon: Unlock, tone: "emerald" },
  VAULT_LOCKED: { label: "Vault Locked", icon: Lock, tone: "gray" },
  VAULT_NAV_FAIL: { label: "Vault Navigation Failed", icon: AlertTriangle, tone: "red" },
  VAULT_WRONG_PIN: { label: "Wrong PIN", icon: AlertTriangle, tone: "red" },
};

const toneClasses = (tone) => {
  switch (tone) {
    case "emerald":
      return { pill: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" };
    case "red":
      return { pill: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500" };
    case "amber":
      return { pill: "bg-amber-50 text-amber-900 border-amber-200", dot: "bg-amber-500" };
    case "blue":
      return { pill: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-600" };
    default:
      return { pill: "bg-white text-gray-800 border-gray-200", dot: "bg-gray-400" };
  }
};

const normalize = (entry) => {
  const action = String(entry?.action || entry?.type || "UNKNOWN").toUpperCase();
  const info = ACTION_MAP[action] || {
    label: action.replaceAll("_", " "),
    icon: Activity,
    tone: "gray",
  };
  return { action, info };
};

const readLogs = (tab) => {
  const panel = safeJsonParse(localStorage.getItem(ACTIVITY_KEY) || "[]", []);
  const vault = safeJsonParse(localStorage.getItem(PIN_ACTIVITY_KEY) || "[]", []);

  const tag = (arr, source) => (Array.isArray(arr) ? arr : []).map((x) => ({ ...x, __source: source }));

  const combined =
    tab === "panel"
      ? tag(panel, "panel")
      : tab === "vault"
      ? tag(vault, "vault")
      : [...tag(panel, "panel"), ...tag(vault, "vault")];

  combined.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return combined;
};

export default function SuperAdminActivityPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("panel"); // panel | vault | all
  const [q, setQ] = useState("");
  const [tone, setTone] = useState(""); // "" | blue | amber | red | emerald | gray
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!ok) return router.replace("/superadmin");
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    setLoading(true);
    try {
      setItems(readLogs(tab));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tab]);

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    return items.filter((it) => {
      const meta = it?.meta || {};
      const { info } = normalize(it);

      if (tone && info.tone !== tone) return false;
      if (!qq) return true;

      const hay = [
        it.action,
        it.type,
        it.userId,
        it.__source,
        it.at,
        meta.username,
        meta.email,
        meta.role,
        meta.isActive !== undefined ? String(meta.isActive) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [items, q, tone]);

  const clear = () => {
    if (!confirm("Clear activity logs from this browser?")) return;
    if (tab === "panel") localStorage.removeItem(ACTIVITY_KEY);
    if (tab === "vault") localStorage.removeItem(PIN_ACTIVITY_KEY);
    if (tab === "all") {
      localStorage.removeItem(ACTIVITY_KEY);
      localStorage.removeItem(PIN_ACTIVITY_KEY);
    }
    load();
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-blue-600/15 blur-[110px] rounded-full" />
        <div className="absolute -bottom-44 -right-44 w-[620px] h-[620px] bg-sky-400/15 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>

      <div className="px-5 py-10 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Shield className="text-blue-700" size={20} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Superadmin</div>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <Activity className="text-blue-700" size={22} />
                Activity Log
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/superadmin/manage")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={clear}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 transition text-white font-semibold"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex items-center gap-2">
              <Tab active={tab === "panel"} onClick={() => setTab("panel")}>
                Panel
              </Tab>
              <Tab active={tab === "vault"} onClick={() => setTab("vault")}>
                Vault
              </Tab>
              <Tab active={tab === "all"} onClick={() => setTab("all")}>
                All
              </Tab>
            </div>

            <div className="flex-1" />

            <div className="w-full lg:w-[520px]">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Search</label>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                <Search size={16} className="text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search action, userId, username, email..."
                  className="w-full outline-none bg-transparent text-sm"
                />
              </div>
            </div>

            <div className="w-full lg:w-56">
              <label className="text-sm font-semibold text-gray-800 block mb-2">Filter</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200">
                  <Filter size={16} className="text-gray-600" />
                </div>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm outline-none"
                >
                  <option value="">All</option>
                  <option value="blue">Blue</option>
                  <option value="amber">Amber</option>
                  <option value="emerald">Green</option>
                  <option value="red">Red</option>
                  <option value="gray">Gray</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 flex items-center justify-between flex-wrap gap-2">
            <span>
              Showing: <b>{filtered.length}</b> / <b>{items.length}</b>
            </span>
            <span className="text-xs text-gray-500">
              Stored in <b>this browser</b> (localStorage)
            </span>
          </div>
        </div>

        {/* List */}
        <div className="mt-6 rounded-3xl bg-white/80 backdrop-blur border border-blue-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 flex items-center justify-between">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-700" />
              Timeline
            </div>
            <div className="text-xs text-gray-500">Newest first</div>
          </div>

          {loading ? (
            <div className="p-5 text-gray-600">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-5 text-gray-600">No activity found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence initial={false}>
                {filtered.map((a, idx) => {
                  const { info } = normalize(a);
                  const C = toneClasses(info.tone);
                  const Icon = info.icon;

                  const userId = a?.userId || "—";
                  const username = a?.meta?.username;
                  const email = a?.meta?.email;
                  const role = a?.meta?.role;
                  const isActive = a?.meta?.isActive;

                  return (
                    <motion.div
                      key={`${a.at || "na"}_${a.action || a.type || "unknown"}_${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.16 }}
                      className="p-4 md:p-5 hover:bg-blue-50/40 transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cx(
                                "inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border",
                                C.pill
                              )}
                            >
                              <span className={cx("w-2 h-2 rounded-full", C.dot)} />
                              <Icon size={14} />
                              <span className="font-semibold">{info.label}</span>
                            </span>

                            <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                              source: <b>{a.__source}</b>
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            <span className="inline-flex items-center gap-2">
                              <Hash size={14} className="text-gray-500" />
                              <b>{userId}</b>
                            </span>

                            {username ? (
                              <span className="inline-flex items-center gap-2">
                                <AtSign size={14} className="text-gray-500" />
                                <b>@{username}</b>
                              </span>
                            ) : null}

                            {email ? (
                              <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                                {email}
                              </span>
                            ) : null}

                            {role ? (
                              <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                                role: <b>{role}</b>
                              </span>
                            ) : null}

                            {isActive !== undefined ? (
                              <span
                                className={cx(
                                  "inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border",
                                  isActive
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-red-50 border-red-200 text-red-800"
                                )}
                              >
                                {isActive ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                          <Clock size={14} />
                          <span>{fmtDate(a.at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Vault events are optional. If you log them, store to <b>{PIN_ACTIVITY_KEY}</b> with fields{" "}
          <b>{"{ action, at, userId?, meta? }"}</b>.
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "px-4 py-2 rounded-2xl border text-sm font-semibold transition",
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}
