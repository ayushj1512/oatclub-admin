"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Package,
  RefreshCcw,
  Search,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { useAdminProductStore } from "@/store/adminProductStore";

const SIZES = ["XS", "S", "M", "L", "XL"];
const PAGE_LIMIT = 70;

const getVariantSize = (variant = {}) => {
  if (variant?.size) {
    return String(variant.size).trim().toUpperCase();
  }

  const attributes = Array.isArray(variant?.attributes)
    ? variant.attributes
    : [];

  return String(
    attributes.find((attribute) =>
      ["size", "sizes", "shirt_size"].includes(
        String(attribute?.key || "")
          .trim()
          .toLowerCase(),
      ),
    )?.value || "",
  )
    .trim()
    .toUpperCase();
};

const getSizeInventory = (product, size) => {
  const variants = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const variant = variants.find(
    (item) => getVariantSize(item) === size,
  );

  if (!variant) {
    return {
      total: 0,
      reserved: 0,
      available: 0,
    };
  }

  const total = Number(variant?.stock || 0);
  const reserved = Number(variant?.reservedStock || 0);

  const available = Math.max(
    0,
    Number(
      variant?.availableStock ??
      total - reserved,
    ),
  );

  return {
    total,
    reserved,
    available,
  };
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

export default function AvailableInventoryPage() {
  const {
    inventoryProducts = [],
    inventorySummary = {},
    inventoryPage = 1,
    inventoryPages = 1,
    inventoryTotal = 0,
    inventoryLoading = false,
    inventoryError = null,
    fetchInventoryProducts,
  } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("all");
  const [sort, setSort] = useState("available_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const loadInventory = async (page = 1) => {
    await fetchInventoryProducts({
      page,
      limit: PAGE_LIMIT,
      q: search,
      category,
      sort,
      hideFootwear: true,
      ...(stockStatus !== "all"
        ? { inStock: stockStatus === "available" }
        : {}),
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadInventory(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, category, stockStatus, sort]);

  const rows = useMemo(
    () =>
      inventoryProducts.map((product) => ({
        ...product,
        sizeStock: Object.fromEntries(
          SIZES.map((size) => [
            size,
            getSizeInventory(product, size),
          ]),
        ),
      })),
    [inventoryProducts],
  );

  const handlePageChange = async (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > inventoryPages ||
      inventoryLoading
    ) {
      return;
    }

    setCurrentPage(nextPage);
    await loadInventory(nextPage);
  };

  const handleExcelExport = async () => {
    if (!rows.length) return;

    try {
      setExporting(true);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Available Inventory");

      sheet.columns = [
        {
          header: "Product Code",
          key: "productCode",
          width: 18,
        },
        {
          header: "Product Name",
          key: "productName",
          width: 40,
        },

        ...SIZES.flatMap((size) => [
          {
            header: `${size} Total`,
            key: `${size.toLowerCase()}Total`,
            width: 12,
          },
          {
            header: `${size} Reserved`,
            key: `${size.toLowerCase()}Reserved`,
            width: 14,
          },
          {
            header: `${size} Available`,
            key: `${size.toLowerCase()}Available`,
            width: 14,
          },
        ]),

        {
          header: "Total Inventory",
          key: "totalInventory",
          width: 16,
        },
        {
          header: "Total Reserved",
          key: "reservedInventory",
          width: 16,
        },
        {
          header: "Total Available",
          key: "availableInventory",
          width: 16,
        },
      ];

      rows.forEach((product) => {
        const row = {
          productCode: product?.productCode || "",
          productName:
            product?.name || product?.title || "",

          totalInventory: Number(
            product?.totalInventory ??
            product?.stock ??
            0,
          ),

          reservedInventory: Number(
            product?.reservedInventory ??
            product?.reservedStock ??
            0,
          ),

          availableInventory: Number(
            product?.availableInventory ??
            product?.availableStock ??
            0,
          ),
        };

        SIZES.forEach((size) => {
          const inventory = product.sizeStock[size];

          row[`${size.toLowerCase()}Total`] =
            inventory.total;

          row[`${size.toLowerCase()}Reserved`] =
            inventory.reserved;

          row[`${size.toLowerCase()}Available`] =
            inventory.available;
        });

        sheet.addRow(row);
      });

      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = {
        from: "A1",
        to: `${sheet.getColumn(sheet.columnCount).letter}1`,
      };

      const header = sheet.getRow(1);

      header.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };

      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF000000" },
      };

      header.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      header.height = 28;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.height = 24;
          row.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `oatclub-available-inventory-${new Date().toISOString().split("T")[0]
        }.xlsx`,
      );
    } catch (error) {
      console.error("Excel export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1800px] space-y-5">
        {/* Header */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              OATCLUB Inventory
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-black sm:text-3xl">
              Available Inventory
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Total, reserved and available stock by size.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadInventory(currentPage)}
              disabled={inventoryLoading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-black transition hover:border-black disabled:opacity-50"
            >
              <RefreshCcw
                size={16}
                className={
                  inventoryLoading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExcelExport}
              disabled={
                exporting ||
                inventoryLoading ||
                rows.length === 0
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Download size={16} />
              )}

              Export Excel
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Products"
            value={
              inventorySummary?.totalProducts ??
              inventoryTotal
            }
          />

          <SummaryCard
            label="Total Inventory"
            value={inventorySummary?.totalInventory}
          />

          <SummaryCard
            label="Reserved"
            value={inventorySummary?.reservedInventory}
          />

          <SummaryCard
            label="Available"
            value={inventorySummary?.availableInventory}
            dark
          />
        </section>

        {/* Filters */}
        <section className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search product, code, SKU..."
              className="h-11 w-full rounded-xl border border-neutral-200 pl-10 pr-4 text-sm outline-none transition focus:border-black"
            />
          </div>

          <input
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            placeholder="Category"
            className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none transition focus:border-black"
          />

          <select
            value={stockStatus}
            onChange={(event) =>
              setStockStatus(event.target.value)
            }
            className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black"
          >
            <option value="all">All Stock Status</option>
            <option value="available">
              Available Stock
            </option>
            <option value="zero">Zero Available</option>
          </select>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
            className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black"
          >
            <option value="available_desc">
              Available: High to Low
            </option>
            <option value="available_asc">
              Available: Low to High
            </option>
            <option value="stock_desc">
              Total Stock: High to Low
            </option>
            <option value="reserved_desc">
              Reserved: High to Low
            </option>
            <option value="code_asc">
              Product Code
            </option>
            <option value="title_asc">
              Product Name A-Z
            </option>
            <option value="updated_desc">
              Recently Updated
            </option>
          </select>
        </section>

        {inventoryError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {inventoryError}
          </div>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Package size={18} />

              <h2 className="font-semibold text-black">
                Inventory List
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {formatNumber(inventoryTotal)} products
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px]">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200">
                  <TableHead>Image</TableHead>
                  <TableHead>Product Code</TableHead>

                  <TableHead className="min-w-[260px]">
                    Product Name
                  </TableHead>

                  {SIZES.map((size) => (
                    <TableHead
                      key={size}
                      center
                    >
                      {size}
                    </TableHead>
                  ))}

                  <TableHead center>Total</TableHead>
                  <TableHead center>Reserved</TableHead>
                  <TableHead center>Available</TableHead>
                </tr>
              </thead>

              <tbody>
                {inventoryLoading && rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="h-64 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin text-neutral-500" />

                      <p className="mt-3 text-sm text-neutral-500">
                        Loading inventory...
                      </p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="h-64 text-center"
                    >
                      <Package
                        size={32}
                        className="mx-auto text-neutral-300"
                      />

                      <p className="mt-3 text-sm font-medium text-neutral-600">
                        No products found
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((product) => (
                    <tr
                      key={product.id || product._id}
                      className="border-b border-neutral-100 transition last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <div className="h-14 w-12 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                          <img
                            src={
                              product.image ||
                              product.thumbnail ||
                              "/placeholder.png"
                            }
                            alt={
                              product.name ||
                              product.title ||
                              "Product"
                            }
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold">
                          {product.productCode || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="line-clamp-2 text-sm font-semibold text-black">
                          {product.name ||
                            product.title ||
                            "Untitled Product"}
                        </p>

                        <p className="mt-1 text-xs text-neutral-400">
                          {product.productType || "simple"}
                        </p>
                      </td>

                      {SIZES.map((size) => (
                        <SizeInventoryCell
                          key={size}
                          inventory={
                            product.sizeStock[size]
                          }
                        />
                      ))}

                      <StockCell
                        value={
                          product.totalInventory ??
                          product.stock
                        }
                      />

                      <StockCell
                        value={
                          product.reservedInventory ??
                          product.reservedStock
                        }
                        reserved
                      />

                      <StockCell
                        value={
                          product.availableInventory ??
                          product.availableStock
                        }
                        available
                      />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-500">
              Page {inventoryPage || currentPage} of{" "}
              {inventoryPages || 1}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handlePageChange(currentPage - 1)
                }
                disabled={
                  currentPage <= 1 ||
                  inventoryLoading
                }
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePageChange(currentPage + 1)
                }
                disabled={
                  currentPage >= inventoryPages ||
                  inventoryLoading
                }
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-black px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, dark = false }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${dark
          ? "border-black bg-black text-white"
          : "border-neutral-200 bg-white text-black"
        }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.16em] ${dark ? "text-neutral-300" : "text-neutral-500"
          }`}
      >
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function TableHead({
  children,
  center = false,
  className = "",
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${center ? "text-center" : "text-left"
        } ${className}`}
    >
      {children}
    </th>
  );
}

function SizeInventoryCell({ inventory }) {
  const total = Number(inventory?.total || 0);
  const reserved = Number(inventory?.reserved || 0);
  const available = Number(inventory?.available || 0);

  return (
    <td className="px-3 py-3 text-center">
      <div className="mx-auto min-w-[105px] rounded-xl border border-neutral-200 bg-white px-3 py-2">
        <p
          className={`text-lg font-bold ${available > 0
              ? "text-emerald-700"
              : "text-neutral-400"
            }`}
        >
          {formatNumber(available)}
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Available
        </p>

        <div className="mt-2 flex items-center justify-center gap-2 border-t border-neutral-100 pt-2 text-[11px]">
          <span className="font-medium text-neutral-600">
            {formatNumber(total)} total
          </span>

          <span className="text-neutral-300">•</span>

          <span
            className={
              reserved > 0
                ? "font-semibold text-amber-700"
                : "text-neutral-400"
            }
          >
            {formatNumber(reserved)} reserved
          </span>
        </div>
      </div>
    </td>
  );
}

function StockCell({
  value,
  available = false,
  reserved = false,
}) {
  const stock = Number(value || 0);

  let className =
    stock > 0
      ? "bg-emerald-50 text-emerald-700"
      : "bg-neutral-100 text-neutral-400";

  if (reserved) {
    className =
      stock > 0
        ? "bg-amber-50 text-amber-700"
        : "bg-neutral-100 text-neutral-400";
  }

  if (available) {
    className =
      stock > 0
        ? "bg-black text-white"
        : "bg-red-50 text-red-600";
  }

  return (
    <td className="px-3 py-3 text-center">
      <span
        className={`inline-flex min-w-10 items-center justify-center rounded-lg px-2 py-1.5 text-sm font-semibold ${className}`}
      >
        {formatNumber(stock)}
      </span>
    </td>
  );
}
