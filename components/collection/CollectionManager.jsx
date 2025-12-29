"use client";

import { useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function CollectionManager() {
  const router = useRouter();

  const {
    collections,
    loading,
    fetchCollections,
    deleteCollection,
  } = useAdminCollectionStore();

  const {
    products,
    fetchProducts,
    loading: productLoading,
  } = useAdminProductStore();

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

  /* ---------------- render ---------------- */
  return (
 <div className="p-6 bg-gray-50 min-h-screen space-y-6">
  {/* HEADER */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Product Collections
      </h1>
      <p className="text-sm text-gray-600">
        Group products into curated collections
      </p>
    </div>

    <button
      onClick={() => router.push("/products/collections/add")}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
    >
      <Plus size={16} />
      New Collection
    </button>
  </div>

  {/* TABLE WRAPPER */}
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
        <tr>
          <th className="px-4 py-3 text-left">Collection</th>
          <th className="px-4 py-3 text-left">Type</th>
          <th className="px-4 py-3 text-left">Products</th>
          <th className="px-4 py-3 text-center">Status</th>
          <th className="px-4 py-3 text-right">Action</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {/* LOADING */}
        {loading && (
          <tr>
            <td
              colSpan="5"
              className="px-6 py-10 text-center text-gray-500"
            >
              Loading collections…
            </td>
          </tr>
        )}

        {/* EMPTY */}
        {!loading && collections.length === 0 && (
          <tr>
            <td
              colSpan="5"
              className="px-6 py-10 text-center text-gray-400"
            >
              No collections created yet
              <div className="mt-2">
                <button
                  onClick={() =>
                    router.push("/products/collections/add")
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  Create your first collection
                </button>
              </div>
            </td>
          </tr>
        )}

        {/* ROWS */}
        {collections.map((c) => (
          <tr
            key={c._id}
            className="hover:bg-gray-50 transition"
          >
            {/* NAME */}
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {c.name}
              </div>
              <div className="text-xs text-gray-500">
                {c.products?.length || 0} products
              </div>
            </td>

            {/* TYPE */}
            <td className="px-4 py-3 capitalize text-gray-700">
              {c.type}
            </td>

            {/* PRODUCTS */}
            <td className="px-4 py-3">
              {Array.isArray(c.products) && c.products.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {c.products.slice(0, 4).map((p) => {
                    const id =
                      typeof p === "string" ? p : p._id;
                    const prod = productMap.get(id);

                    return (
                      <span
                        key={id}
                        className="px-2 py-0.5 bg-gray-100 rounded-full text-xs max-w-[120px] truncate"
                        title={prod?.title}
                      >
                        {prod?.title || "Product"}
                      </span>
                    );
                  })}

                  {c.products.length > 4 && (
                    <span className="text-xs text-gray-500">
                      +{c.products.length - 4} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-400">
                  No products
                </span>
              )}
            </td>

            {/* STATUS */}
            <td className="px-4 py-3 text-center">
              {c.isActive ? (
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs">
                  Inactive
                </span>
              )}
            </td>

            {/* ACTION */}
            <td className="px-4 py-3 text-right space-x-2">
  {/* EDIT */}
  <button
    onClick={() =>
      router.push(`/products/collections/${c._id}`)
    }
    className="px-2 py-1 text-xs rounded-md border text-gray-700 hover:bg-gray-100"
  >
    Edit
  </button>

  {/* DELETE */}
  <button
    onClick={() => handleDelete(c._id)}
    className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
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
</div>

  );
}
