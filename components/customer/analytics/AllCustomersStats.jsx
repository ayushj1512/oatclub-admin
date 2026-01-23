export default function AllCustomersStats({ vm }) {
  const s = vm.stats;

  const fmtMoney = (n) => `₹${(Number(n) || 0).toFixed(2)}`;
  const fmtNum = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");

  const cards = [
    {
      label: "Total Customers",
      value: fmtNum(s.totalCustomers),
      sub: "All customers in DB",
      dot: "bg-sky-200",
      chip: "bg-sky-50 text-sky-700",
    },
    {
      label: "Total Orders",
      value: fmtNum(s.totalOrders),
      sub: "Combined orders",
      dot: "bg-emerald-200",
      chip: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total Spend",
      value: fmtMoney(s.totalSpend),
      sub: "Gross revenue",
      dot: "bg-rose-200",
      chip: "bg-rose-50 text-rose-700",
    },
    {
      label: "AOV",
      value: fmtMoney(s.aov),
      sub: "Avg order value",
      dot: "bg-amber-200",
      chip: "bg-amber-50 text-amber-700",
    },
    {
      label: "Wishlist",
      value: fmtNum(s.totalWishlist),
      sub: "Total wishlisted items",
      dot: "bg-violet-200",
      chip: "bg-violet-50 text-violet-700",
    },
    {
      label: "Cart Adds",
      value: fmtNum(s.totalCartAdds),
      sub: "Add-to-cart actions",
      dot: "bg-teal-200",
      chip: "bg-teal-50 text-teal-700",
    },
    {
      label: "Avg Wishlist / Customer",
      value: (Number(s.avgWishlistPerCustomer) || 0).toFixed(2),
      sub: "Interest density",
      dot: "bg-fuchsia-200",
      chip: "bg-fuchsia-50 text-fuchsia-700",
    },
    {
      label: "Avg CartAdds / Customer",
      value: (Number(s.avgCartAddsPerCustomer) || 0).toFixed(2),
      sub: "Intent density",
      dot: "bg-lime-200",
      chip: "bg-lime-50 text-lime-700",
    },
  ];

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900">
            Stats
          </h2>
          <p className="text-sm text-gray-600">
            Key metrics for the selected time range.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 border border-gray-100">
          <span className="h-2 w-2 rounded-full bg-gray-900" />
          <span className="text-xs text-gray-600">
            Range: <span className="font-semibold text-gray-900">last {s.rangeDays} days</span>
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="
              group rounded-2xl bg-white/90 backdrop-blur
              border border-gray-100 shadow-sm
              p-4 transition
              hover:shadow-md hover:-translate-y-[1px]
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <div className="text-xs font-medium text-gray-600 truncate">
                    {c.label}
                  </div>
                </div>
                <div className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-gray-900">
                  {c.value}
                </div>
                <div className="mt-1 text-xs text-gray-500">{c.sub}</div>
              </div>

              <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.chip}`}>
                KPI
              </div>
            </div>

            {/* subtle pastel underline */}
            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
          </div>
        ))}
      </div>
    </section>
  );
}
