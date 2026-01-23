export default function AllCustomersInfo({ vm }) {
  const topSpend = vm.tables.topBySpend || [];
  const topActivity = vm.tables.topByActivity || [];
  const money = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

  const Table = ({ title, subtitle, dot = "bg-gray-300", rows, cols }) => (
    <div className="rounded-3xl bg-white/90 border border-gray-100 shadow-sm p-4 md:p-5 overflow-x-auto">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
          </div>
          {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
        </div>
        <div className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-100">Table</div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-3" />

      <table className="min-w-[720px] w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            {cols.map((c) => <th key={c.key} className="py-2 pr-3 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length ? rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/70">
              {cols.map((c) => <td key={c.key} className="py-2.5 pr-3 text-gray-800">{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}
            </tr>
          )) : (
            <tr><td className="py-4 text-gray-500" colSpan={cols.length}>No data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900">Information</h2>
          <p className="text-sm text-gray-600">Top customers & activity insights.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500"><span className="h-2.5 w-2.5 rounded-full bg-rose-200" /><span className="h-2.5 w-2.5 rounded-full bg-sky-200" /><span className="ml-1">pastel accents</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Table title="Top Customers by Spend" subtitle="Highest spenders" dot="bg-rose-200" rows={topSpend} cols={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "orders", label: "Orders" }, { key: "spend", label: "Spend", render: (r) => money(r.spend) }]} />
        <Table title="Most Active Customers" subtitle="Wishlist + CartAdds" dot="bg-sky-200" rows={topActivity} cols={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "wishlist", label: "Wishlist" }, { key: "cartAdds", label: "Cart Adds" }, { key: "activity", label: "Activity Score" }]} />
      </div>
    </section>
  );
}
