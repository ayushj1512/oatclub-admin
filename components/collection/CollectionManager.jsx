"use client";

import { useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function CollectionManager() {
  const router = useRouter();

  const { collections, loading, fetchCollections, deleteCollection } =
    useAdminCollectionStore();

  const { products, fetchProducts } = useAdminProductStore();

  /* ---------------- load data ---------------- */
  useEffect(() => {
    fetchCollections();
    fetchProducts({ limit: 1000 });
  }, []);

  /* ---------------- helpers ---------------- */
  const productMap = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products]
  );

  const handleDelete = async (id) => {
    if (!confirm("Delete this collection?")) return;
    await deleteCollection(id);
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Product Collections
          </h1>
          <p className="text-sm text-gray-500">
            Group products into curated collections
          </p>
        </div>

        <button
          onClick={() => router.push("/products/collections/add")}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition"
        >
          <Plus size={16} />
          New Collection
        </button>
      </div>

      {/* TABLE WRAPPER */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Collection</th>
              <th className="px-5 py-4 text-left font-semibold">Type</th>
              <th className="px-5 py-4 text-left font-semibold">Products</th>
              <th className="px-5 py-4 text-center font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* LOADING */}
            {loading && (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-12 text-center text-gray-500"
                >
                  Loading collections…
                </td>
              </tr>
            )}

            {/* EMPTY */}
            {!loading && collections.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-14 text-center">
                  <div className="text-gray-400 font-medium">
                    No collections created yet
                  </div>

                  <button
                    onClick={() =>
                      router.push("/products/collections/add")
                    }
                    className="mt-3 inline-flex items-center justify-center text-sm font-medium text-blue-600 hover:underline"
                  >
                    Create your first collection
                  </button>
                </td>
              </tr>
            )}

            {/* ROWS */}
            {collections.map((c) => (
              <tr
                key={c._id}
                className="hover:bg-gray-50/70 transition cursor-pointer"
                onClick={() => router.push(`/products/collections/${c._id}`)}
              >
                {/* NAME */}
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.products?.length || 0} products
                  </div>
                </td>

                {/* TYPE */}
                <td className="px-5 py-4 capitalize text-gray-600">
                  {c.type}
                </td>

                {/* PRODUCTS */}
                <td className="px-5 py-4">
                  {Array.isArray(c.products) && c.products.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {c.products.slice(0, 4).map((p) => {
                        const id = typeof p === "string" ? p : p._id;
                        const prod = productMap.get(id);

                        const img =
                          prod?.images?.[0] ||
                          prod?.image ||
                          prod?.thumbnail ||
                          "/placeholder.png";

                        return (
                          <span
                            key={id}
                            className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 max-w-[170px] truncate"
                            title={prod?.title}
                          >
                            <span className="h-6 w-6 rounded-full overflow-hidden bg-gray-200 ring-1 ring-black/10 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img}
                                alt={prod?.title || "product"}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.png";
                                }}
                              />
                            </span>

                            <span className="truncate">
                              {prod?.title || "Product"}
                            </span>
                          </span>
                        );
                      })}

                      {c.products.length > 4 && (
                        <span className="text-xs text-gray-500 flex items-center">
                          +{c.products.length - 4} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No products</span>
                  )}
                </td>

                {/* STATUS */}
                <td className="px-5 py-4 text-center">
                  {c.isActive ? (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold ring-1 ring-blue-200">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold ring-1 ring-gray-200">
                      Inactive
                    </span>
                  )}
                </td>

                {/* ACTION */}
                <td
                  className="px-5 py-4 text-right space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* EDIT */}
                  <button
                    onClick={() =>
                      router.push(`/products/collections/${c._id}`)
                    }
                    className="px-3 py-1.5 text-xs rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition font-medium"
                  >
                    Edit
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition"
                    title="Delete collection"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER TIP */}
      <div className="text-xs text-gray-400 text-center">
        Tip: Click on a row to quickly edit the collection.
      </div>
    </div>
  );
}
