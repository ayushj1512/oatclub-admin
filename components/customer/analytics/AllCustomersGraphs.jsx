"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const fmtMoney = (n) => `₹${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (n) => (Number(n) || 0).toLocaleString();
const fmtDate = (iso) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso || ""; return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }); };
const fmtDateLong = (iso) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso || ""; return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); };
const getDomain = (s = []) => { if (!s.length) return { min: 0, max: 1 }; const vals = s.map((x) => Number(Object.values(x)[1]) || 0); const min = Math.min(...vals); const max = Math.max(...vals); if (min === max) return { min: 0, max: max || 1 }; return { min: 0, max: Math.ceil(max * 1.15) }; };
const tickEvery = (n) => { if (n <= 10) return 0; if (n <= 20) return 1; if (n <= 35) return 2; if (n <= 60) return 4; return 6; };
const summarize = (series = [], key) => { if (!series.length) return { from: "—", to: "—", total: 0, avg: 0, peak: 0 }; const total = series.reduce((s, r) => s + (Number(r[key]) || 0), 0); const peak = Math.max(...series.map((r) => Number(r[key]) || 0)); return { from: fmtDateLong(series[0].date), to: fmtDateLong(series[series.length - 1].date), total, avg: total / Math.max(series.length, 1), peak }; };

const Card = ({ title, subtitle, dot = "bg-gray-300", metaLeft, metaRight, children }) => (
  <div className="rounded-3xl bg-white/90 border border-gray-100 shadow-sm p-4 md:p-5">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
        </div>
        {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
        {(metaLeft || metaRight) ? <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500"><span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-1">{metaLeft}</span><span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-1">{metaRight}</span></div> : null}
      </div>
      <div className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-100">Chart</div>
    </div>
    <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-3" />
    {children}
  </div>
);

const Empty = ({ title }) => <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-500">No data for <span className="font-medium text-gray-700">{title}</span>.</div>;

const CustomTooltip = ({ active, payload, label, kind }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.value ?? 0;
  const val = kind === "money" ? fmtMoney(p) : fmtNum(p);
  return <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-3 py-2 text-xs text-gray-700"><div className="font-semibold text-gray-900">{fmtDateLong(label)}</div><div className="mt-1">{val}</div></div>;
};

export default function AllCustomersGraphs({ vm }) {
  const { spendSeries = [], newCustomersSeries = [], cartAddsSeries = [], compareSeries = [] } = vm.series || {};
  const spendMeta = summarize(spendSeries, "spend");
  const custMeta = summarize(newCustomersSeries, "customers");
  const cartMeta = summarize(cartAddsSeries, "cartAdds");
  const spendDomain = getDomain(spendSeries.map((x) => ({ date: x.date, v: x.spend })));
  const custDomain = getDomain(newCustomersSeries.map((x) => ({ date: x.date, v: x.customers })));
  const cartDomain = getDomain(cartAddsSeries.map((x) => ({ date: x.date, v: x.cartAdds })));
  const spendInterval = tickEvery(spendSeries.length);
  const custInterval = tickEvery(newCustomersSeries.length);
  const cartInterval = tickEvery(cartAddsSeries.length);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900">Graphs</h2>
          <p className="text-sm text-gray-600">Aligned dates, clean ticks, and richer tooltips.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500"><span className="h-2.5 w-2.5 rounded-full bg-rose-200" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-200" /><span className="h-2.5 w-2.5 rounded-full bg-sky-200" /><span className="h-2.5 w-2.5 rounded-full bg-violet-200" /><span className="ml-1">pastel accents</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Spend Over Time" subtitle="Daily revenue trend" dot="bg-rose-200" metaLeft={`${spendMeta.from} → ${spendMeta.to}`} metaRight={`Total ${fmtMoney(spendMeta.total)} • Avg ${fmtMoney(spendMeta.avg)}`}>
          {spendSeries.length ? (
            <div className="h-72 rounded-2xl bg-gradient-to-b from-white to-gray-50/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendSeries} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} interval={spendInterval} tick={{ fontSize: 12 }} tickMargin={8} axisLine={false} minTickGap={18} />
                  <YAxis domain={[0, spendDomain.max]} tick={{ fontSize: 12 }} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip content={<CustomTooltip kind="money" />} />
                  <Line type="monotone" dataKey="spend" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="Spend Over Time" />}
        </Card>

        <Card title="New Customers Over Time" subtitle="Daily new registrations" dot="bg-emerald-200" metaLeft={`${custMeta.from} → ${custMeta.to}`} metaRight={`Total ${fmtNum(custMeta.total)} • Peak ${fmtNum(custMeta.peak)}`}>
          {newCustomersSeries.length ? (
            <div className="h-72 rounded-2xl bg-gradient-to-b from-white to-gray-50/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newCustomersSeries} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} interval={custInterval} tick={{ fontSize: 12 }} tickMargin={8} axisLine={false} minTickGap={18} />
                  <YAxis domain={[0, custDomain.max]} tick={{ fontSize: 12 }} allowDecimals={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="customers" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="New Customers Over Time" />}
        </Card>

        <Card title="Cart Adds Over Time" subtitle="Daily add-to-cart actions" dot="bg-sky-200" metaLeft={`${cartMeta.from} → ${cartMeta.to}`} metaRight={`Total ${fmtNum(cartMeta.total)} • Peak ${fmtNum(cartMeta.peak)}`}>
          {cartAddsSeries.length ? (
            <div className="h-72 rounded-2xl bg-gradient-to-b from-white to-gray-50/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cartAddsSeries} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} interval={cartInterval} tick={{ fontSize: 12 }} tickMargin={8} axisLine={false} minTickGap={18} />
                  <YAxis domain={[0, cartDomain.max]} tick={{ fontSize: 12 }} allowDecimals={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cartAdds" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="Cart Adds Over Time" />}
        </Card>

        <Card title="Wishlist vs Cart Adds" subtitle="Intent comparison" dot="bg-violet-200" metaLeft="All-time totals" metaRight={`${compareSeries?.[0]?.name || "Wishlist"} ${fmtNum(compareSeries?.[0]?.value)} • ${compareSeries?.[1]?.name || "Cart Adds"} ${fmtNum(compareSeries?.[1]?.value)}`}>
          {compareSeries.length ? (
            <div className="h-72 rounded-2xl bg-gradient-to-b from-white to-gray-50/60 p-2 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={compareSeries} dataKey="value" nameKey="name" outerRadius={95} label={(p) => `${p.name}: ${fmtNum(p.value)}`}>
                    {compareSeries.map((_, idx) => <Cell key={idx} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="Wishlist vs Cart Adds" />}
        </Card>
      </div>
    </section>
  );
}
