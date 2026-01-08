"use client";

import { useEffect, useState, useMemo } from "react";
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

  // Fetch customers
  const fetchCustomers = async () => {
  try {
    const res = await fetch(`${BACKEND}/api/customers`);
    const data = await res.json();

    // ✅ normalize API response
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.customers)
      ? data.customers
      : Array.isArray(data?.data)
      ? data.data
      : [];

    setCustomers(list);
  } catch (error) {
    console.error("Failed to load customers:", error);
    setCustomers([]);
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchCustomers();
  }, []);

  // -----------------------------------------------------------
  // 🔎 SEARCH + FILTER + SORT (Optimized with useMemo)
  // -----------------------------------------------------------
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    // SEARCH
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.email, c.phone, c.firebaseUID]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query))
      );
    }

    // FILTER: COUNTRY
    if (countryFilter) {
      list = list.filter((c) => c.country === countryFilter);
    }

    // FILTER: STATUS
    if (statusFilter) {
      const boolValue = statusFilter === "active";
      list = list.filter((c) => c.isActive === boolValue);
    }

    // SORTING
    if (sortBy === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "email") {
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    } else {
      // DEFAULT: DATE
      list.sort(
        (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      );
    }

    return list;
  }, [customers, search, countryFilter, statusFilter, sortBy]);

  return (
    <div className="p-6 bg-white">
  {/* HEADER */}
  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-black">
        Customers
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Manage and view all registered customers
      </p>
    </div>

    <button
      onClick={fetchCustomers}
      className="px-5 py-2 rounded-lg bg-black text-white hover:bg-gray-900 active:scale-[0.98] transition shadow-sm"
    >
      Refresh
    </button>
  </div>

  {/* SEARCH + FILTERS + SORT SECTION */}
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid md:grid-cols-4 gap-4">
    {/* SEARCH */}
    <input
      type="text"
      placeholder="Search by name, email, phone, UID..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-gray-400 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
    />

    {/* FILTER: COUNTRY */}
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

    {/* FILTER: STATUS */}
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

    {/* SORT */}
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
    <p className="text-gray-500 text-center text-sm py-6">
      Loading customers...
    </p>
  )}

  {/* EMPTY */}
  {!loading && processedCustomers.length === 0 && (
    <div className="text-center py-10">
      <p className="text-gray-600 text-sm">No customers found.</p>
      <p className="text-gray-400 text-xs mt-1">
        Try changing filters or searching differently.
      </p>
    </div>
  )}

  {/* CUSTOMER LIST */}
  <div className="space-y-3">
    {processedCustomers.map((customer) => (
      <div
        key={customer._id}
        onClick={() => router.push(`/customers/${customer._id}`)}
        className="cursor-pointer rounded-2xl bg-white p-4 flex justify-between items-center 
                   shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 
                   transition-all group"
      >
        {/* Profile */}
        <div className="flex items-center gap-4">
          <img
            src={customer.profileImage || "/profile/user-avatar.jpg"}
            className="w-12 h-12 rounded-full border border-gray-100 shadow-sm object-cover"
            alt="avatar"
          />

          <div>
            <h2 className="text-base font-semibold text-black group-hover:text-blue-600 transition">
              {customer.name || "Unnamed User"}
            </h2>
            <p className="text-gray-600 text-sm">{customer.email}</p>

            <p className="text-xs text-gray-400 mt-1">
              Firebase UID:{" "}
              <span className="text-gray-600 font-medium">
                {customer.firebaseUID}
              </span>
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="text-right text-sm">
          <p className="text-gray-400 text-xs">Joined</p>
          <p className="font-medium text-black">
            {new Date(customer.joinedAt).toLocaleDateString()}
          </p>

          <p
            className={`text-xs mt-1 font-semibold px-2 py-1 rounded-full inline-block ${
              customer.isActive
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {customer.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>

  );
}
