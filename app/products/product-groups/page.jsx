"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const str = (value) => String(value ?? "").trim();

const getImage = (product) =>
  product?.thumbnail || product?.images?.[0] || "";

const getPatternNumber = (product) => {
  const variants = Array.isArray(product?.variants)
    ? product.variants
    : [];

  return (
    variants.find((variant) => str(variant?.patternNumber))
      ?.patternNumber || ""
  );
};

const getCrossSellIds = (product) =>
  (Array.isArray(product?.crossSellProducts)
    ? product.crossSellProducts
    : []
  )
    .map((item) =>
      typeof item === "object" ? str(item?._id) : str(item),
    )
    .filter(Boolean);

const getProductCategories = (product) =>
  Array.isArray(product?.categories) ? product.categories : [];

export default function ProductGroupsPage() {
  const searchParams = useSearchParams();

  const products = useAdminProductStore((state) => state.products);
  const loading = useAdminProductStore((state) => state.loading);
  const saving = useAdminProductStore((state) => state.saving);

  const fetchAllProducts = useAdminProductStore(
    (state) => state.fetchAllProducts,
  );

  const syncProductAssociationGroup = useAdminProductStore(
    (state) => state.syncProductAssociationGroup,
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  const [sourceProductId, setSourceProductId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [patternNumber, setPatternNumber] = useState("");

  useEffect(() => {
    fetchAllProducts({
      sort: "newest",
    });
  }, [fetchAllProducts]);

  const categories = useMemo(() => {
    const values = new Set();

    products.forEach((product) => {
      getProductCategories(product).forEach((item) => {
        if (item) values.add(item);
      });
    });

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productsMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          str(product?._id),
          product,
        ]),
      ),
    [products],
  );

  useEffect(() => {
    const queryProductId = str(searchParams.get("productId"));

    if (!queryProductId || !productsMap.has(queryProductId)) return;

    const source = productsMap.get(queryProductId);
    const associatedIds = getCrossSellIds(source).filter((id) =>
      productsMap.has(id),
    );

    setSourceProductId(queryProductId);
    setSelectedIds(associatedIds);
    setPatternNumber(getPatternNumber(source));
  }, [searchParams, productsMap]);

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();

    return products.filter((product) => {
      const id = str(product?._id);
      const title = str(product?.title).toLowerCase();
      const code = str(product?.productCode).toLowerCase();
      const pattern = getPatternNumber(product).toLowerCase();
      const categories = getProductCategories(product);
      const grouped = getCrossSellIds(product).length > 0;

      const matchesSearch =
        !query ||
        title.includes(query) ||
        code.includes(query) ||
        pattern.includes(query);

      const matchesCategory =
        category === "all" || categories.includes(category);

      const matchesGroup =
        groupFilter === "all" ||
        (groupFilter === "grouped" && grouped) ||
        (groupFilter === "ungrouped" && !grouped);

      return (
        id &&
        matchesSearch &&
        matchesCategory &&
        matchesGroup
      );
    });
  }, [products, search, category, groupFilter]);

  const sourceProduct = productsMap.get(sourceProductId) || null;

  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => productsMap.get(id))
        .filter(Boolean),
    [selectedIds, productsMap],
  );

  const chooseSourceProduct = (product) => {
    const id = str(product?._id);
    if (!id) return;

    const existingCrossSells = getCrossSellIds(product).filter(
      (crossSellId) =>
        crossSellId !== id && productsMap.has(crossSellId),
    );

    setSourceProductId(id);
    setSelectedIds(existingCrossSells);
    setPatternNumber(getPatternNumber(product));
  };

  const toggleProduct = (productId) => {
    const id = str(productId);

    if (!id || id === sourceProductId) return;

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const removeSelectedProduct = (productId) => {
    setSelectedIds((current) =>
      current.filter((id) => id !== productId),
    );
  };

  const resetForm = () => {
    setSourceProductId("");
    setSelectedIds([]);
    setPatternNumber("");
  };

  const saveGroup = async () => {
    if (!sourceProductId || !selectedIds.length) return;

    const response = await syncProductAssociationGroup(
      sourceProductId,
      selectedIds,
      patternNumber,
    );

    if (response) {
      await fetchAllProducts({
        sort: "newest",
      });
    }
  };

  const totalGroupProducts =
    (sourceProductId ? 1 : 0) + selectedIds.length;

  return (
    <main className="min-h-screen bg-[#f6f6f6] p-4 text-black md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-white p-5 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
              <Layers3 size={14} />
              Product Management
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Product Group Builder
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-black/55">
              Associate related products, apply one common pattern number,
              and automatically configure cross-sell products.
            </p>
          </div>

          <Link
            href="/products/product-groups/all"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85"
          >
            View Existing Groups
            <ChevronRight size={16} />
          </Link>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="border-b border-black/10 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_160px]">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-[#fafafa] px-3">
                  <Search size={17} className="text-black/40" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search title, code or pattern..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
                  />
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                >
                  <option value="all">All categories</option>

                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={groupFilter}
                  onChange={(event) =>
                    setGroupFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
                >
                  <option value="all">All products</option>
                  <option value="grouped">Grouped</option>
                  <option value="ungrouped">Ungrouped</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-xs text-black/50">
              <span>
                {filteredProducts.length} products found
              </span>

              <span>
                Click once to select primary, then select related products
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-black/40"
                />
              </div>
            ) : (
              <div className="grid max-h-[calc(100vh-280px)] grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const id = str(product?._id);
                  const image = getImage(product);
                  const pattern = getPatternNumber(product);
                  const crossSellCount =
                    getCrossSellIds(product).length;

                  const isSource = id === sourceProductId;
                  const isSelected = selectedIds.includes(id);

                  return (
                    <article
                      key={id}
                      className={`group relative overflow-hidden rounded-2xl border transition ${
                        isSource
                          ? "border-black bg-black text-white"
                          : isSelected
                            ? "border-black bg-[#f1f1f1]"
                            : "border-black/10 bg-white hover:border-black/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!sourceProductId) {
                            chooseSourceProduct(product);
                            return;
                          }

                          if (isSource) {
                            chooseSourceProduct(product);
                            return;
                          }

                          toggleProduct(id);
                        }}
                        className="block w-full text-left"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-[#eeeeee]">
                          {image ? (
                            <img
                              src={image}
                              alt={product?.title || "Product"}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-black/35">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-sm font-semibold">
                                {product?.title}
                              </h3>

                              <p
                                className={`mt-1 text-xs ${
                                  isSource
                                    ? "text-white/60"
                                    : "text-black/45"
                                }`}
                              >
                                #{product?.productCode || "—"}
                              </p>
                            </div>

                            {(isSource || isSelected) && (
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  isSource
                                    ? "bg-white text-black"
                                    : "bg-black text-white"
                                }`}
                              >
                                <Check size={14} />
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {isSource && (
                              <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                                Primary
                              </span>
                            )}

                            {isSelected && (
                              <span className="rounded-full bg-black px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                                Selected
                              </span>
                            )}

                            {pattern && (
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                  isSource
                                    ? "bg-white/15"
                                    : "bg-[#eeeeee]"
                                }`}
                              >
                                {pattern}
                              </span>
                            )}

                            {crossSellCount > 0 && (
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] ${
                                  isSource
                                    ? "bg-white/15"
                                    : "bg-[#eeeeee]"
                                }`}
                              >
                                {crossSellCount} linked
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-black/10 bg-white p-5 xl:sticky xl:top-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} />

                  <h2 className="text-lg font-semibold">
                    Group Configuration
                  </h2>
                </div>

                <p className="mt-1 text-sm text-black/50">
                  One shared pattern and complete cross-sell association.
                </p>
              </div>

              {(sourceProductId || selectedIds.length > 0) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-black/10 p-2 text-black/50 transition hover:bg-black hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Primary product
              </label>

              {sourceProduct ? (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#f7f7f7] p-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#e8e8e8]">
                    {getImage(sourceProduct) && (
                      <img
                        src={getImage(sourceProduct)}
                        alt={sourceProduct?.title || ""}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {sourceProduct?.title}
                    </p>

                    <p className="mt-1 text-xs text-black/45">
                      #{sourceProduct?.productCode}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-black/20 p-5 text-center text-sm text-black/40">
                  Select a primary product from the product grid.
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Shared pattern number
              </label>

              <input
                value={patternNumber}
                onChange={(event) =>
                  setPatternNumber(event.target.value)
                }
                placeholder="Example: PAT-1001"
                className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm uppercase outline-none focus:border-black"
              />

              <p className="mt-2 text-xs leading-5 text-black/45">
                This pattern number will be applied to every size variant
                of every product in this group.
              </p>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                  Associated products
                </label>

                <span className="text-xs text-black/45">
                  {selectedProducts.length} selected
                </span>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selectedProducts.length ? (
                  selectedProducts.map((product) => {
                    const id = str(product?._id);

                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-xl border border-black/10 p-2"
                      >
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-[#eeeeee]">
                          {getImage(product) && (
                            <img
                              src={getImage(product)}
                              alt={product?.title || ""}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product?.title}
                          </p>

                          <p className="text-xs text-black/40">
                            #{product?.productCode}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSelectedProduct(id)}
                          className="rounded-lg p-2 text-black/40 hover:bg-black hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-black/20 p-5 text-center text-sm text-black/40">
                    Select related products from the grid.
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-black p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/65">
                  Total products
                </span>

                <strong className="text-xl">
                  {totalGroupProducts}
                </strong>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-white/65">
                  Pattern number
                </span>

                <strong className="text-sm">
                  {patternNumber || "Not entered"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              disabled={
                saving ||
                !sourceProductId ||
                selectedIds.length === 0 ||
                !patternNumber.trim()
              }
              onClick={saveGroup}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Layers3 size={17} />
              )}

              Create and Sync Product Group
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}