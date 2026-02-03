"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAdminProductionStore from "@/store/adminProductionStore";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";

// ✅ Product Store for images (bulk fetch)
import { useAdminProductStore } from "@/store/adminProductStore";

// ✅ Excel Export libs
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * ✅ /production Dashboard
 * - Summary metrics
 * - Production queue (confirmed only)
 * - Compact UI (cards)
 * - Horizontal calendar bar: Today / Yesterday / 7D / 30D / All
 * - Custom range filter
 * - Export Excel (.xlsx) with EMBEDDED images ✅
 * - Uses Product store to resolve images (order snapshot images missing)
 * - ✅ Uses Backend Proxy for images (fix CORS)
 * - Action: Mark Packed (processing -> packed)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const STATUS_OPTIONS = [
  { label: "Processing (To Produce)", value: "processing" },
  { label: "Packed (Ready to Ship)", value: "packed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All" },
];

/* ============================
   ✅ Date helpers
============================ */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const toYYYYMMDD = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPresetRange = (key) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (key === "today") return { from: todayStart, to: todayEnd };

  if (key === "yesterday") {
    const y = new Date(todayStart);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }

  if (key === "7d") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: todayEnd };
  }

  if (key === "30d") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to: todayEnd };
  }

  return { from: null, to: null }; // all
};

/* ============================
   ✅ URL + Proxy Helpers
============================ */

// ✅ normalize url into absolute (for WP urls mostly)
const toAbsoluteUrl = (url) => {
  const u = String(url || "").trim();
  if (!u) return "";

  // already absolute
  if (u.startsWith("http://") || u.startsWith("https://")) return u;

  // relative -> attach WP origin if needed (you can change this if WP base is fixed)
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `https://mirayfashions.in${u}`;

  // fallback
  return `https://mirayfashions.in/${u}`;
};

// ✅ proxy url creator
const proxifyImage = (url) => {
  const abs = toAbsoluteUrl(url);
  if (!abs) return "";
  return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(abs)}`;
};

// ✅ helper: safe product id from populated OR string
const getProductId = (item) =>
  String(item?.productId?._id || item?.productId || "");

/* ============================================================
   ✅ Resolve image from ProductMap using productId
   ✅ Always return proxy URL (fix CORS)
============================================================ */
const resolveItemImage = (item, productMap) => {
  const pid = getProductId(item);
  const product = productMap?.[pid];

  const variantId = item?.variant?.variantId
    ? String(item.variant.variantId)
    : "";

  // ✅ try variant image from product store
  if (product && variantId && Array.isArray(product?.variants)) {
    const v = product.variants.find((x) => String(x?._id) === variantId);
    if (v?.image) return proxifyImage(v.image);
  }

  // ✅ fallback product thumbnail / images
  if (product?.thumbnail) return proxifyImage(product.thumbnail);
  if (Array.isArray(product?.images) && product.images.length)
    return proxifyImage(product.images[0]);

  // ✅ fallback snapshot
  return proxifyImage(
    item?.variant?.image ||
      item?.productSnapshot?.thumbnail ||
      (item?.productSnapshot?.images || [])[0] ||
      ""
  );
};


// ✅ helper: get variantId from order item (variable product)
const getVariantIdFromItem = (item) =>
  String(item?.variant?.variantId || "");

// ✅ safe string id
const safeId = (v) => String(v?._id || v || "").trim();

// ✅ per-item reserved qty (for that order + product + variant)
const getReservedQtyForItem = (orderId, item, reservationList) => {
  const oid = String(orderId || "").trim();
  if (!oid) return 0;

  const pid = safeId(item?.productId);
  const vid = getVariantIdFromItem(item); // "" for simple

  return (reservationList || [])
    .filter((r) => {
      if (String(r?.status) !== "reserved") return false;
      if (String(r?.refType) !== "order") return false;

      // ✅ same order
      if (String(r?.refId) !== oid) return false;

      // ✅ same product
      if (safeId(r?.productId) !== pid) return false;

      // ✅ same variant (null for simple)
      const rVid = safeId(r?.variantId); // "" if null
      if (!vid) return !rVid; // simple item: reservation variantId should be null
      return rVid === vid;
    })
    .reduce((sum, r) => sum + Number(r?.qty || 0), 0);
};

const getOrderReservationIds = (orderId, reservationList = []) => {
  const oid = String(orderId || "").trim();
  if (!oid) return [];

  return (reservationList || [])
    .filter((r) => {
      if (!r) return false;
      if (String(r?.status) !== "reserved") return false;
      if (String(r?.refType) !== "order") return false;
      return String(r?.refId) === oid;
    })
    .map((r) => String(r?._id || "").trim())
    .filter(Boolean);
};

/* ============================================================
   ✅ Excel Export With Embedded Images (via Proxy)
============================================================ */
async function exportProductionXLSX(
  orders,
  productMap,
  filename = "production.xlsx"
) {
  if (!orders?.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Production Dashboard";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Production", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Image", key: "image", width: 16 },
    { header: "Order#", key: "orderNumber", width: 16 },
    { header: "Date", key: "date", width: 22 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Product", key: "productName", width: 34 },
    { header: "Size", key: "size", width: 10 },
    { header: "Color", key: "color", width: 12 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Qty", key: "qty", width: 6 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.height = 18;

  let rowIndex = 2;

  for (const order of orders) {
    const orderNumber = order?.orderNumber || "";
    const customer = order?.shippingAddressSnapshot?.fullName || "";
    const phone = order?.shippingAddressSnapshot?.phone || "";
    const date = new Date(
      order?.createdAt || order?.orderDate || Date.now()
    ).toLocaleString();

    for (const it of order?.items || []) {
      const title = it?.productSnapshot?.title || "Item";

      // ✅ proxy image url
      const imageUrl = resolveItemImage(it, productMap);

      const size = it?.selectedSize || "";
      const color = it?.selectedColor || "";
      const sku = it?.variant?.sku || it?.productSnapshot?.sku || "";
      const qty = Number(it?.quantity || 1);

      sheet.addRow({
        image: "",
        orderNumber,
        date,
        customer,
        phone,
        productName: title,
        size,
        color,
        sku,
        qty,
      });

      const row = sheet.getRow(rowIndex);
      row.height = 55;
      row.alignment = { vertical: "middle" };

      // ✅ embed image (proxy prevents CORS)
      if (imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          const blob = await imgRes.blob();
          const buffer = await blob.arrayBuffer();

          const ext = blob.type.includes("png") ? "png" : "jpeg";

          const imageId = workbook.addImage({
            buffer,
            extension: ext,
          });

          sheet.addImage(imageId, {
            tl: { col: 0, row: rowIndex - 1 },
            ext: { width: 70, height: 70 },
          });
        } catch (e) {
          console.warn("Image embed failed:", imageUrl);
        }
      }

      rowIndex++;
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  const fileBlob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(fileBlob, filename);
}

export default function ProductionDashboardPage() {
  const router = useRouter();

  const prodStore = useAdminProductionStore();

  const {
  queue,
  summary,
  loadingQueue,
  loadingSummary,
  error,
  fulfillmentStatus,
  setFulfillmentStatus,
  fetchProductionQueue,
  fetchProductionSummary,
  refreshAll,
  clearError,
} = prodStore;

const markPackedFn =
  prodStore?.markOrderPacked ||
  prodStore?.markPacked ||
  prodStore?.markPackedOrder ||
  prodStore?.updateOrderStatus ||
  prodStore?.setOrderStatus ||
  null;

    const {
    reservations: reservationList,
    fetchReservations: fetchInventoryReservations,
    consumeReservation,
  } = useInventoryReservationStore();

  const { fetchProductsByIds } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("today");
  const [exporting, setExporting] = useState(false);

  const [rangeFrom, setRangeFrom] = useState(toYYYYMMDD(new Date()));
  const [rangeTo, setRangeTo] = useState(toYYYYMMDD(new Date()));
  const [useCustomRange, setUseCustomRange] = useState(false);

  const [productMap, setProductMap] = useState({});

  useEffect(() => {
    fetchProductionSummary();
    fetchProductionQueue({ fulfillmentStatus: "processing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProductionQueue({ fulfillmentStatus });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentStatus]);

  // ✅ Build productMap whenever queue changes
  useEffect(() => {
    const run = async () => {
      const ids = Array.from(
        new Set(
          (queue || [])
            .flatMap((o) => (o?.items || []).map((it) => getProductId(it)))
            .filter(Boolean)
        )
      );

      if (!ids.length) return;

      const products = await fetchProductsByIds(ids);

      const map = {};
      (products || []).forEach((p) => {
        map[String(p._id)] = p;
      });

      setProductMap(map);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

    // ✅ Pull all reserved reservations (order based) so UI can show reserved/partial
  useEffect(() => {
    const run = async () => {
      // if no queue, clear
      if (!queue?.length) return;

      // fetch only reserved+order
      // NOTE: if your backend has a lot of data, you can add date range filters later
    await fetchInventoryReservations({
  status: "reserved",
  refType: "order",
});
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue?.length]);


  const activeDateRange = useMemo(() => {
    if (useCustomRange) {
      const from = rangeFrom ? startOfDay(new Date(rangeFrom)) : null;
      const to = rangeTo ? endOfDay(new Date(rangeTo)) : null;
      return { from, to };
    }
    return getPresetRange(datePreset);
  }, [datePreset, useCustomRange, rangeFrom, rangeTo]);

  const filteredQueue = useMemo(() => {
    const q = (queue || []).slice();
    const term = String(search || "").trim().toLowerCase();
    const { from, to } = activeDateRange;

    return q.filter((o) => {
      const created = new Date(o?.createdAt || o?.orderDate || Date.now());
      const inRange = (!from || created >= from) && (!to || created <= to);
      if (!inRange) return false;
      if (!term) return true;

      const orderNumber = String(o?.orderNumber || "").toLowerCase();
      const name = String(o?.shippingAddressSnapshot?.fullName || "").toLowerCase();
      const phone = String(o?.shippingAddressSnapshot?.phone || "").toLowerCase();
      const itemsText = (o?.items || [])
        .map((it) => it?.productSnapshot?.title || "")
        .join(" ")
        .toLowerCase();

      return (
        orderNumber.includes(term) ||
        name.includes(term) ||
        phone.includes(term) ||
        itemsText.includes(term)
      );
    });
  }, [queue, search, activeDateRange]);

  const onOpenOrder = (orderId) => {
    router.push(`/production/order/${orderId}`);
  };

  const onMarkPacked = async (orderId) => {
  try {
    if (!orderId) return;

    if (!markPackedFn) {
      console.error("No mark packed function found in production store");
      return;
    }

    const isStatusFn =
      markPackedFn === prodStore.updateOrderStatus ||
      markPackedFn === prodStore.setOrderStatus;

    if (isStatusFn) {
      await markPackedFn(orderId, "packed");
    } else {
      await markPackedFn(orderId);
    }

    // ✅ better readable reason (orderNumber preferred)
    const orderNo = String(
      (queue || []).find((o) => String(o?._id) === String(orderId))?.orderNumber || ""
    ).trim();

    const reservationIds = getOrderReservationIds(orderId, reservationList);

    if (reservationIds.length) {
      for (const rid of reservationIds) {
        try {
          await consumeReservation(rid, `Packed from production (${orderNo || orderId})`);
        } catch (err) {
          console.error("consumeReservation failed:", rid, err);
        }
      }
    }

    await Promise.allSettled([
      fetchProductionQueue({ fulfillmentStatus }),
      fetchProductionSummary(),
      fetchInventoryReservations({ status: "reserved", refType: "order" }),
    ]);
  } catch (e) {
    console.error(e);
  }
};







  const onExportExcel = async () => {
    try {
      setExporting(true);
      const filename = `production-${fulfillmentStatus}-${toYYYYMMDD(
        new Date()
      )}.xlsx`;

      await exportProductionXLSX(filteredQueue, productMap, filename);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-3 md:px-6 py-5 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Production
          </h1>
          <p className="text-xs text-gray-500">
            Confirmed orders only • Produce items → Mark Packed
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refreshAll()}
            className="px-3 py-2 rounded-xl bg-white text-xs text-gray-800 shadow-sm hover:shadow transition"
          >
            Refresh
          </button>

          <button
            onClick={onExportExcel}
            disabled={exporting || !filteredQueue.length}
            className="px-3 py-2 rounded-xl bg-black text-white text-xs hover:opacity-90 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-xs px-2 py-1 rounded-lg bg-white shadow-sm hover:shadow transition"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <MetricCard
          title="Processing"
          value={summary?.processing}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("processing")}
          active={fulfillmentStatus === "processing"}
        />
        <MetricCard
          title="Packed"
          value={summary?.packed}
          loading={loadingSummary}
          onClick={() => setFulfillmentStatus("packed")}
          active={fulfillmentStatus === "packed"}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setUseCustomRange(false);
                setDatePreset(p.key);
              }}
              className={`whitespace-nowrap px-3 py-2 rounded-full text-xs shadow-sm transition ${
                !useCustomRange && datePreset === p.key
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}

          <button
            onClick={() => setUseCustomRange((v) => !v)}
            className={`whitespace-nowrap px-3 py-2 rounded-full text-xs shadow-sm transition ${
              useCustomRange
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Custom Range
          </button>
        </div>

        {useCustomRange ? (
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-10">From</span>
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 text-xs ring-1 ring-black/5"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-10">To</span>
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 text-xs ring-1 ring-black/5"
              />
            </div>

            <button className="px-3 py-2 rounded-xl bg-black text-white text-xs hover:opacity-90 md:ml-auto">
              Apply
            </button>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status</span>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 text-xs ring-1 ring-black/5"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search: order #, name, phone, product..."
              className="w-full px-3 py-2 rounded-xl bg-gray-50 text-xs ring-1 ring-black/5"
            />
          </div>

          <div className="text-xs text-gray-500 md:w-[120px] text-right">
            {loadingQueue ? "Loading..." : `${filteredQueue.length} orders`}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="space-y-2">
        {loadingQueue ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Loading orders...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No orders found in selected filter.
          </div>
        ) : (
                  filteredQueue.map((order, idx) => (
  <OrderCard
    key={String(order?._id || order?.orderNumber || `order-${idx}`)}
    order={order}
    productMap={productMap}
    reservationList={reservationList}
    onOpen={() => onOpenOrder(order._id)}
    onMarkPacked={() => onMarkPacked(order._id)}
    canMarkPacked={order.fulfillmentStatus === "processing"}
  />
))



        )}
      </div>

      <div className="text-[11px] text-gray-500">
        ✅ Images now load via Backend Proxy (fixes WordPress CORS) + Excel export embeds them properly.
      </div>
    </div>
  );
}

/* ------------------------------------------------
  UI Components
------------------------------------------------- */

function MetricCard({ title, value, loading, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl bg-white shadow-sm hover:shadow transition text-left ${
        active ? "ring-2 ring-black/80" : "ring-1 ring-black/5"
      }`}
    >
      <div className="text-[11px] text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1 text-gray-900">
        {loading ? "—" : Number(value || 0)}
      </div>
    </button>
  );
}

function OrderCard({
  order,
  onOpen,
  onMarkPacked,
  canMarkPacked,
  productMap,
  reservationList = [],
}) {
  const items = order?.items || [];

  const itemsCount = items.reduce(
    (sum, it) => sum + Number(it?.quantity || 0),
    0
  );

  // ✅ order is packable ONLY if all items are fully reserved
  const packCheck = useMemo(() => {
    let ok = true;
    let missingText = "";

    for (const it of items) {
      const req = Number(it?.quantity || 0);
      const resv = getReservedQtyForItem(order?._id, it, reservationList);

      if (resv < req) {
        ok = false;
        const title = it?.productSnapshot?.title || "Item";
        missingText = `Not fully reserved: ${title} (${resv}/${req})`;
        break;
      }
    }

    return { fullyReserved: ok, reason: missingText };
  }, [items, order?._id, reservationList]);

  return (
    <div
      className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 hover:shadow transition cursor-pointer"
      onClick={onOpen}
    >
      <div className="px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {order.orderNumber}
            </h3>

            <StatusPill status={order.fulfillmentStatus} />

            <span className="text-[11px] text-gray-500">• {itemsCount} pcs</span>
          </div>

          <div className="text-[11px] text-gray-500 truncate mt-0.5">
            {order?.shippingAddressSnapshot?.fullName || "—"} •{" "}
            {order?.shippingAddressSnapshot?.phone || "—"} •{" "}
            {new Date(
              order.createdAt || order.orderDate || Date.now()
            ).toLocaleString()}
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              ₹{Number(order.finalPayable || 0).toFixed(0)}
            </div>
            <div className="text-[11px] text-gray-500">
              {String(order.paymentMethod || "").toUpperCase()} •{" "}
              {order.paymentStatus || "pending"}
            </div>
          </div>

          {canMarkPacked ? (
            <button
              onClick={onMarkPacked}
              disabled={!packCheck.fullyReserved}
              title={
                packCheck.fullyReserved
                  ? "Mark Packed"
                  : packCheck.reason || "Order not fully reserved"
              }
              className="px-3 py-2 rounded-xl bg-black text-white text-xs hover:opacity-90 disabled:opacity-50"
            >
              Mark Packed
            </button>
          ) : (
            <div className="text-xs text-gray-400 px-2">—</div>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((it, idx) => (
            <ItemRow
              key={String(
                it?._id ||
                  `${safeId(it?.productId)}-${getVariantIdFromItem(it) || "simple"}-${idx}`
              )}
              item={it}
              productMap={productMap}
              orderId={order?._id}
              reservationList={reservationList}
              
            />
          ))}
        </div>
      </div>
    </div>
  );
}


/* ✅ Add this component somewhere in the same file (below StatusPill is fine) */
function ReservationPill({ requiredQty, reservedQty }) {
  const req = Number(requiredQty || 0);
  const resv = Number(reservedQty || 0);

  if (!req) {
    return (
      <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
        Reserved: —
      </span>
    );
  }

  const pct = Math.min(1, resv / req);

  const label =
    pct >= 1
      ? "Reserved ✅"
      : pct > 0
      ? `Partial Reserved (${resv}/${req})`
      : "Not Reserved";

  const cls =
    pct >= 1
      ? "bg-green-100 text-green-800"
      : pct > 0
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}





function ItemRow({ item, productMap, orderId, reservationList }) {
  const title = item?.productSnapshot?.title || "Item";
  const img = resolveItemImage(item, productMap);

  const qty = Number(item?.quantity || 1);
  const size = item?.selectedSize || "";
  const color = item?.selectedColor || "";
  const sku = item?.variant?.sku || item?.productSnapshot?.sku || "";

  const reservedQty = getReservedQtyForItem(orderId, item, reservationList);

  return (
    <div className="flex gap-2 p-2 rounded-xl bg-gray-50">
      <div className="w-12 h-12 rounded-xl bg-white overflow-hidden ring-1 ring-black/5 flex items-center justify-center shrink-0">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-[10px] text-gray-400">No Image</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-gray-900 truncate flex-1">
            {title}
          </div>

          {/* ✅ Product-level Reserved */}
          <ReservationPill requiredQty={qty} reservedQty={reservedQty} />
        </div>

        <div className="text-[11px] text-gray-600 mt-1 flex flex-wrap gap-1">
          <Tag label={`Qty: ${qty}`} />
          {size ? <Tag label={`Size: ${size}`} /> : null}
          {color ? <Tag label={`Color: ${color}`} /> : null}
          {sku ? <Tag label={`SKU: ${sku}`} /> : null}
        </div>
      </div>
    </div>
  );
}


function Tag({ label }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white ring-1 ring-black/5 text-[11px] text-gray-700">
      {label}
    </span>
  );
}

function StatusPill({ status }) {
  const s = String(status || "processing");
  const map = {
    processing: "bg-yellow-100 text-yellow-800",
    packed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    rto: "bg-gray-200 text-gray-800",
  };

  const cls = map[s] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${cls}`}>
      {s.replaceAll("_", " ")}
    </span>
  );
}
