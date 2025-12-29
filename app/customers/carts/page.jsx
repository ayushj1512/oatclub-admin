"use client";

/* ============================================================
   IMPORTS
============================================================ */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  CheckCircle2,
  Search,
  RefreshCcw,
} from "lucide-react";

/* ============================================================
   CONSTANTS
============================================================ */
const API = process.env.NEXT_PUBLIC_API_URL || "";
const ABANDONED_CART_API = `${API}/api/abandoned-carts`;

const safe = (v) => String(v ?? "").trim();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

/* ============================================================
   STATUS BADGE
============================================================ */
function CartStatus({ cart }) {
  if (cart?.recoveredAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
        <CheckCircle2 size={14} /> Recovered
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
      <ShoppingCart size={14} /> Abandoned
    </span>
  );
}

/* ============================================================
   PAGE
============================================================ */
export default function CustomerAbandonedCartsPage() {
  const router = useRouter();

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // abandoned | recovered

  /* ----------------------------------------------------------
     FETCH CARTS
  ---------------------------------------------------------- */
  const fetchCarts = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${ABANDONED_CART_API}?page=1&limit=100`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load carts");
      }

      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.carts)
        ? data.carts
        : Array.isArray(data)
        ? data
        : [];

      setCarts(list);
    } catch (err) {
      console.error("Abandoned carts error:", err);
      setError(err?.message || "Failed to load abandoned carts");
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  /* ----------------------------------------------------------
     SEARCH + FILTER
  ---------------------------------------------------------- */
  const filteredCarts = useMemo(() => {
    let list = [...carts];

    // 🔎 Search (email / phone / UID)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        [c.email, c.phone, c.firebaseUID]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q))
      );
    }

    // 📌 Status filter
    if (statusFilter === "abandoned") {
      list = list.filter((c) => c.abandonedAt && !c.recoveredAt);
    }
    if (statusFilter === "recovered") {
      list = list.filter((c) => c.recoveredAt);
    }

    return list;
  }, [carts, search, statusFilter]);

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      {/* ======================================================
         HEADER
      ====================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Abandoned Carts</h1>

        <button
          onClick={fetchCarts}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* ======================================================
         SEARCH + FILTERS
      ====================================================== */}
      <div className="bg-white border rounded-xl p-4 grid gap-4 md:grid-cols-3 shadow-sm">
        {/* SEARCH */}
        <div className="flex items-center gap-2 border rounded px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search email, phone, UID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        {/* STATUS */}
        <select
          className="border rounded px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Carts</option>
          <option value="abandoned">Abandoned</option>
          <option value="recovered">Recovered</option>
        </select>
      </div>

      {/* ======================================================
         STATES
      ====================================================== */}
      {loading && (
        <p className="text-center text-gray-500">
          Loading abandoned carts…
        </p>
      )}

      {!loading && error && (
        <p className="text-center text-red-600">{error}</p>
      )}

      {!loading && filteredCarts.length === 0 && (
        <p className="text-center text-gray-600">
          No abandoned carts found.
        </p>
      )}

      {/* ======================================================
         CART LIST
      ====================================================== */}
      <div className="space-y-4">
        {filteredCarts.map((cart) => (
          <div
            key={cart._id}
            onClick={() =>
              cart?.customerId &&
              router.push(`/customers/${cart.customerId}`)
            }
            className="cursor-pointer bg-white border rounded-xl p-4 shadow-sm hover:shadow-md hover:bg-gray-50 transition"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* LEFT */}
              <div>
                <p className="font-semibold text-gray-900">
                  {cart.email || "Unknown Email"}
                </p>
                <p className="text-sm text-gray-600">
                  UID: {cart.firebaseUID || "—"}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Abandoned: {fmtDate(cart.abandonedAt)}
                </p>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-4">
                <p className="font-semibold">
                  ₹{Number(cart.cartTotal || 0).toFixed(0)}
                </p>
                <CartStatus cart={cart} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
