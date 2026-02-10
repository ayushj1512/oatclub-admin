"use client";

import { useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, FolderOpen, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const idOf = (v) => String(v?._id ?? v ?? "");
const getImg = (p) =>
  p?.images?.[0] || p?.image || p?.thumbnail || "/placeholder.png";
const toLabel = (v) => String(v || "").trim() || "-";

export default function CollectionManager() {
  const router = useRouter();

  const { collections = [], loading, fetchCollections, deleteCollection } =
    useAdminCollectionStore();

  const { products = [], fetchProducts } = useAdminProductStore();

  useEffect(() => {
    fetchCollections();
    fetchProducts({ limit: 1000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productMap = useMemo(
    () => new Map(safeArr(products).map((p) => [String(p._id), p])),
    [products]
  );

  const countProducts = (c) => safeArr(c?.products).length;

  const resolveProduct = (ref) => {
    // c.products may be ["id"] OR [{_id}] OR [{product, productCode}]
    const raw = ref && typeof ref === "object" ? ref.product ?? ref._id : ref;
    const pid = idOf(raw);
    return productMap.get(pid) || null;
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this collection?")) return;
    await deleteCollection(id);
  };

  return (
    <section className="min-h-screen bg-[#F6F7FB] px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto  space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
          >
            <Plus size={16} />
            New Collection
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-4">Collection</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-4">Products</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-100">
            {loading && (
              <div className="px-6 py-14 text-center text-sm text-gray-500">
                Loading collections…
              </div>
            )}

            {!loading && safeArr(collections).length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto max-w-sm">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                    <FolderOpen className="text-gray-600" size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    No collections yet
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Create one to start grouping products.
                  </p>

                  <button
                    onClick={() => router.push("/products/collections/add")}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50 transition"
                  >
                    <Plus size={16} />
                    Create Collection
                  </button>
                </div>
              </div>
            )}

            {!loading &&
              safeArr(collections).map((c) => {
                const items = safeArr(c?.products);
                const chips = items.slice(0, 4).map(resolveProduct).filter(Boolean);
                const more = Math.max(0, items.length - chips.length);

                return (
                  <div
                    key={c._id}
                    className="group px-4 md:px-5 py-4 hover:bg-gray-50/70 transition cursor-pointer"
                    onClick={() => router.push(`/products/collections/${c._id}`)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 md:gap-4 gap-3 items-start">
                      {/* Name */}
                      <div className="md:col-span-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center flex-shrink-0">
                            <Search className="text-gray-600" size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {toLabel(c?.name)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {countProducts(c)} products
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="md:col-span-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 capitalize">
                          {toLabel(c?.type)}
                        </span>
                      </div>

                      {/* Products */}
                      <div className="md:col-span-4">
                        {chips.length ? (
                          <div className="flex flex-wrap gap-2">
                            {chips.map((p) => {
                              const img = getImg(p);
                              const pid = String(p._id);
                              return (
                                <span
                                  key={pid}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200 max-w-[220px]"
                                  title={p?.title || "Product"}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="h-6 w-6 rounded-full overflow-hidden bg-gray-200 ring-1 ring-black/10 flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={img}
                                      alt={p?.title || "product"}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.png";
                                      }}
                                    />
                                  </span>
                                  <span className="truncate">
                                    {p?.title || "Product"}
                                  </span>
                                </span>
                              );
                            })}

                            {more > 0 && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                                +{more} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No products</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="md:col-span-1 md:text-center">
                        {c?.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="md:col-span-1 md:text-right flex md:justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            router.push(`/products/collections/${c._id}`)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(c._id)}
                          className="inline-flex items-center justify-center rounded-xl bg-white p-2 text-red-600 ring-1 ring-gray-200 hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Tip: Click a row to edit. Use “Edit” / 🗑️ for quick actions.
        </p>
      </div>
    </section>
  );
}
