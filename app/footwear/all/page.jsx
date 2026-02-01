"use client"

import { useMemo, useState } from "react"
import useAdminFootwearStore from "@/store/adminFootwearStore"

export default function AllFootwearPage() {

  const products = useAdminFootwearStore((state) => state.products)

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("newest")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  // 🔍 FILTER + SORT LOGIC
  const filteredProducts = useMemo(() => {
    let list = [...products]

    // Search filter
    if (search) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Price filter
    if (minPrice !== "") {
      list = list.filter((p) => p.price >= Number(minPrice))
    }

    if (maxPrice !== "") {
      list = list.filter((p) => p.price <= Number(maxPrice))
    }

    // Sorting
    if (sort === "priceLow") {
      list.sort((a, b) => a.price - b.price)
    }

    if (sort === "priceHigh") {
      list.sort((a, b) => b.price - a.price)
    }

    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sort === "newest") {
      list.sort((a, b) => b.id - a.id)
    }

    return list
  }, [products, search, sort, minPrice, maxPrice])

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-6 text-black">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

        <h1 className="text-3xl font-semibold">
          All Footwear
        </h1>

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
      <div className="flex flex-wrap gap-3 mb-10">

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

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm">
          No footwear found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >

              {/* Image */}
              <div className="h-40 bg-gray-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">

                {product.image?.url ? (
                  <img
                    src={product.image.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">No Image</span>
                )}

              </div>

              {/* Info */}
              <h3 className="font-medium mb-1 truncate">
                {product.name}
              </h3>

              <p className="text-gray-600 text-sm mb-4">
                ₹{product.price}
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
