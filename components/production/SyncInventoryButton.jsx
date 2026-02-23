// ✅ components/SyncInventoryButton.jsx
"use client";

import { useState } from "react";
import useAdminProductionStore from "@/store/adminProductionStore";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";

/**
 * SyncInventoryButton (minimal + real reserve)
 *
 * FIX:
 * Orders are now scanned in ASC order based on MIRAY-00000 format.
 * Example:
 * MIRAY-000123 will be processed before MIRAY-000484
 */

const btnBase =
  "px-3 py-2 rounded-xl bg-white text-xs text-gray-800 shadow-sm hover:shadow transition disabled:opacity-50";

const sid = (v) => String(v?._id || v || "").trim();
const s = (v) => String(v ?? "").trim();
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const variantKey = (variantId) => (variantId ? sid(variantId) : "simple");
const makeKey = (productId, variantId) => `${sid(productId)}::${variantKey(variantId)}`;

/* -------------------------------------------------------
   🔥 NEW: Extract numeric part from MIRAY-000484
------------------------------------------------------- */
const getOrderNumberValue = (orderNumber) => {
  const raw = String(orderNumber || "").trim();

  // Remove "MIRAY-" prefix
  const numericPart = raw.replace(/^MIRAY-/i, "");

  const n = Number(numericPart);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

// sum RESERVED qty for a given order+product+variant
const reservedQtyForKey = (reservationList, orderId, productId, variantId) => {
  const oid = sid(orderId);
  const pid = sid(productId);
  const vid = variantId ? sid(variantId) : "";

  return (reservationList || [])
    .filter((r) => {
      if (!r) return false;
      if (String(r.status) !== "reserved") return false;
      if (String(r.refType) !== "order") return false;
      if (sid(r.refId) !== oid) return false;
      if (sid(r.productId) !== pid) return false;

      const rVid = sid(r.variantId);
      if (!vid) return !rVid;
      return rVid === vid;
    })
    .reduce((sum, r) => sum + num(r.qty), 0);
};

export default function SyncInventoryButton({
  className = btnBase,
  label = "Sync Inventory",
}) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ expired: null, created: 0, failed: 0 });

  const prodStore = useAdminProductionStore();
  const fetchProductionQueue = prodStore?.fetchProductionQueue;
  const fetchProductionSummary = prodStore?.fetchProductionSummary;
  const currentFulfillmentStatus = prodStore?.fulfillmentStatus || "processing";

  const invStore = useInventoryReservationStore();
  const expireDueReservations = invStore?.expireDueReservations;
  const fetchInventoryReservations = invStore?.fetchReservations;
  const createReservation = invStore?.createReservation;

  const onSync = async (e) => {
    e?.stopPropagation?.();
    if (loading) return;

    try {
      setLoading(true);
      setMeta({ expired: null, created: 0, failed: 0 });

      console.log("[SYNC_INV] start");

      /* -----------------------------------
         1️⃣ Expire due reservations
      ----------------------------------- */
      let expiredCount = 0;
      try {
        const r = await expireDueReservations?.();
        expiredCount = Number(r?.expiredCount ?? 0);
      } catch (err) {
        console.log("[SYNC_INV] expireDue failed:", err?.message || err);
      }

      /* -----------------------------------
         2️⃣ Fetch production queue
      ----------------------------------- */
      await fetchProductionQueue?.({ fulfillmentStatus: "processing" });

      const freshQueue = useAdminProductionStore.getState?.().queue || [];

      /* -----------------------------------
         🔥 FIX: ASC SORTING APPLIED HERE
      ----------------------------------- */
      const processingConfirmed = (freshQueue || [])
        .filter(
          (o) =>
            String(o?.fulfillmentStatus) === "processing" &&
            Boolean(o?.isConfirmed)
        )
        .sort((a, b) => {
          const aNum = getOrderNumberValue(a?.orderNumber);
          const bNum = getOrderNumberValue(b?.orderNumber);

          return aNum - bNum; // ASC order
        });

      console.log(
        "[SYNC_INV] processing+confirmed ASC orders:",
        processingConfirmed.map((o) => o.orderNumber)
      );

      /* -----------------------------------
         3️⃣ Fetch current reservations
      ----------------------------------- */
      await fetchInventoryReservations?.({
        status: "reserved",
        refType: "order",
      });

      const reservationList =
        useInventoryReservationStore.getState?.().reservations || [];

      /* -----------------------------------
         4️⃣ Reserve logic
      ----------------------------------- */
      let created = 0;
      let failed = 0;
      const HARD_CAP = 800;
      let attempts = 0;

      for (const order of processingConfirmed) {
        if (attempts >= HARD_CAP) break;

        const orderId = order?._id;
        const orderNo = s(order?.orderNumber);

        const agg = new Map();

        for (const it of order?.items || []) {
          const pid = sid(it?.productId);
          if (!pid) continue;

          const vid = sid(it?.variant?.variantId) || null;
          const key = makeKey(pid, vid);
          const qty = Math.max(0, num(it?.quantity));

          const prev = agg.get(key) || {
            productId: pid,
            variantId: vid || null,
            requiredQty: 0,
            orderNumber: orderNo,
            productTitle: s(it?.productSnapshot?.title),
            productImage: s(
              it?.productSnapshot?.thumbnail ||
                (Array.isArray(it?.productSnapshot?.images)
                  ? it?.productSnapshot?.images?.[0]
                  : "")
            ),
            variantSku: s(it?.variant?.sku),
            selectedSize: s(it?.selectedSize),
            selectedColor: s(it?.selectedColor),
          };

          prev.requiredQty += qty;
          agg.set(key, prev);
        }

        for (const [, g] of agg.entries()) {
          if (attempts >= HARD_CAP) break;

          const already = reservedQtyForKey(
            reservationList,
            orderId,
            g.productId,
            g.variantId
          );

          const need = Math.max(0, num(g.requiredQty) - already);
          if (!need) continue;

          attempts += 1;

          const payload = {
            productId: g.productId,
            variantId: g.variantId || null,
            qty: need,
            refType: "order",
            refId: orderId,
            orderNumber: g.orderNumber || orderNo,
            productTitle: g.productTitle || "",
            productImage: g.productImage || "",
            variantSku: g.variantSku || "",
            selectedSize: g.selectedSize || "",
            selectedColor: g.selectedColor || "",
            notes: `Manual sync reserve | orderNumber=${orderNo}`,
          };

          try {
            await createReservation?.(payload);
            created += 1;
          } catch (err) {
            failed += 1;
          }
        }
      }

      /* -----------------------------------
         5️⃣ Refresh UI
      ----------------------------------- */
      await Promise.allSettled([
        fetchInventoryReservations?.({
          status: "reserved",
          refType: "order",
        }),
        fetchProductionQueue?.({
          fulfillmentStatus: currentFulfillmentStatus,
        }),
        fetchProductionSummary?.(),
      ]);

      setMeta({ expired: expiredCount, created, failed });
    } catch (err) {
      console.error("SyncInventoryButton fatal:", err);
    } finally {
      setLoading(false);
    }
  };

  const title =
    meta.expired == null
      ? "Expire due + reserve for processing confirmed orders"
      : `Expired: ${meta.expired} | Reserved created: ${meta.created} | Failed: ${meta.failed}`;

  return (
    <button onClick={onSync} disabled={loading} className={className} title={title}>
      {loading ? "Syncing..." : label}
      {meta.expired != null ? (
        <span className="ml-2 text-[11px] text-gray-500">
          (exp:{meta.expired} • +{meta.created} • fail:{meta.failed})
        </span>
      ) : null}
    </button>
  );
}