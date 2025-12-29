"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";

export default function WishlistSection({
  firebaseUID,
  customerId,
}) {
  const {
    productIds,
    loading,
    error,
    fetchWishlist,
    removeFromWishlist,
    clearWishlist,
  } = useWishlistStore();

  // 🔄 Load wishlist when UID changes
  useEffect(() => {
    if (firebaseUID) {
      fetchWishlist(firebaseUID);
    }
  }, [firebaseUID]);

  const card =
    "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all";

  return (
    <div className={card}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#800020]" /> Wishlist
          </h2>
          <p className="text-xs text-gray-500 mt-1 break-all">
            Firebase UID:{" "}
            <span className="font-semibold">{firebaseUID || "—"}</span>
          </p>
        </div>

        {productIds.length > 0 && (
          <button
            onClick={clearWishlist}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
          >
            <Trash2 className="h-4 w-4" />
            Clear Wishlist
          </button>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading wishlist...
        </div>
      ) : productIds.length === 0 ? (
        <p className="text-gray-600">No wishlist items found.</p>
      ) : (
        <>
          {/* STATS */}
          <div className="mb-3 text-xs text-gray-600">
            Total items:{" "}
            <span className="font-semibold">{productIds.length}</span>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productIds.map((pid) => (
              <div
                key={pid}
                className="relative border rounded-lg p-4 text-center hover:bg-gray-50 transition"
              >
                {/* REMOVE */}
                <button
                  onClick={() => removeFromWishlist(pid)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition"
                  title="Remove from wishlist"
                >
                  <Trash2 size={14} />
                </button>

                <p className="text-sm font-semibold break-all">{pid}</p>
                <p className="text-xs text-gray-500 mt-1">Product ID</p>

                {/* OPTIONAL LINK */}
                <Link
                  href={`/products/${pid}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-700 hover:underline"
                >
                  View <ExternalLink size={12} />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
