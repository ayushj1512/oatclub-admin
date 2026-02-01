"use client"

import { useEffect, useMemo, useState } from "react"
import { useAdminFootwearStore } from "@/store/adminFootwearStore"

export default function AllFootwearPage() {
  const {
    items,
    loading,
    error,
    clearError,
    fetchList,
  } = useAdminFootwearStore()

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("newest")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // 🔍 FILTER + SORT LOGIC
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(items) ? [...items] : []

    // Search filter
    if (search) {
      list = list.filter((p) =>
        String(p?.name || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    }

    // Price filter
    if (minPrice !== "") {
      list = list.filter((p) => Number(p?.price || 0) >= Number(minPrice))
    }

    if (maxPrice !== "") {
      list = list.filter((p) => Number(p?.price || 0) <= Number(maxPrice))
    }

    // Sorting
    if (sort === "priceLow") {
      list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))
    }

    if (sort === "priceHigh") {
      list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0))
    }

    if (sort === "name") {
      list.sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      )
    }

    // Newest: prefer createdAt; fallback to _id compare (string)
    if (sort === "newest") {
      list.sort((a, b) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0

        if (aTime !== bTime) return bTime - aTime

        // fallback if createdAt missing
        return String(b?._id || "").localeCompare(String(a?._id || ""))
      })
    }

    return list
  }, [items, search, sort, minPrice, maxPrice])

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-6 text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-semibold">All Footwear</h1>

        <div className="flex gap-3">
          <input
            placeholder="Search footwear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white px-4 py-2 rounded-xl outline-none shadow-sm"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white px-4 py-2 rounded-xl outline-none shadow-sm"
          >
            <option value="newest">Newest</option>
            <option value="priceLow">Price: Low → High</option>
            <option value="priceHigh">Price: High → Low</option>
            <option value="name">Name A → Z</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="number"
          placeholder="Min ₹"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="bg-white px-4 py-2 rounded-xl outline-none shadow-sm w-32"
        />

        <input
          type="number"
          placeholder="Max ₹"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="bg-white px-4 py-2 rounded-xl outline-none shadow-sm w-32"
        />

        <button
          onClick={() => {
            setMinPrice("")
            setMaxPrice("")
            setSearch("")
          }}
          className="bg-[#eaeaea] px-4 py-2 rounded-xl hover:bg-[#dcdcdc] transition"
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition text-sm"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm">
          Loading footwear...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm">
          No footwear found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product?._id}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              {/* Image */}
              <div className="h-40 bg-gray-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                {product?.image?.url ? (
                  <img
                    src={product.image.url}
                    alt={product?.name || "Footwear"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">No Image</span>
                )}
              </div>

              {/* Info */}
              <h3 className="font-medium mb-1 truncate">
                {product?.name || "Untitled"}
              </h3>

              <p className="text-gray-600 text-sm mb-4">
                ₹{product?.price ?? 0}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition text-sm">
                  View
                </button>

                <button className="flex-1 bg-[#ededed] py-2 rounded-lg hover:bg-[#dcdcdc] transition text-sm">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
