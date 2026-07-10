"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Layers3,
  Loader2,
  Search,
  Users,
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

const getCategories = (product) =>
  Array.isArray(product?.categories) ? product.categories : [];

const buildProductGroups = (products = []) => {
  const productMap = new Map(
    products.map((product) => [
      str(product?._id),
      product,
    ]),
  );

  const adjacency = new Map();

  products.forEach((product) => {
    const id = str(product?._id);

    if (!id) return;

    if (!adjacency.has(id)) {
      adjacency.set(id, new Set());
    }

    getCrossSellIds(product).forEach((linkedId) => {
      if (!productMap.has(linkedId)) return;

      if (!adjacency.has(linkedId)) {
        adjacency.set(linkedId, new Set());
      }

      adjacency.get(id).add(linkedId);
      adjacency.get(linkedId).add(id);
    });
  });

  const visited = new Set();
  const groups = [];

  adjacency.forEach((connections, startId) => {
    if (visited.has(startId) || connections.size === 0) return;

    const queue = [startId];
    const groupIds = [];

    while (queue.length) {
      const currentId = queue.shift();

      if (visited.has(currentId)) continue;

      visited.add(currentId);
      groupIds.push(currentId);

      const neighbours = adjacency.get(currentId) || new Set();

      neighbours.forEach((neighbourId) => {
        if (!visited.has(neighbourId)) {
          queue.push(neighbourId);
        }
      });
    }

    const groupProducts = groupIds
      .map((id) => productMap.get(id))
      .filter(Boolean);

    if (groupProducts.length < 2) return;

    const patternNumbers = Array.from(
      new Set(
        groupProducts
          .map(getPatternNumber)
          .filter(Boolean),
      ),
    );

    const categories = Array.from(
      new Set(
        groupProducts.flatMap(getCategories).filter(Boolean),
      ),
    );

    const latestUpdatedAt = groupProducts.reduce(
      (latest, product) => {
        const date = new Date(product?.updatedAt || 0).getTime();
        return Math.max(latest, date || 0);
      },
      0,
    );

    groups.push({
      id: groupIds.sort().join("-"),
      productIds: groupIds,
      products: groupProducts,
      patternNumber: patternNumbers[0] || "",
      hasPatternConflict: patternNumbers.length > 1,
      categories,
      latestUpdatedAt,
    });
  });

  return groups;
};

export default function ExistingProductGroupsPage() {
  const products = useAdminProductStore((state) => state.products);
  const loading = useAdminProductStore((state) => state.loading);

  const fetchAllProducts = useAdminProductStore(
    (state) => state.fetchAllProducts,
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("updated-desc");

  useEffect(() => {
    fetchAllProducts({
      sort: "newest",
    });
  }, [fetchAllProducts]);

  const groups = useMemo(
    () => buildProductGroups(products),
    [products],
  );

  const categories = useMemo(() => {
    const values = new Set();

    groups.forEach((group) => {
      group.categories.forEach((item) => values.add(item));
    });

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const query = search.toLowerCase().trim();

    const list = groups.filter((group) => {
      const matchesSearch =
        !query ||
        group.patternNumber.toLowerCase().includes(query) ||
        group.products.some((product) => {
          const title = str(product?.title).toLowerCase();
          const code = str(product?.productCode).toLowerCase();

          return title.includes(query) || code.includes(query);
        });

      const matchesCategory =
        category === "all" ||
        group.categories.includes(category);

      return matchesSearch && matchesCategory;
    });

    return [...list].sort((a, b) => {
      if (sort === "size-desc") {
        return b.products.length - a.products.length;
      }

      if (sort === "size-asc") {
        return a.products.length - b.products.length;
      }

      if (sort === "pattern-asc") {
        return a.patternNumber.localeCompare(b.patternNumber);
      }

      return b.latestUpdatedAt - a.latestUpdatedAt;
    });
  }, [groups, search, category, sort]);

  const groupedProductCount = useMemo(
    () =>
      new Set(
        groups.flatMap((group) => group.productIds),
      ).size,
    [groups],
  );

  return (
    <main className="min-h-screen bg-[#f6f6f6] p-4 text-black md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <Link
                href="/products/product-groups"
                className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 transition hover:bg-black hover:text-white"
              >
                <ArrowLeft size={17} />
              </Link>

              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                  <Layers3 size={14} />
                  Product Groups
                </div>

                <h1 className="text-2xl font-semibold tracking-tight">
                  Existing Product Groups
                </h1>

                <p className="mt-1 text-sm text-black/50">
                  View grouped products, shared pattern numbers, and
                  cross-sell associations.
                </p>
              </div>
            </div>

            <Link
              href="/products/product-groups"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"
            >
              Create New Group
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f6f6f6] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/40">
                Total groups
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {groups.length}
              </p>
            </div>

            <div className="rounded-xl bg-[#f6f6f6] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/40">
                Grouped products
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {groupedProductCount}
              </p>
            </div>

            <div className="rounded-xl bg-[#f6f6f6] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-black/40">
                Ungrouped products
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {Math.max(0, products.length - groupedProductCount)}
              </p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-[minmax(0,1fr)_220px_190px]">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-[#fafafa] px-3">
              <Search size={17} className="text-black/40" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search product, code or pattern..."
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
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
            >
              <option value="updated-desc">
                Recently updated
              </option>
              <option value="size-desc">
                Largest group first
              </option>
              <option value="size-asc">
                Smallest group first
              </option>
              <option value="pattern-asc">
                Pattern A–Z
              </option>
            </select>
          </div>

          <div className="border-b border-black/10 px-4 py-3 text-xs text-black/45">
            Showing {filteredGroups.length} product groups
          </div>

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-black/40"
              />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f1f1]">
                <Users size={25} className="text-black/45" />
              </div>

              <h2 className="font-semibold">
                No product groups found
              </h2>

              <p className="mt-1 max-w-sm text-sm text-black/45">
                Create a product group to automatically configure
                pattern numbers and cross-sell products.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {filteredGroups.map((group, groupIndex) => {
                const primaryProduct = group.products[0];

                return (
                  <article
                    key={group.id}
                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-black/10 bg-[#fafafa] p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">
                          Product Group {groupIndex + 1}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {group.patternNumber ||
                              "No pattern number"}
                          </h2>

                          {group.hasPatternConflict && (
                            <span className="rounded-full bg-black px-2 py-1 text-[10px] font-medium text-white">
                              Pattern mismatch
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/products/product-groups?productId=${primaryProduct?._id}`}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-black/10 bg-white px-3 text-xs font-medium transition hover:bg-black hover:text-white"
                      >
                        Edit Group
                        <ChevronRight size={14} />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                      {group.products.map((product) => {
                        const id = str(product?._id);
                        const image = getImage(product);

                        return (
                          <div
                            key={id}
                            className="overflow-hidden rounded-xl border border-black/10"
                          >
                            <div className="aspect-[4/5] bg-[#eeeeee]">
                              {image ? (
                                <img
                                  src={image}
                                  alt={product?.title || ""}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-black/30">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="p-2.5">
                              <p className="line-clamp-2 text-xs font-semibold">
                                {product?.title}
                              </p>

                              <p className="mt-1 text-[11px] text-black/40">
                                #{product?.productCode}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {group.categories.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-[#eeeeee] px-2 py-1 text-[10px]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <span className="text-xs font-medium text-black/45">
                        {group.products.length} products
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}