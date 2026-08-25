"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckSquare,
  Layers3,
  PackageSearch,
  RefreshCcw,
  Save,
  Search,
  Square,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";
import useFabricStore from "@/store/fabricStore";
import FabricSelectDropdown from "@/components/product/FabricSelectDropdown";

const SORTS = [
  { value: "code_asc", label: "Product Code ↑" },
  { value: "code_desc", label: "Product Code ↓" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  {
    value: "consumption_asc",
    label: "Consumption Low–High",
  },
  {
    value: "consumption_desc",
    label: "Consumption High–Low",
  },
];

const safe = (v) => String(v ?? "").trim();

const getProductImage = (product) =>
  product?.thumbnail ||
  product?.image ||
  product?.images?.[0] ||
  "/placeholder.png";

export default function AddFabricConsumptionPage() {
  const {
    products,
    loading,
    saving,
    fetchAllProducts,
    updateFabricConsumption,
  } = useAdminProductStore();

  const {
    fabricOptions,
    fetchFabricOptions,
    addAssociatedProductCodes,
  } = useFabricStore();

  const [nameSearch, setNameSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("code_asc");

  const [selectedIds, setSelectedIds] = useState([]);
  const [drafts, setDrafts] = useState({});

  const [bulkFabricId, setBulkFabricId] =
    useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkUnit, setBulkUnit] =
    useState("meter");

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchAllProducts();
    fetchFabricOptions();
  }, [fetchAllProducts, fetchFabricOptions]);

  /* ================= CATEGORIES ================= */

  const categories = useMemo(() => {
    const set = new Set();

    products.forEach((product) => {
      (product?.categories || []).forEach((cat) => {
        if (cat) set.add(cat);
      });
    });

    return [...set].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }, [products]);

  /* ================= FILTER + SORT ================= */

  const filteredProducts = useMemo(() => {
    let list = [...products];

    const nameQ = nameSearch
      .trim()
      .toLowerCase();

    const codeQ = codeSearch
      .trim()
      .toLowerCase();

    if (nameQ) {
      list = list.filter((product) =>
        safe(product?.title)
          .toLowerCase()
          .includes(nameQ),
      );
    }

    if (codeQ) {
      list = list.filter((product) =>
        safe(product?.productCode)
          .toLowerCase()
          .includes(codeQ),
      );
    }

    if (category !== "all") {
      list = list.filter((product) =>
        (product?.categories || []).includes(
          category,
        ),
      );
    }

    list.sort((a, b) => {
      const aCode = safe(a?.productCode);
      const bCode = safe(b?.productCode);

      const aName = safe(a?.title).toLowerCase();
      const bName = safe(b?.title).toLowerCase();

      const aConsumption = Number(
        a?.avgFabricConsumption?.value || 0,
      );

      const bConsumption = Number(
        b?.avgFabricConsumption?.value || 0,
      );

      switch (sort) {
        case "code_desc":
          return bCode.localeCompare(
            aCode,
            undefined,
            { numeric: true },
          );

        case "name_asc":
          return aName.localeCompare(bName);

        case "name_desc":
          return bName.localeCompare(aName);

        case "consumption_asc":
          return aConsumption - bConsumption;

        case "consumption_desc":
          return bConsumption - aConsumption;

        default:
          return aCode.localeCompare(
            bCode,
            undefined,
            { numeric: true },
          );
      }
    });

    return list;
  }, [
    products,
    nameSearch,
    codeSearch,
    category,
    sort,
  ]);

  /* ================= EXISTING FABRIC ================= */

  const findExistingFabric = (product) => {
    const productFabric =
      product?.fabrics?.find(
        (fabric) => fabric?.role === "main",
      ) ||
      product?.fabrics?.[0] ||
      null;

    if (!productFabric) return null;

    return (
      fabricOptions.find(
        (fabric) =>
          safe(fabric?.code).toLowerCase() ===
          safe(
            productFabric?.fabricCode,
          ).toLowerCase(),
      ) || null
    );
  };

  /* ================= DRAFT ================= */

  const getDraft = (product) => {
    if (drafts[product._id]) {
      return drafts[product._id];
    }

    const fabric = findExistingFabric(product);

    return {
      fabricId: fabric?._id || "",

      value:
        product?.avgFabricConsumption?.value !==
          undefined
          ? String(
            product.avgFabricConsumption.value,
          )
          : "",

      unit:
        product?.avgFabricConsumption?.unit ||
        "meter",
    };
  };

  const updateDraft = (product, patch) => {
    setDrafts((prev) => ({
      ...prev,

      [product._id]: {
        ...getDraft(product),
        ...(prev[product._id] || {}),
        ...patch,
      },
    }));
  };

  /* ================= SINGLE SAVE ================= */

  const handleSingleSave = async (product) => {
    const draft = getDraft(product);

    const fabric =
      fabricOptions.find(
        (item) =>
          String(item?._id) ===
          String(draft.fabricId),
      ) || null;

    if (!fabric) {
      alert("Please select a fabric");
      return;
    }

    const consumption = Number(draft.value);

    if (
      draft.value === "" ||
      !Number.isFinite(consumption) ||
      consumption < 0
    ) {
      alert("Enter valid fabric consumption");
      return;
    }

    await updateFabricConsumption({
      id: product._id,

      fabrics: [
        {
          fabricName: fabric.name,
          fabricCode: fabric.code,
          fabricColor: "",
          role: "main",
        },
      ],

      avgFabricConsumption: {
        value: consumption,
        unit: draft.unit,
      },
    });

    if (product?.productCode) {
      await addAssociatedProductCodes(
        fabric._id,
        [product.productCode],
      );
    }

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[product._id];
      return next;
    });
  };

  /* ================= SELECTION ================= */

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) =>
      selectedIds.includes(product._id),
    );

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map(
      (product) => product._id,
    );

    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);

      setSelectedIds((prev) =>
        prev.filter(
          (id) => !visibleSet.has(id),
        ),
      );

      return;
    }

    setSelectedIds((prev) => [
      ...new Set([...prev, ...visibleIds]),
    ]);
  };

  /* ================= BULK SAVE ================= */

  const handleBulkApply = async () => {
    if (!selectedIds.length) return;

    const fabric =
      fabricOptions.find(
        (item) =>
          String(item?._id) ===
          String(bulkFabricId),
      ) || null;

    if (!fabric) {
      alert("Select fabric");
      return;
    }

    const consumption = Number(bulkValue);

    if (
      bulkValue === "" ||
      !Number.isFinite(consumption) ||
      consumption < 0
    ) {
      alert("Enter valid consumption");
      return;
    }

    await updateFabricConsumption({
      ids: selectedIds,

      fabrics: [
        {
          fabricName: fabric.name,
          fabricCode: fabric.code,
          fabricColor: "",
          role: "main",
        },
      ],

      avgFabricConsumption: {
        value: consumption,
        unit: bulkUnit,
      },
    });

    const productCodes = products
      .filter((product) =>
        selectedIds.includes(product._id),
      )
      .map((product) => product.productCode)
      .filter(Boolean);

    if (productCodes.length) {
      await addAssociatedProductCodes(
        fabric._id,
        productCodes,
      );
    }

    setBulkFabricId("");
    setBulkValue("");
    setSelectedIds([]);
  };

  const clearFilters = () => {
    setNameSearch("");
    setCodeSearch("");
    setCategory("all");
    setSort("code_asc");
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-900 p-2 text-white">
            <Layers3 size={18} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              Fabric Consumption
            </h1>

            <p className="text-sm text-zinc-500">
              Assign fabric and average consumption
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchAllProducts();
            fetchFabricOptions();
          }}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={
              loading ? "animate-spin" : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* FILTERS */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          {/* NAME */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-500">
              Product Name
            </div>

            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={nameSearch}
                onChange={(e) =>
                  setNameSearch(e.target.value)
                }
                placeholder="Search product..."
                className="h-10 w-full rounded-lg border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* CODE */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-500">
              Product Code
            </div>

            <input
              value={codeSearch}
              onChange={(e) =>
                setCodeSearch(e.target.value)
              }
              placeholder="00001"
              className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-500">
              Category
            </div>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none"
            >
              <option value="all">
                All Categories
              </option>

              {categories.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                >
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* SORT */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-500">
              Sort
            </div>

            <div className="relative">
              <ArrowUpDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value)
                }
                className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none"
              >
                {SORTS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* BULK BAR */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mr-3">
            <div className="text-sm font-bold text-zinc-900">
              {selectedIds.length} selected
            </div>

            <div className="text-xs text-zinc-500">
              Apply same fabric
            </div>
          </div>

          <div className="min-w-[290px]">
            <div className="mb-1 text-xs font-semibold text-zinc-500">
              Fabric
            </div>

            <FabricSelectDropdown
              fabrics={fabricOptions}
              value={bulkFabricId}
              onChange={(fabric) =>
                setBulkFabricId(
                  fabric?._id || "",
                )
              }
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-zinc-500">
              Consumption
            </div>

            <input
              type="number"
              min="0"
              step="0.01"
              value={bulkValue}
              onChange={(e) =>
                setBulkValue(e.target.value)
              }
              placeholder="0.00"
              className="h-11 w-28 rounded-lg border border-zinc-200 px-3 text-sm outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-zinc-500">
              Unit
            </div>

            <select
              value={bulkUnit}
              onChange={(e) =>
                setBulkUnit(e.target.value)
              }
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="meter">
                Meter
              </option>

              <option value="gram">
                Gram
              </option>
            </select>
          </div>

          <button
            onClick={handleBulkApply}
            disabled={
              saving ||
              !bulkFabricId ||
              bulkValue === ""
            }
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Save size={14} />
            Apply
          </button>

          <button
            onClick={() =>
              setSelectedIds([])
            }
            className="h-11 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* SUMMARY */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-zinc-500">
          Showing{" "}
          <strong className="text-zinc-900">
            {filteredProducts.length}
          </strong>{" "}
          products
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <PackageSearch size={14} />
          {products.length} total
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-zinc-50">
              <tr className="border-b border-zinc-200">
                <th className="w-12 px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="text-zinc-500"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zinc-500">
                  Product
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zinc-500">
                  Code
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zinc-500">
                  Category
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zinc-500">
                  Fabric
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zinc-500">
                  Consumption
                </th>

                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-zinc-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-zinc-500"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-zinc-500"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map(
                  (product) => {
                    const draft =
                      getDraft(product);

                    const selected =
                      selectedIds.includes(
                        product._id,
                      );

                    return (
                      <tr
                        key={product._id}
                        className={`border-b border-zinc-100 last:border-none ${selected
                            ? "bg-zinc-50"
                            : "hover:bg-zinc-50/50"
                          }`}
                      >
                        {/* SELECT */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              toggleSelect(
                                product._id,
                              )
                            }
                            className={
                              selected
                                ? "text-zinc-900"
                                : "text-zinc-400"
                            }
                          >
                            {selected ? (
                              <CheckSquare
                                size={18}
                              />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>

                        {/* PRODUCT */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImage(
                                product,
                              )}
                              alt={
                                product.title || ""
                              }
                              className="h-14 w-12 rounded-lg border border-zinc-200 object-cover"
                            />

                            <div className="min-w-[180px]">
                              <div className="text-sm font-semibold text-zinc-900">
                                {product.title}
                              </div>

                              <div className="mt-1 text-xs text-zinc-400">
                                {product.productType ||
                                  "product"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* CODE */}
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold">
                            {product.productCode}
                          </span>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-4 py-3">
                          <div className="flex max-w-[200px] flex-wrap gap-1">
                            {(
                              product.categories ||
                              []
                            )
                              .slice(0, 3)
                              .map((cat) => (
                                <span
                                  key={cat}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600"
                                >
                                  {cat}
                                </span>
                              ))}
                          </div>
                        </td>

                        {/* FABRIC */}
                        <td className="px-4 py-3">
                          <FabricSelectDropdown
                            fabrics={
                              fabricOptions
                            }
                            value={
                              draft.fabricId
                            }
                            onChange={(
                              fabric,
                            ) =>
                              updateDraft(
                                product,
                                {
                                  fabricId:
                                    fabric?._id ||
                                    "",
                                },
                              )
                            }
                          />
                        </td>

                        {/* CONSUMPTION */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                draft.value
                              }
                              onChange={(e) =>
                                updateDraft(
                                  product,
                                  {
                                    value:
                                      e.target
                                        .value,
                                  },
                                )
                              }
                              placeholder="0.00"
                              className="h-10 w-24 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                            />

                            <select
                              value={
                                draft.unit
                              }
                              onChange={(e) =>
                                updateDraft(
                                  product,
                                  {
                                    unit:
                                      e.target
                                        .value,
                                  },
                                )
                              }
                              className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
                            >
                              <option value="meter">
                                Meter
                              </option>

                              <option value="gram">
                                Gram
                              </option>
                            </select>
                          </div>
                        </td>

                        {/* SAVE */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              handleSingleSave(
                                product,
                              )
                            }
                            disabled={
                              saving ||
                              !draft.fabricId ||
                              draft.value === ""
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-40"
                          >
                            <Save size={14} />
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
