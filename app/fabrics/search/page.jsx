"use client";

import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Filter,
    PackageSearch,
    RefreshCw,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import useFabricStore from "@/store/fabricStore";

const INITIAL_FILTERS = {
    q: "",
    name: "",
    fabricCode: "",
    productCode: "",
    category: "",
    unit: "",
    status: "",
    movementStatus: "",
    isActive: "",
    isLowStock: "",
    sortBy: "name",
    sortOrder: "asc",
    page: 1,
    limit: 20,
};

const normalizeFabricCode = (value = "") => {
    const raw = String(value || "")
        .trim()
        .toUpperCase();

    if (!raw) return "";

    const digits = raw
        .replace(/^F/, "")
        .replace(/\D/g, "");

    if (!digits) return raw;

    return `F${digits.padStart(5, "0")}`;
};

const normalizeProductCode = (value = "") => {
    const raw = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

    if (!raw) return "";

    if (/^\d+$/.test(raw)) {
        return raw.padStart(5, "0");
    }

    return raw;
};

const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatStock = (value) => {
    const stock = Number(value || 0);

    return stock.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    });
};

const getStatusLabel = (value = "") =>
    String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) =>
            character.toUpperCase()
        );

const STATUS_OPTIONS = [
    {
        label: "All statuses",
        value: "",
    },
    {
        label: "Active",
        value: "active",
    },
    {
        label: "Inactive",
        value: "inactive",
    },
    {
        label: "Discontinued",
        value: "discontinued",
    },
];

const MOVEMENT_OPTIONS = [
    {
        label: "All movement states",
        value: "",
    },
    {
        label: "Idle",
        value: "idle",
    },
    {
        label: "Incoming",
        value: "incoming",
    },
    {
        label: "In use",
        value: "in_use",
    },
    {
        label: "Outgoing",
        value: "outgoing",
    },
];

const UNIT_OPTIONS = [
    {
        label: "All units",
        value: "",
    },
    {
        label: "Meter",
        value: "meter",
    },
    {
        label: "Kilogram",
        value: "kg",
    },
];

const ACTIVE_OPTIONS = [
    {
        label: "All records",
        value: "",
    },
    {
        label: "Active records",
        value: "true",
    },
    {
        label: "Inactive records",
        value: "false",
    },
];

const LOW_STOCK_OPTIONS = [
    {
        label: "All stock states",
        value: "",
    },
    {
        label: "Low stock only",
        value: "true",
    },
    {
        label: "Healthy stock only",
        value: "false",
    },
];

const SORT_OPTIONS = [
    {
        label: "Fabric name",
        value: "name",
    },
    {
        label: "Fabric code",
        value: "code",
    },
    {
        label: "Category",
        value: "category",
    },
    {
        label: "Current stock",
        value: "currentStock",
    },
    {
        label: "Low-stock threshold",
        value: "lowStockThreshold",
    },
    {
        label: "Associated products",
        value: "associatedProductsCount",
    },
    {
        label: "Created date",
        value: "createdAt",
    },
    {
        label: "Updated date",
        value: "updatedAt",
    },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

function StatusBadge({ children, variant = "neutral" }) {
    const classes = {
        neutral:
            "border-zinc-200 bg-zinc-50 text-zinc-700",
        success:
            "border-emerald-200 bg-emerald-50 text-emerald-700",
        danger:
            "border-red-200 bg-red-50 text-red-700",
        warning:
            "border-amber-200 bg-amber-50 text-amber-700",
        info:
            "border-blue-200 bg-blue-50 text-blue-700",
        dark:
            "border-zinc-300 bg-zinc-900 text-white",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes[variant]}`}
        >
            {children}
        </span>
    );
}

function InputField({
    label,
    name,
    value,
    onChange,
    placeholder,
    onBlur,
}) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700">
                {label}
            </span>

            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/5"
            />
        </label>
    );
}

function SelectField({
    label,
    name,
    value,
    onChange,
    options,
}) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700">
                {label}
            </span>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/5"
            >
                {options.map((option) => (
                    <option
                        key={`${name}-${option.value}`}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default function FabricSearchPage() {
    const {
        searchResults = [],
        pagination = {},
        loading,
        error,
        searchFabrics,
        clearSearchResults,
        clearError,
    } = useFabricStore();

    const [filters, setFilters] = useState(
        INITIAL_FILTERS
    );

    const [hasSearched, setHasSearched] =
        useState(false);

    const activeFilterCount = useMemo(() => {
        const ignoredKeys = [
            "page",
            "limit",
            "sortBy",
            "sortOrder",
        ];

        return Object.entries(filters).filter(
            ([key, value]) =>
                !ignoredKeys.includes(key) &&
                value !== "" &&
                value !== null &&
                value !== undefined
        ).length;
    }, [filters]);

    const executeSearch = useCallback(
        async (
            overrideFilters = {},
            options = {}
        ) => {
            const {
                normalizeCodes = true,
                markAsSearched = true,
            } = options;

            const mergedFilters = {
                ...filters,
                ...overrideFilters,
            };

            const payload = {
                ...mergedFilters,
            };

            if (
                normalizeCodes &&
                payload.fabricCode
            ) {
                payload.fabricCode =
                    normalizeFabricCode(
                        payload.fabricCode
                    );
            }

            if (
                normalizeCodes &&
                payload.productCode
            ) {
                payload.productCode =
                    normalizeProductCode(
                        payload.productCode
                    );
            }

            setFilters(payload);

            if (markAsSearched) {
                setHasSearched(true);
            }

            return searchFabrics(payload);
        },
        [filters, searchFabrics]
    );

    useEffect(() => {
        clearSearchResults?.();
        clearError?.();

        return () => {
            clearSearchResults?.();
        };
    }, [clearError, clearSearchResults]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFilters((current) => ({
            ...current,
            [name]: value,
            page:
                name === "page"
                    ? Number(value)
                    : 1,
        }));
    };

    const handleFabricCodeBlur = () => {
        setFilters((current) => ({
            ...current,
            fabricCode: current.fabricCode
                ? normalizeFabricCode(
                    current.fabricCode
                )
                : "",
        }));
    };

    const handleProductCodeBlur = () => {
        setFilters((current) => ({
            ...current,
            productCode: current.productCode
                ? normalizeProductCode(
                    current.productCode
                )
                : "",
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        await executeSearch({
            page: 1,
        });
    };

    const handleReset = () => {
        setFilters(INITIAL_FILTERS);
        setHasSearched(false);
        clearSearchResults?.();
        clearError?.();
    };

    const handlePageChange = async (page) => {
        const nextPage = Math.max(
            1,
            Math.min(
                page,
                Number(pagination.totalPages || 1)
            )
        );

        await executeSearch({
            page: nextPage,
        });
    };

    const handleLimitChange = async (event) => {
        const limit = Number(event.target.value);

        setFilters((current) => ({
            ...current,
            limit,
            page: 1,
        }));

        if (hasSearched) {
            await executeSearch({
                limit,
                page: 1,
            });
        }
    };

    const handleSortChange = async (event) => {
        const sortBy = event.target.value;

        setFilters((current) => ({
            ...current,
            sortBy,
            page: 1,
        }));

        if (hasSearched) {
            await executeSearch({
                sortBy,
                page: 1,
            });
        }
    };

    const handleSortOrderChange = async (
        event
    ) => {
        const sortOrder = event.target.value;

        setFilters((current) => ({
            ...current,
            sortOrder,
            page: 1,
        }));

        if (hasSearched) {
            await executeSearch({
                sortOrder,
                page: 1,
            });
        }
    };

    const totalResults = Number(
        pagination.total || 0
    );

    const currentPage = Number(
        pagination.page || filters.page || 1
    );

    const totalPages = Math.max(
        Number(pagination.totalPages || 1),
        1
    );

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1500px] space-y-5">
                {/* Header */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Link
                                href="/fabrics"
                                aria-label="Back to fabrics"
                                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                            >
                                <ArrowLeft size={18} />
                            </Link>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                                        Fabric Search
                                    </h1>

                                    {activeFilterCount > 0 && (
                                        <StatusBadge variant="dark">
                                            {activeFilterCount} filter
                                            {activeFilterCount !== 1
                                                ? "s"
                                                : ""}
                                        </StatusBadge>
                                    )}
                                </div>

                                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                                    Search fabrics using any
                                    combination of name, fabric
                                    code, category, product code,
                                    stock state and activity
                                    filters.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/fabrics/add-fabric"
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-950"
                            >
                                Add Fabric
                            </Link>

                            <Link
                                href="/fabrics/inventory"
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                            >
                                View Inventory
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Search Filters */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                                <SlidersHorizontal size={17} />
                            </div>

                            <div>
                                <h2 className="text-sm font-bold">
                                    Search filters
                                </h2>
                                <p className="text-xs text-zinc-500">
                                    Multiple filters work together.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={loading}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RotateCcw size={14} />
                            Reset filters
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <InputField
                            label="General search"
                            name="q"
                            value={filters.q}
                            onChange={handleChange}
                            placeholder="Name, code, category..."
                        />

                        <InputField
                            label="Fabric name"
                            name="name"
                            value={filters.name}
                            onChange={handleChange}
                            placeholder="Example: Cotton Lycra"
                        />

                        <InputField
                            label="Fabric code"
                            name="fabricCode"
                            value={filters.fabricCode}
                            onChange={handleChange}
                            onBlur={handleFabricCodeBlur}
                            placeholder="12 or F00012"
                        />

                        <InputField
                            label="Product code"
                            name="productCode"
                            value={filters.productCode}
                            onChange={handleChange}
                            onBlur={handleProductCodeBlur}
                            placeholder="279 or 00279"
                        />

                        <InputField
                            label="Category"
                            name="category"
                            value={filters.category}
                            onChange={handleChange}
                            placeholder="Example: Knitted"
                        />

                        <SelectField
                            label="Unit"
                            name="unit"
                            value={filters.unit}
                            onChange={handleChange}
                            options={UNIT_OPTIONS}
                        />

                        <SelectField
                            label="Fabric status"
                            name="status"
                            value={filters.status}
                            onChange={handleChange}
                            options={STATUS_OPTIONS}
                        />

                        <SelectField
                            label="Movement status"
                            name="movementStatus"
                            value={
                                filters.movementStatus
                            }
                            onChange={handleChange}
                            options={MOVEMENT_OPTIONS}
                        />

                        <SelectField
                            label="Record state"
                            name="isActive"
                            value={filters.isActive}
                            onChange={handleChange}
                            options={ACTIVE_OPTIONS}
                        />

                        <SelectField
                            label="Stock state"
                            name="isLowStock"
                            value={filters.isLowStock}
                            onChange={handleChange}
                            options={LOW_STOCK_OPTIONS}
                        />

                        <SelectField
                            label="Sort by"
                            name="sortBy"
                            value={filters.sortBy}
                            onChange={handleSortChange}
                            options={SORT_OPTIONS}
                        />

                        <SelectField
                            label="Sort order"
                            name="sortOrder"
                            value={filters.sortOrder}
                            onChange={
                                handleSortOrderChange
                            }
                            options={[
                                {
                                    label: "Ascending",
                                    value: "asc",
                                },
                                {
                                    label: "Descending",
                                    value: "desc",
                                },
                            ]}
                        />
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Filter size={14} />

                            <span>
                                Fabric and product codes are
                                normalized automatically.
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <RefreshCw
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Search size={17} />
                            )}

                            {loading
                                ? "Searching..."
                                : "Search Fabrics"}
                        </button>
                    </div>
                </form>

                {/* Error */}
                {error && (
                    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                        {error}
                    </section>
                )}

                {/* Results */}
                <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-bold">
                                Search results
                            </h2>

                            <p className="mt-0.5 text-xs text-zinc-500">
                                {hasSearched
                                    ? `${totalResults} fabric result${totalResults !== 1
                                        ? "s"
                                        : ""
                                    } found`
                                    : "Apply filters and search to view fabrics."}
                            </p>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                            Results per page

                            <select
                                value={filters.limit}
                                onChange={handleLimitChange}
                                className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 outline-none focus:border-zinc-950"
                            >
                                {LIMIT_OPTIONS.map(
                                    (limit) => (
                                        <option
                                            key={limit}
                                            value={limit}
                                        >
                                            {limit}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                    </div>

                    {!hasSearched && !loading && (
                        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
                                <PackageSearch size={25} />
                            </div>

                            <h3 className="mt-4 text-base font-bold">
                                Search the fabric catalogue
                            </h3>

                            <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
                                You can use one filter or combine
                                multiple filters to narrow down
                                exact fabric records.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-3 p-5">
                            {Array.from({
                                length: 6,
                            }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-24 animate-pulse rounded-xl bg-zinc-100"
                                />
                            ))}
                        </div>
                    )}

                    {hasSearched &&
                        !loading &&
                        searchResults.length === 0 && (
                            <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-14 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
                                    <Search size={24} />
                                </div>

                                <h3 className="mt-4 text-base font-bold">
                                    No fabrics found
                                </h3>

                                <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
                                    Try removing one or more
                                    filters, or check the fabric and
                                    product codes.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold transition hover:border-zinc-950"
                                >
                                    <RotateCcw size={15} />
                                    Clear filters
                                </button>
                            </div>
                        )}

                    {!loading &&
                        searchResults.length > 0 && (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-200 bg-zinc-50">
                                                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Fabric
                                                </th>

                                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Category
                                                </th>

                                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Stock
                                                </th>

                                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Product codes
                                                </th>

                                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Status
                                                </th>

                                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Updated
                                                </th>

                                                <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {searchResults.map(
                                                (fabric) => (
                                                    <tr
                                                        key={fabric._id}
                                                        className="border-b border-zinc-100 align-top transition last:border-b-0 hover:bg-zinc-50/70"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex min-w-[230px] items-center gap-3">
                                                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                                                    {fabric.imageLink ? (
                                                                        <Image
                                                                            src={
                                                                                fabric.imageLink
                                                                            }
                                                                            alt={
                                                                                fabric.name ||
                                                                                "Fabric"
                                                                            }
                                                                            fill
                                                                            sizes="48px"
                                                                            className="object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                                                            <PackageSearch
                                                                                size={18}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-bold text-zinc-950">
                                                                        {fabric.name}
                                                                    </p>

                                                                    <p className="mt-1 font-mono text-xs font-semibold text-zinc-500">
                                                                        {fabric.code}
                                                                    </p>

                                                                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-zinc-500">
                                                                        {fabric.gsm && (
                                                                            <span>
                                                                                {
                                                                                    fabric.gsm
                                                                                }{" "}
                                                                                GSM
                                                                            </span>
                                                                        )}

                                                                        {fabric.gsm &&
                                                                            fabric.width && (
                                                                                <span>
                                                                                    •
                                                                                </span>
                                                                            )}

                                                                        {fabric.width && (
                                                                            <span>
                                                                                {
                                                                                    fabric.width
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="text-sm font-semibold text-zinc-800">
                                                                {fabric.category ||
                                                                    "—"}
                                                            </p>

                                                            <p className="mt-1 text-xs capitalize text-zinc-500">
                                                                {fabric.unit ||
                                                                    "—"}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="text-sm font-bold">
                                                                {formatStock(
                                                                    fabric.currentStock
                                                                )}{" "}
                                                                <span className="text-xs font-medium text-zinc-500">
                                                                    {fabric.unit}
                                                                </span>
                                                            </p>

                                                            <p className="mt-1 text-xs text-zinc-500">
                                                                Threshold:{" "}
                                                                {formatStock(
                                                                    fabric.lowStockThreshold
                                                                )}
                                                            </p>

                                                            <div className="mt-2">
                                                                {fabric.isLowStock ? (
                                                                    <StatusBadge variant="danger">
                                                                        Low stock
                                                                    </StatusBadge>
                                                                ) : (
                                                                    <StatusBadge variant="success">
                                                                        Healthy
                                                                    </StatusBadge>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="max-w-[270px]">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {fabric
                                                                        .associatedProductCodes
                                                                        ?.length ? (
                                                                        fabric.associatedProductCodes
                                                                            .slice(0, 5)
                                                                            .map(
                                                                                (
                                                                                    code
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            code
                                                                                        }
                                                                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] font-semibold text-zinc-700"
                                                                                    >
                                                                                        {
                                                                                            code
                                                                                        }
                                                                                    </span>
                                                                                )
                                                                            )
                                                                    ) : (
                                                                        <span className="text-xs text-zinc-400">
                                                                            No products
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {(fabric
                                                                    .associatedProductCodes
                                                                    ?.length ||
                                                                    0) > 5 && (
                                                                        <p className="mt-1.5 text-[11px] font-semibold text-zinc-500">
                                                                            +
                                                                            {fabric
                                                                                .associatedProductCodes
                                                                                .length -
                                                                                5}{" "}
                                                                            more
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                <StatusBadge
                                                                    variant={
                                                                        fabric.status ===
                                                                            "active"
                                                                            ? "success"
                                                                            : fabric.status ===
                                                                                "discontinued"
                                                                                ? "danger"
                                                                                : "warning"
                                                                    }
                                                                >
                                                                    {getStatusLabel(
                                                                        fabric.status
                                                                    )}
                                                                </StatusBadge>

                                                                <StatusBadge variant="info">
                                                                    {getStatusLabel(
                                                                        fabric.movementStatus
                                                                    )}
                                                                </StatusBadge>

                                                                {!fabric.isActive && (
                                                                    <StatusBadge variant="neutral">
                                                                        Deactivated
                                                                    </StatusBadge>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-[150px] text-xs leading-5 text-zinc-500">
                                                                {formatDate(
                                                                    fabric.updatedAt
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4 text-right">
                                                            <Link
                                                                href={`/fabrics/${fabric._id}`}
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-950"
                                                            >
                                                                Open
                                                                <ExternalLink size={13} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="divide-y divide-zinc-100 lg:hidden">
                                    {searchResults.map(
                                        (fabric) => (
                                            <article
                                                key={fabric._id}
                                                className="space-y-4 p-5"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                                        {fabric.imageLink ? (
                                                            <Image
                                                                src={
                                                                    fabric.imageLink
                                                                }
                                                                alt={
                                                                    fabric.name ||
                                                                    "Fabric"
                                                                }
                                                                fill
                                                                sizes="56px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                                                <PackageSearch
                                                                    size={19}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-bold">
                                                            {fabric.name}
                                                        </p>

                                                        <p className="mt-1 font-mono text-xs font-semibold text-zinc-500">
                                                            {fabric.code}
                                                        </p>

                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {fabric.category} •{" "}
                                                            {fabric.unit}
                                                        </p>
                                                    </div>

                                                    <Link
                                                        href={`/fabrics/${fabric._id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200"
                                                        aria-label={`Open ${fabric.name} in new tab`}
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-zinc-500">
                                                            Current stock
                                                        </p>

                                                        <p className="mt-1 text-sm font-bold">
                                                            {formatStock(
                                                                fabric.currentStock
                                                            )}{" "}
                                                            {fabric.unit}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-[11px] font-medium text-zinc-500">
                                                            Threshold
                                                        </p>

                                                        <p className="mt-1 text-sm font-bold">
                                                            {formatStock(
                                                                fabric.lowStockThreshold
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {fabric.isLowStock ? (
                                                        <StatusBadge variant="danger">
                                                            Low stock
                                                        </StatusBadge>
                                                    ) : (
                                                        <StatusBadge variant="success">
                                                            Healthy stock
                                                        </StatusBadge>
                                                    )}

                                                    <StatusBadge variant="neutral">
                                                        {getStatusLabel(
                                                            fabric.status
                                                        )}
                                                    </StatusBadge>

                                                    <StatusBadge variant="info">
                                                        {getStatusLabel(
                                                            fabric.movementStatus
                                                        )}
                                                    </StatusBadge>
                                                </div>

                                                <div>
                                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                                        Associated products
                                                    </p>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {fabric
                                                            .associatedProductCodes
                                                            ?.length ? (
                                                            fabric.associatedProductCodes
                                                                .slice(0, 8)
                                                                .map((code) => (
                                                                    <span
                                                                        key={code}
                                                                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px] font-semibold"
                                                                    >
                                                                        {code}
                                                                    </span>
                                                                ))
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">
                                                                No product codes
                                                                assigned
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        )
                                    )}
                                </div>

                                {/* Pagination */}
                                <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-zinc-500">
                                        Page{" "}
                                        <span className="font-bold text-zinc-950">
                                            {currentPage}
                                        </span>{" "}
                                        of{" "}
                                        <span className="font-bold text-zinc-950">
                                            {totalPages}
                                        </span>
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePageChange(
                                                    currentPage - 1
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                currentPage <= 1
                                            }
                                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-xs font-semibold transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <ChevronLeft
                                                size={15}
                                            />
                                            Previous
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePageChange(
                                                    currentPage + 1
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                currentPage >= totalPages
                                            }
                                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-xs font-semibold transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Next
                                            <ChevronRight
                                                size={15}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                </section>
            </div>
        </main>
    );
}