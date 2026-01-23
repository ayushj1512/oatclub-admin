const safeNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

const parseDate = (d) => {
  const dt = d ? new Date(d) : null;
  return dt && !isNaN(dt.getTime()) ? dt : null;
};

const formatDay = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

export function buildAllCustomersAnalyticsVM(customers = [], { rangeDays = 30 } = {}) {
  const list = Array.isArray(customers) ? customers : [];

  const rangeStart = daysAgo(rangeDays);

  let totalCustomers = list.length;

  let totalOrders = 0;
  let totalSpend = 0;

  let totalWishlist = 0;
  let totalCartAdds = 0;

  // timeseries maps
  const spendByDay = {};
  const customersByDay = {};
  const cartAddsByDay = {};

  // top customers
  const customerSpendRows = [];
  const customerActivityRows = [];

  list.forEach((c) => {
    const orders = Array.isArray(c.orders) ? c.orders : [];
    const wishlist = Array.isArray(c.wishlist) ? c.wishlist : [];
    const cartAdds = Array.isArray(c.cartAdds) ? c.cartAdds : [];

    // totals
    totalOrders += orders.length;

    const spend = orders.reduce((sum, o) => sum + safeNum(o.total || o.amount || o.grandTotal), 0);
    totalSpend += spend;

    totalWishlist += wishlist.length;
    totalCartAdds += cartAdds.length;

    // top customers by spend
    customerSpendRows.push({
      id: c._id,
      name: c.name || c.fullName || "—",
      email: c.email || "—",
      spend,
      orders: orders.length,
    });

    // activity score
    const activity = wishlist.length + cartAdds.length;
    customerActivityRows.push({
      id: c._id,
      name: c.name || c.fullName || "—",
      email: c.email || "—",
      wishlist: wishlist.length,
      cartAdds: cartAdds.length,
      activity,
    });

    // new customers over time (createdAt)
    const createdAt = parseDate(c.createdAt);
    if (createdAt && createdAt >= rangeStart) {
      const day = formatDay(createdAt);
      customersByDay[day] = (customersByDay[day] || 0) + 1;
    }

    // spend over time
    orders.forEach((o) => {
      const dt = parseDate(o.createdAt || o.date);
      if (!dt || dt < rangeStart) return;
      const day = formatDay(dt);
      spendByDay[day] = (spendByDay[day] || 0) + safeNum(o.total || o.amount || o.grandTotal);
    });

    // cartAdds over time
    cartAdds.forEach((x) => {
      const dt = parseDate(x.createdAt);
      if (!dt || dt < rangeStart) return;
      const day = formatDay(dt);
      cartAddsByDay[day] = (cartAddsByDay[day] || 0) + 1;
    });
  });

  // build series sorted
  const spendSeries = Object.entries(spendByDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, spend]) => ({ date, spend: Number(spend.toFixed(2)) }));

  const newCustomersSeries = Object.entries(customersByDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, customers: count }));

  const cartAddsSeries = Object.entries(cartAddsByDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, cartAdds]) => ({ date, cartAdds }));

  // derived metrics
  const aov = totalOrders ? totalSpend / totalOrders : 0;
  const avgWishlistPerCustomer = totalCustomers ? totalWishlist / totalCustomers : 0;
  const avgCartAddsPerCustomer = totalCustomers ? totalCartAdds / totalCustomers : 0;

  const topBySpend = customerSpendRows
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  const topByActivity = customerActivityRows
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 10);

  return {
    stats: {
      totalCustomers,
      totalOrders,
      totalSpend,
      aov,
      totalWishlist,
      totalCartAdds,
      avgWishlistPerCustomer,
      avgCartAddsPerCustomer,
      rangeDays,
    },
    series: {
      spendSeries,
      newCustomersSeries,
      cartAddsSeries,
      compareSeries: [
        { name: "Wishlist", value: totalWishlist },
        { name: "Cart Adds", value: totalCartAdds },
      ],
    },
    tables: {
      topBySpend,
      topByActivity,
    },
    raw: { customers: list },
  };
}
