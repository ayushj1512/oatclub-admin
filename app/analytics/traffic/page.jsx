import React from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  ArrowRight,
  Globe,
  MousePointerClick,
  Search,
  Users,
  Megaphone,
  MessageCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

/* ---------------- helpers ---------------- */
async function safeJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: String(e?.message || e) };
  }
}

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

const formatInt = (n) => {
  const x = safeNum(n);
  if (x == null) return "—";
  return new Intl.NumberFormat("en-IN").format(x);
};

const Chip = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-700">
    {children}
  </span>
);

const Card = ({ children, href, className = "" }) => {
  const base =
    "rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 hover:shadow-md transition";
  if (!href) return <div className={`${base} ${className}`}>{children}</div>;
  return (
    <Link href={href} className={`${base} ${className}`}>
      {children}
    </Link>
  );
};

const Stat = ({ icon: Icon, label, value, hint, href }) => (
  <Card href={href} className="min-w-[260px] flex-1">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {hint ? <p className="text-xs text-gray-500 mt-2">{hint}</p> : null}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
    </div>

    {href ? (
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Open</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    ) : (
      <p className="text-xs text-gray-500 mt-3">Live snapshot</p>
    )}
  </Card>
);

function asArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.queries)) return payload.queries;
  return [];
}

function topBy(list, getKey, limit = 6) {
  const m = new Map();
  for (const it of list) {
    const k = String(getKey(it) || "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default async function AnalyticsTrafficPage() {
  if (!API) {
    return (
      <div className="p-6 w-full">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Traffic</h1>
          <p className="text-sm text-gray-600 mt-2">
            Missing API base URL. Set{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">NEXT_PUBLIC_API_URL</code>{" "}
            (or{" "}
            <code className="px-2 py-1 bg-gray-50 rounded">API_URL</code>).
          </p>
        </div>
      </div>
    );
  }

  const AUTO_REFRESH_SECONDS = 10;
  const now = new Date();

  // Primary traffic endpoints (if you have them)
  const trafficRes = await safeJson(`${API}/api/analytics/traffic`);
  const utmRes = await safeJson(`${API}/api/analytics/utm`);

  // Fallback signals from existing routes
  const queriesRes = await safeJson(`${API}/api/queries?limit=200`);
  const supportRes = await safeJson(`${API}/api/support?limit=200`);

  const warnings = [];
  const warn = (label, r) => {
    if (!r?.ok) warnings.push(`${label} failed (${r?.status || "no status"})`);
  };

  // only warn if EVERYTHING is missing
  const anyTraffic =
    trafficRes.ok || utmRes.ok || queriesRes.ok || supportRes.ok;

  if (!anyTraffic) {
    warn("Traffic", trafficRes);
    warn("UTM", utmRes);
    warn("Queries", queriesRes);
    warn("Support", supportRes);
  }

  // If traffic endpoint exists, read it
  // Expected shape example:
  // { sessions, users, pageviews, topPages:[{path,count}], topReferrers:[...], topLocations:[...] }
  const t = trafficRes.ok ? (trafficRes.json || {}) : {};

  const sessions = safeNum(t.sessions);
  const users = safeNum(t.users);
  const pageviews = safeNum(t.pageviews);
  const clicks = safeNum(t.clicks);

  // UTM endpoint (optional)
  // Expected shape example: { utm:[{source, medium, campaign, count}] }
  const utm = utmRes.ok ? (utmRes.json || {}) : {};
  const utmList =
    Array.isArray(utm.utm) ? utm.utm : Array.isArray(utm.data) ? utm.data : [];

  // Queries fallback = “what users searched”
  const queriesList = asArray(queriesRes.ok ? queriesRes.json : null);
  const topSearches = topBy(
    queriesList,
    (q) => q.query || q.q || q.search || q.keyword || q.text,
    8
  );

  // Support fallback = “inbound volume”
  const supportList = asArray(supportRes.ok ? supportRes.json : null);

  // Simple derived metrics
  const searchesCount = queriesRes.ok ? queriesList.length : null;
  const ticketsCount = supportRes.ok ? supportList.length : null;

  // Pretty lists if API provides them
  const topPages = Array.isArray(t.topPages) ? t.topPages : [];
  const topReferrers = Array.isArray(t.topReferrers) ? t.topReferrers : [];
  const topLocations = Array.isArray(t.topLocations) ? t.topLocations : [];

  return (
    <div className="p-6 w-full">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Traffic</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time traffic · Auto refresh every {AUTO_REFRESH_SECONDS}s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip>
            <Activity className="w-4 h-4 text-gray-600" />
            Live
          </Chip>
          <Chip>
            <RefreshCw className="w-4 h-4 text-gray-600" />
            Updated: <span className="font-semibold">{now.toLocaleString("en-IN")}</span>
          </Chip>
        </div>
      </div>

      {/* If everything missing, show warnings */}
      {!anyTraffic && warnings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900">No traffic endpoints found yet.</p>
          <ul className="list-disc ml-5 mt-1 text-sm text-amber-800">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-800 mt-2">
            Add backend endpoints like <code className="px-2 py-0.5 bg-white/70 rounded">/api/analytics/traffic</code> and{" "}
            <code className="px-2 py-0.5 bg-white/70 rounded">/api/analytics/utm</code> for full traffic analytics.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <Stat
          icon={Globe}
          label="Sessions"
          value={formatInt(sessions)}
          hint={sessions == null ? "Provide /api/analytics/traffic.sessions" : "All sessions (live)"}
        />
        <Stat
          icon={Users}
          label="Users"
          value={formatInt(users)}
          hint={users == null ? "Provide /api/analytics/traffic.users" : "Unique users (live)"}
        />
        <Stat
          icon={MousePointerClick}
          label="Pageviews"
          value={formatInt(pageviews)}
          hint={pageviews == null ? "Provide /api/analytics/traffic.pageviews" : "Total page views (live)"}
        />
        <Stat
          icon={Megaphone}
          label="UTM Campaign Rows"
          value={utmRes.ok ? formatInt(utmList.length) : "—"}
          hint={utmRes.ok ? "From /api/analytics/utm" : "No UTM endpoint detected"}
        />
        <Stat
          icon={Search}
          label="Search Queries (last 200)"
          value={formatInt(searchesCount)}
          href="/analytics/funnel"
          hint={queriesRes.ok ? "From /api/queries?limit=200" : "Fallback signal when traffic isn't available"}
        />
        <Stat
          icon={MessageCircle}
          label="Support Tickets (last 200)"
          value={formatInt(ticketsCount)}
          href="/customer-support/all"
          hint={supportRes.ok ? "From /api/support?limit=200" : "Not available"}
        />
      </div>

      {/* Lists */}
      <div className="mt-6 flex flex-wrap gap-4">
        <Card className="flex-[2] min-w-[360px]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top Searches (fallback)</h2>
            <Link href="/analytics/funnel" className="text-xs text-blue-700 hover:underline">
              Funnel →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {topSearches.length ? (
              topSearches.map(([q, c]) => (
                <span
                  key={q}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-50 ring-1 ring-black/5 px-3 py-1 text-xs text-gray-800"
                >
                  {q}
                  <span className="font-semibold">{c}</span>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                {queriesRes.ok ? "No query text field found in payload." : "No /api/queries data available."}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            This section uses <code className="px-2 py-0.5 bg-gray-50 rounded">/api/queries</code> as a fallback “traffic intent” signal.
          </p>
        </Card>

        <Card className="flex-1 min-w-[360px]">
          <h2 className="text-sm font-semibold text-gray-900">If you add traffic endpoint</h2>

          <div className="mt-4 text-sm text-gray-600 space-y-2">
            <p>
              Create <code className="px-2 py-0.5 bg-gray-50 rounded">/api/analytics/traffic</code> returning:
            </p>
            <pre className="text-xs bg-gray-50 ring-1 ring-black/5 rounded-2xl p-4 overflow-auto">
{`{
  "sessions": 1234,
  "users": 890,
  "pageviews": 4567,
  "clicks": 321,
  "topPages": [{ "path": "/product/...", "count": 120 }],
  "topReferrers": [{ "ref": "google", "count": 340 }],
  "topLocations": [{ "city": "Delhi", "count": 210 }]
}`}
            </pre>
            <p className="text-xs text-gray-500">
              Then this page will automatically start showing real traffic.
            </p>
          </div>
        </Card>
      </div>

      {/* Optional: show lists if traffic API provides them */}
      {(topPages.length || topReferrers.length || topLocations.length) && (
        <div className="mt-6 flex flex-wrap gap-4">
          {topPages.length > 0 && (
            <Card className="flex-1 min-w-[360px]">
              <h2 className="text-sm font-semibold text-gray-900">Top Pages</h2>
              <div className="mt-3 space-y-2">
                {topPages.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 truncate">{p.path || p.url || "—"}</span>
                    <span className="text-gray-500 font-semibold">{formatInt(p.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {topReferrers.length > 0 && (
            <Card className="flex-1 min-w-[360px]">
              <h2 className="text-sm font-semibold text-gray-900">Top Referrers</h2>
              <div className="mt-3 space-y-2">
                {topReferrers.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 truncate">{r.ref || r.source || "—"}</span>
                    <span className="text-gray-500 font-semibold">{formatInt(r.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {topLocations.length > 0 && (
            <Card className="flex-1 min-w-[360px]">
              <h2 className="text-sm font-semibold text-gray-900">Top Locations</h2>
              <div className="mt-3 space-y-2">
                {topLocations.slice(0, 8).map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 truncate">
                      {l.city || l.state || l.country || l.location || "—"}
                    </span>
                    <span className="text-gray-500 font-semibold">{formatInt(l.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
