"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const router = useRouter();
  const BACKEND = process.env.NEXT_PUBLIC_API_URL;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters, Sort
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // active/inactive
  const [sortBy, setSortBy] = useState("date"); // date | name | email

  // Counts
  const [apiTotal, setApiTotal] = useState(null);

  // UI state
  const [errorMsg, setErrorMsg] = useState("");

  // ----------------------------
  // Helpers
  // ----------------------------
  const normalizeList = (data) => {
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.customers)
      ? data.customers
      : Array.isArray(data?.data)
      ? data.data
      : [];
  };

  const pickTotal = (data, fallbackLen) => {
    const t =
      data?.total ??
      data?.count ??
      data?.meta?.total ??
      data?.pagination?.total ??
      data?.data?.total ??
      data?.pagination?.count;

    return Number.isFinite(t) ? t : fallbackLen;
  };

  const pickLimit = (data, fallback = 20) => {
    const l =
      data?.limit ??
      data?.pageSize ??
      data?.perPage ??
      data?.pagination?.limit ??
      data?.pagination?.pageSize ??
      data?.meta?.limit ??
      data?.meta?.pageSize;

    return Number.isFinite(l) ? l : fallback;
  };

  const pickPage = (data, fallback = 1) => {
    const p =
      data?.page ??
      data?.pagination?.page ??
      data?.meta?.page ??
      data?.currentPage ??
      data?.pagination?.currentPage;

    return Number.isFinite(p) ? p : fallback;
  };

  const pickTotalPages = (data) => {
    const tp =
      data?.totalPages ??
      data?.pages ??
      data?.pagination?.totalPages ??
      data?.meta?.totalPages ??
      data?.pagination?.pages;

    return Number.isFinite(tp) ? tp : null;
  };

  const pickNextCursor = (data) => {
    return (
      data?.nextCursor ??
      data?.nextPageToken ??
      data?.pagination?.nextCursor ??
      data?.meta?.nextCursor ??
      data?.data?.nextCursor ??
      null
    );
  };

  const uniqueById = (arr) =>
    Array.from(new Map(arr.map((c) => [c?._id, c])).values()).filter(Boolean);

  const buildUrl = (path, paramsObj = {}) => {
    const url = new URL(path);
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    return url.toString();
  };

  // ----------------------------
  // Fetch customers (handles limit=20 issue)
  // ----------------------------
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      if (!BACKEND) {
        throw new Error("NEXT_PUBLIC_API_URL is missing. Please set it in env.");
      }

      const base = `${BACKEND}/api/customers`;

      // ✅ Strategy 1: Try requesting a large limit (common APIs support this)
      const bigLimitCandidates = [
        { limit: 1000 },
        { pageSize: 1000 },
        { perPage: 1000 },
        { per_page: 1000 },
        { size: 1000 },
        { take: 1000 },
      ];

      let firstData = null;
      let list = [];
      let total = null;

      for (const params of bigLimitCandidates) {
        const url = buildUrl(base, params);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;

        const data = await res.json();
        const l = normalizeList(data);
        // if API still returns 20 even after asking 1000, keep trying
        if (l.length > 20) {
          firstData = data;
          list = l;
          total = pickTotal(data, l.length);
          break;
        }

        // store first ok response as fallback
        if (!firstData) {
          firstData = data;
          list = l;
          total = pickTotal(data, l.length);
        }
      }

      // If nothing worked, do a normal call
      if (!firstData) {
        const res = await fetch(base, { cache: "no-store" });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        firstData = await res.json();
        list = normalizeList(firstData);
        total = pickTotal(firstData, list.length);
      }

      setApiTotal(total);

      // ✅ If list already seems complete, just set it.
      // "complete" heuristic: if total is known and list length >= total
      if (Number.isFinite(total) && list.length >= total) {
        setCustomers(uniqueById(list));
        setLoading(false);
        return;
      }

      // Detect pagination style
      const totalPages = pickTotalPages(firstData);
      const serverLimit = pickLimit(firstData, list.length || 20);
      const startPage = pickPage(firstData, 1);
      const nextCursor = pickNextCursor(firstData);

      // ✅ Strategy 2A: Cursor-based pagination
      if (nextCursor) {
        let all = [...list];
        let cursor = nextCursor;

        // safety cap to avoid infinite loops
        const MAX_STEPS = 200;

        for (let i = 0; i < MAX_STEPS; i++) {
          const url = buildUrl(base, { cursor, limit: serverLimit });
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) break;

          const data = await res.json();
          const chunk = normalizeList(data);
          if (!chunk.length) break;

          all.push(...chunk);
          all = uniqueById(all);

          const t = pickTotal(data, all.length);
          setApiTotal((prev) => (Number.isFinite(prev) ? prev : t));

          const nc = pickNextCursor(data);
          if (!nc) break;
          cursor = nc;

          // stop if reached total
          if (Number.isFinite(t) && all.length >= t) break;
        }

        setCustomers(all);
        setLoading(false);
        return;
      }

      // ✅ Strategy 2B: totalPages available
      if (totalPages && Number(totalPages) > 1) {
        const all = [...list];
        const requests = [];
        for (let p = startPage + 1; p <= Number(totalPages); p++) {
          requests.push(
            fetch(buildUrl(base, { page: p, limit: serverLimit }), {
              cache: "no-store",
            })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          );
        }

        const pagesData = await Promise.all(requests);
        pagesData.forEach((pd) => {
          if (!pd) return;
          all.push(...normalizeList(pd));
        });

        const unique = uniqueById(all);
        setCustomers(unique);
        setApiTotal((prev) =>
          Number.isFinite(prev) ? prev : unique.length
        );
        setLoading(false);
        return;
      }

      // ✅ Strategy 2C: No totalPages, but likely page+limit (default limit=20)
      // Keep fetching page=2.. until last page returned < limit OR reached total OR empty
      {
        let all = [...list];
        let page = 1;

        // if first response already indicates a page, start from that
        page = startPage || 1;

        const MAX_PAGES = 200; // safety cap
        for (let i = 0; i < MAX_PAGES; i++) {
          const nextPage = page + 1;
          const url = buildUrl(base, { page: nextPage, limit: serverLimit });
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) break;

          const data = await res.json();
          const chunk = normalizeList(data);

          if (!chunk.length) break;

          all.push(...chunk);
          all = uniqueById(all);

          const t = pickTotal(data, all.length);
          setApiTotal((prev) => (Number.isFinite(prev) ? prev : t));

          // stop if reached total
          if (Number.isFinite(t) && all.length >= t) break;

          // stop if this page returned less than limit => last page
          if (chunk.length < serverLimit) break;

          page = nextPage;
        }

        setCustomers(all);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
      setApiTotal(null);
      setErrorMsg(error?.message || "Failed to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [BACKEND]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ----------------------------
  // SEARCH + FILTER + SORT
  // ----------------------------
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.email, c.phone, c.firebaseUID]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      );
    }

    if (countryFilter) {
      list = list.filter((c) => c.country === countryFilter);
    }

    if (statusFilter) {
      const boolValue = statusFilter === "active";
      list = list.filter((c) => c.isActive === boolValue);
    }

    if (sortBy === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "email") {
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.joinedAt || 0).getTime() -
          new Date(a.joinedAt || 0).getTime()
      );
    }

    return list;
  }, [customers, search, countryFilter, statusFilter, sortBy]);

  const filteredCount = processedCustomers.length;
  const totalCountToShow = apiTotal ?? (customers?.length || 0);

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Customers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and view all registered customers
          </p>

          {/* COUNTS */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              Total: {totalCountToShow}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
              Showing: {filteredCount}
            </span>
          </div>
        </div>

        <button
          onClick={fetchCustomers}
          className="px-5 py-2 rounded-lg bg-black text-white hover:bg-gray-900 active:scale-[0.98] transition shadow-sm"
        >
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {!!errorMsg && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-700 font-medium">Error</p>
          <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
        </div>
      )}

      {/* SEARCH + FILTERS + SORT */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name, email, phone, UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
        />

        <select
          className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        >
          <option value="">All Countries</option>
          <option value="India">India</option>
          <option value="USA">USA</option>
          <option value="UK">United Kingdom</option>
        </select>

        <select
          className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Sort by Joined Date</option>
          <option value="name">Sort by Name</option>
          <option value="email">Sort by Email</option>
        </select>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="py-10 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
            Loading customers...
          </div>
        </div>
      )}

      {/* EMPTY */}
      {!loading && processedCustomers.length === 0 && (
        <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-700 text-sm font-medium">No customers found.</p>
          <p className="text-gray-400 text-xs mt-1">
            Try changing filters or searching differently.
          </p>
        </div>
      )}

      {/* CUSTOMER LIST */}
      <div className="space-y-3">
        {!loading &&
          processedCustomers.map((customer) => {
            const img = (customer?.profileImage || "").trim();
            const hasImage = Boolean(img);

            return (
              <div
                key={customer?._id}
                onClick={() => router.push(`/customers/${customer?._id}`)}
                className="cursor-pointer rounded-2xl bg-white p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4
                           shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {hasImage ? (
                    <img
                      src={img}
                      className="w-12 h-12 rounded-full border border-gray-100 shadow-sm object-cover flex-shrink-0"
                      alt="avatar"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}

                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-black group-hover:text-blue-600 transition truncate">
                      {customer?.name || "Unnamed User"}
                    </h2>

                    <p className="text-gray-600 text-sm truncate">
                      {customer?.email || "—"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {customer?.phone ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">
                          {customer.phone}
                        </span>
                      ) : null}

                      {customer?.country ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">
                          {customer.country}
                        </span>
                      ) : null}
                    </div>

                    {customer?.firebaseUID ? (
                      <p className="text-xs text-gray-400 mt-2 truncate">
                        Firebase UID:{" "}
                        <span className="text-gray-700 font-medium">
                          {customer.firebaseUID}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="md:text-right text-sm flex md:flex-col items-start md:items-end justify-between md:justify-start gap-3">
                  <div>
                    <p className="text-gray-400 text-xs">Joined</p>
                    <p className="font-medium text-black">
                      {customer?.joinedAt
                        ? new Date(customer.joinedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${
                      customer?.isActive
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {customer?.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
