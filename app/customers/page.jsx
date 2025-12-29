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
    <div className="p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>

        <button
          onClick={fetchCustomers}
          className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition"
        >
          Refresh
        </button>
      </div>

      {/* SEARCH + FILTERS + SORT SECTION */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid md:grid-cols-4 gap-4">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search by name, email, phone, UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded"
        />

        {/* FILTER: COUNTRY */}
        <select
          className="border p-2 rounded"
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
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* SORT */}
        <select
          className="border p-2 rounded"
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
        <p className="text-gray-500 text-center">Loading customers...</p>
      )}

      {/* EMPTY */}
      {!loading  === 0 && (
        <p className="text-gray-700 text-center">No customers found.</p>
      )}

      {/* CUSTOMER LIST */}
      <div className="space-y-4">
        {processedCustomers.map((customer) => (
          <div
            key={customer._id}
            onClick={() => router.push(`/customers/${customer._id}`)}
            className="cursor-pointer border rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 transition-all shadow-sm hover:shadow-md"
          >
            {/* Profile */}
            <div className="flex items-center gap-4">
              <img
                src={customer.profileImage || "/profile/user-avatar.jpg"}
                className="w-12 h-12 rounded-full border shadow-sm"
                alt="avatar"
              />

              <div>
                <h2 className="text-lg font-semibold">
                  {customer.name || "Unnamed User"}
                </h2>
                <p className="text-gray-600 text-sm">{customer.email}</p>

                <p className="text-xs text-gray-500 mt-1">
                  Firebase UID: {customer.firebaseUID}
                </p>
              </div>
            </div>

            {/* Right Side */}
            <div className="text-right text-sm">
              <p className="text-gray-500">Joined:</p>
              <p className="font-medium">
                {new Date(customer.joinedAt).toLocaleDateString()}
              </p>

              <p
                className={`text-xs mt-1 font-semibold ${
                  customer.isActive ? "text-green-600" : "text-red-600"
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
