"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import useAdminProductionStore from "@/store/adminProductionStore";

import ProductionHeader from "@/components/production/ProductionHeader";
import ProductionFilters from "@/components/production/ProductionFilters";
import ProductionBulkBar from "@/components/production/ProductionBulkBar";
import ProductionOrderCard from "@/components/production/ProductionOrderCard";
import ProductionPagination from "@/components/production/ProductionPagination";
import ProductionMetricCard from "@/components/production/ProductionMetricCard";
import {
  exportProductionXLSX,
  getPresetRange,
  toYYYYMMDD,
} from "@/components/production/productionUtils";

export default function ProductionDashboardPage() {
  const router = useRouter();
  const store = useAdminProductionStore();

  const {
    queue,
    summary,
    total,
    filters,
    queuePagination,
    loadingQueue,
    loadingSummary,
    error,
    fulfillmentStatus,
    setFulfillmentStatus,
    setSearch,
    setDateRange,
    setPackability,
    setQueuePage,
    setQueueLimit,
    fetchProductionQueue,
    fetchProductionSummary,
    clearError,
    refreshQueue,
  } = store;

  const markPackedFn =
    store?.markOrderPacked ||
    store?.markPacked ||
    store?.markPackedOrder ||
    store?.updateOrderStatus ||
    store?.setOrderStatus ||
    null;

  const [searchInput, setSearchInput] = useState(filters?.q || "");
  const [datePreset, setDatePreset] = useState(
    filters?.from || filters?.to ? "custom" : "all"
  );
  const [useCustomRange, setUseCustomRange] = useState(
    Boolean(filters?.from || filters?.to)
  );
  const [rangeFrom, setRangeFrom] = useState(filters?.from || "");
  const [rangeTo, setRangeTo] = useState(filters?.to || "");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [packingIds, setPackingIds] = useState(() => new Set());
  const [bulkPacking, setBulkPacking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [jumpPage, setJumpPage] = useState("1");

  const currentPackability = filters?.packability || "all";
  const currentLimit = Number(queuePagination?.limit || filters?.limit || 100);

  const buildQueuePayload = (overrides = {}) => {
    const from =
      overrides.from !== undefined
        ? overrides.from
        : filters?.from ?? rangeFrom ?? "";

    const to =
      overrides.to !== undefined
        ? overrides.to
        : filters?.to ?? rangeTo ?? "";

    return {
      q: overrides.q !== undefined ? overrides.q : filters?.q || "",
      from,
      to,
      packability:
        overrides.packability !== undefined
          ? overrides.packability
          : currentPackability,
      fulfillmentStatus:
        overrides.fulfillmentStatus !== undefined
          ? overrides.fulfillmentStatus
          : fulfillmentStatus || filters?.fulfillmentStatus || "processing",
      page:
        overrides.page !== undefined
          ? Number(overrides.page || 1)
          : Number(queuePagination?.page || filters?.page || 1),
      limit:
        overrides.limit !== undefined
          ? Number(overrides.limit || 100)
          : currentLimit,
    };
  };

  useEffect(() => {
    fetchProductionSummary();
    fetchProductionQueue(
      buildQueuePayload({
        page: 1,
        limit: currentLimit,
        fulfillmentStatus: fulfillmentStatus || "processing",
        from: filters?.from || "",
        to: filters?.to || "",
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchInput(filters?.q || "");
  }, [filters?.q]);

  useEffect(() => {
    const hasRange = Boolean(filters?.from || filters?.to);
    setRangeFrom(filters?.from || "");
    setRangeTo(filters?.to || "");
    setUseCustomRange(hasRange);
    setDatePreset(hasRange ? "custom" : "all");
  }, [filters?.from, filters?.to]);

  useEffect(() => {
    setJumpPage(String(queuePagination?.page || 1));
  }, [queuePagination?.page]);

  useEffect(() => {
    const visible = new Set((queue || []).map((o) => String(o?._id)));
    setSelectedIds((prev) => {
      const next = new Set();
      for (const id of prev) {
        if (visible.has(String(id))) next.add(String(id));
      }
      return next;
    });
  }, [queue]);

  const packableVisibleIds = useMemo(() => {
    return (queue || [])
      .filter(
        (o) =>
          o?.isConfirmed === true &&
          String(o?.fulfillmentStatus) === "processing" &&
          o?.isPackable === true
      )
      .map((o) => String(o?._id));
  }, [queue]);

  const allPackableVisibleSelected = useMemo(() => {
    if (!packableVisibleIds.length) return false;
    return packableVisibleIds.every((id) => selectedIds.has(id));
  }, [packableVisibleIds, selectedIds]);

  const runQueueRefresh = async (overrides = {}) => {
    await refreshQueue(buildQueuePayload(overrides));
  };

  const goToPage = async (page) => {
    const safePage = Math.max(1, Number(page || 1));
    setQueuePage(safePage);
    setSelectedIds(new Set());
    await runQueueRefresh({ page: safePage });
  };

  const doMarkPacked = async (orderId) => {
    if (!orderId || !markPackedFn) {
      toast.error("Pack action not available");
      return;
    }

    const oid = String(orderId);
    const order = (queue || []).find((o) => String(o?._id) === oid);

    if (!order) return;
    if (!order?.isConfirmed) return toast.error("Only confirmed orders can be packed");
    if (String(order?.fulfillmentStatus) !== "processing") {
      return toast.error("Only processing orders can be packed");
    }
    if (!order?.isPackable) {
      return toast.error("Order is not packable");
    }
    if (packingIds.has(oid)) return;

    setPackingIds((prev) => new Set(prev).add(oid));

    try {
      const isStatusFn =
        markPackedFn === store.updateOrderStatus ||
        markPackedFn === store.setOrderStatus;

      if (isStatusFn) await markPackedFn(oid, "packed");
      else await markPackedFn(oid);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(oid);
        return next;
      });

      await runQueueRefresh();
      await fetchProductionSummary();
      toast.success(`Order packed: ${order?.orderNumber || oid}`);
    } catch (e) {
      toast.error(e?.message || "Failed to mark packed");
    } finally {
      setPackingIds((prev) => {
        const next = new Set(prev);
        next.delete(oid);
        return next;
      });
    }
  };

  const onBulkMarkPacked = async () => {
    if (bulkPacking) return;

    const ids = Array.from(selectedIds).filter((id) => {
      const order = (queue || []).find((o) => String(o?._id) === String(id));
      return order?.isPackable === true;
    });

    if (!ids.length) return;

    setBulkPacking(true);
    try {
      for (const id of ids) {
        await doMarkPacked(id);
      }
    } finally {
      setBulkPacking(false);
    }
  };

  const onExportExcel = async () => {
    try {
      setExporting(true);
      const filename = `production-${fulfillmentStatus}-${currentPackability}-${toYYYYMMDD(
        new Date()
      )}.xlsx`;
      await exportProductionXLSX(queue, filename);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const applyPreset = async (key) => {
    setUseCustomRange(false);
    setDatePreset(key);
    clearSelection();
    setQueuePage(1);
    setJumpPage("1");

    if (key === "all") {
      setRangeFrom("");
      setRangeTo("");
      setDateRange({ from: "", to: "" });
      await runQueueRefresh({ from: "", to: "", page: 1 });
      return;
    }

    const range = getPresetRange(key);
    const from = range.from ? toYYYYMMDD(range.from) : "";
    const to = range.to ? toYYYYMMDD(range.to) : "";

    setRangeFrom(from);
    setRangeTo(to);
    setDateRange({ from, to });
    await runQueueRefresh({ from, to, page: 1 });
  };

  const applyCustomRange = async () => {
    const from = rangeFrom || "";
    const to = rangeTo || "";

    if (from && to && new Date(from) > new Date(to)) {
      toast.error("From date cannot be after To date");
      return;
    }

    setUseCustomRange(true);
    setDatePreset("custom");
    clearSelection();
    setQueuePage(1);
    setJumpPage("1");
    setDateRange({ from, to });

    await runQueueRefresh({ from, to, page: 1 });
  };

  const onSearchSubmit = async (e) => {
    e?.preventDefault?.();
    clearSelection();
    setQueuePage(1);
    setJumpPage("1");
    setSearch(searchInput);
    await runQueueRefresh({ q: searchInput, page: 1 });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (orderId) => {
    const id = String(orderId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPackableVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of packableVisibleIds) next.add(id);
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const o of queue || []) next.delete(String(o?._id));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-5 md:px-6 space-y-4">
      <ProductionHeader
        onRefresh={async () => {
          await fetchProductionSummary();
          await runQueueRefresh();
        }}
        onExport={onExportExcel}
        exporting={exporting}
        canExport={!!queue.length}
      />

      {error ? (
        <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="rounded-lg bg-white px-2 py-1 text-xs shadow-sm"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <ProductionMetricCard
          title="Processing"
          value={summary?.processing}
          loading={loadingSummary}
          active={fulfillmentStatus === "processing"}
          onClick={async () => {
            setFulfillmentStatus("processing");
            clearSelection();
            setQueuePage(1);
            setJumpPage("1");
            await runQueueRefresh({ fulfillmentStatus: "processing", page: 1 });
          }}
        />
        <ProductionMetricCard
          title="Packed"
          value={summary?.packed}
          loading={loadingSummary}
          active={fulfillmentStatus === "packed"}
          onClick={async () => {
            setFulfillmentStatus("packed");
            clearSelection();
            setQueuePage(1);
            setJumpPage("1");
            await runQueueRefresh({ fulfillmentStatus: "packed", page: 1 });
          }}
        />
      </div>

      <ProductionFilters
        datePreset={datePreset}
        useCustomRange={useCustomRange}
        setUseCustomRange={setUseCustomRange}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        setRangeFrom={setRangeFrom}
        setRangeTo={setRangeTo}
        applyPreset={applyPreset}
        applyCustomRange={applyCustomRange}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchSubmit={onSearchSubmit}
        currentPackability={currentPackability}
        onPackabilityChange={async (value) => {
          setPackability(value);
          clearSelection();
          setQueuePage(1);
          setJumpPage("1");
          await runQueueRefresh({ packability: value, page: 1 });
        }}
        fulfillmentStatus={fulfillmentStatus}
        onStatusChange={async (value) => {
          clearSelection();
          setFulfillmentStatus(value);
          setQueuePage(1);
          setJumpPage("1");
          await runQueueRefresh({ fulfillmentStatus: value, page: 1 });
        }}
        total={total}
        loadingQueue={loadingQueue}
      />

      {fulfillmentStatus === "processing" ? (
        <ProductionBulkBar
          checked={allPackableVisibleSelected}
          packableCount={packableVisibleIds.length}
          selectedCount={selectedIds.size}
          bulkPacking={bulkPacking}
          onToggleAll={(checked) => {
            if (checked) selectAllPackableVisible();
            else deselectAllVisible();
          }}
          onClear={clearSelection}
          onBulkMarkPacked={onBulkMarkPacked}
        />
      ) : null}

      <div className="space-y-2">
        {loadingQueue ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading orders...</div>
        ) : !queue.length ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No orders found in selected filter.
          </div>
        ) : (
          queue.map((order, idx) => {
            const id = String(order?._id);
            return (
              <ProductionOrderCard
                key={String(order?._id || order?.orderNumber || `order-${idx}`)}
                order={order}
                onOpen={() => router.push(`/production/order/${order._id}`)}
                onMarkPacked={() => doMarkPacked(order._id)}
                canMarkPacked={String(order?.fulfillmentStatus) === "processing"}
                showSelect={fulfillmentStatus === "processing"}
                isPackable={!!order?.isPackable}
                selected={selectedIds.has(id)}
                onToggleSelect={() => toggleSelect(order._id)}
                packing={packingIds.has(id)}
              />
            );
          })
        )}
      </div>

      <ProductionPagination
        page={queuePagination?.page || 1}
        pages={queuePagination?.pages || 1}
        total={queuePagination?.total || 0}
        limit={queuePagination?.limit || 100}
        hasMore={queuePagination?.hasMore}
        jumpPage={jumpPage}
        setJumpPage={setJumpPage}
        onPrev={() => goToPage((queuePagination?.page || 1) - 1)}
        onNext={() => goToPage((queuePagination?.page || 1) + 1)}
        onJump={async (forcedPage) => {
          const totalPages = Number(queuePagination?.pages || 1);
          const pageToGo = forcedPage ? Number(forcedPage) : Number(jumpPage || 1);
          const safePage = Math.min(Math.max(1, pageToGo), totalPages);
          await goToPage(safePage);
        }}
        onLimitChange={async (value) => {
          const nextLimit = Number(value || 100);
          setQueueLimit(nextLimit);
          clearSelection();
          setQueuePage(1);
          setJumpPage("1");
          await runQueueRefresh({ limit: nextLimit, page: 1 });
        }}
      />
    </div>
  );
}