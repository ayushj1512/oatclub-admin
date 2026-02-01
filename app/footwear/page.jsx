"use client"

import { useEffect } from "react"
import { useAdminFootwearStore } from "@/store/adminFootwearStore"

export default function FootwearDashboard() {
  const {
    items,
    total,
    loading,
    fetchList,
  } = useAdminFootwearStore()

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // derived stats (adjust later if backend adds real stats)
  const stats = {
    totalProducts: total,
    ordersToday: 0,
    revenue: 0,
    customers: 0,
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-black p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-semibold">
          Footwear Store Dashboard
        </h1>

        <button className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 transition">
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard title="Total Products" value={stats.totalProducts} />
        <StatCard title="Orders Today" value={stats.ordersToday} />
        <StatCard title="Revenue" value={`₹${stats.revenue}`} />
        <StatCard title="Customers" value={stats.customers} />
      </div>

      {/* Products */}
      <div>
        <h2 className="text-xl font-semibold mb-5">
          Products
        </h2>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            Loading products...
          </div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 bg-white rounded-2xl p-10 text-center shadow-sm">
            No products added yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="h-32 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-400">
                  Image
                </div>

                <h3 className="font-medium mb-1">
                  {product.name}
                </h3>

                <p className="text-gray-600 text-sm mb-3">
                  ₹{product.price}
                </p>

                <button className="text-sm px-4 py-2 rounded-lg bg-[#ededed] hover:bg-black hover:text-white transition">
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <p className="text-gray-500 text-sm mb-2">{title}</p>
      <h2 className="text-2xl font-semibold">{value}</h2>
    </div>
  )
}
