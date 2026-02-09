// ✅ components/SyncInventoryButton.jsx
"use client";

import { useState } from "react";
import useAdminProductionStore from "@/store/adminProductionStore";
import { useInventoryReservationStore } from "@/store/inventoryReservationStore";

/**
 * SyncInventoryButton (minimal + real reserve)
 *
 * On click:
 * 1) Expire due reservations (releases stuck reservedStock)
 * 2) Fetch ALL confirmed + processing orders (production queue)
 * 3) Fetch current RESERVED(order) reservations
 * 4) For every order item, if qty is not fully reserved -> create reservation (only if stock exists; backend enforces)
 * 5) Refresh reservations + production queue + summary
 *
 * NOTE:
 * - Reservation matching is by (orderId + productId + variantId)
 * - If same product+variant appears multiple times in same order, we aggregate it to avoid double reserve.
 */

const btnBase =
  "px-3 py-2 rounded-xl bg-white text-xs text-gray-800 shadow-sm hover:shadow transition disabled:opacity-50";

const sid = (v) => String(v?._id || v || "").trim();
const s = (v) => String(v ?? "").trim();
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const variantKey = (variantId) => (variantId ? sid(variantId) : "simple");
const makeKey = (productId, variantId) => `${sid(productId)}::${variantKey(variantId)}`;

// sum RESERVED qty for a given order+product+variant
const reservedQtyForKey = (reservationList, orderId, productId, variantId) => {
  const oid = sid(orderId);
  const pid = sid(productId);
  const vid = variantId ? sid(variantId) : ""; // "" means simple
  return (reservationList || [])
    .filter((r) => {
      if (!r) return false;
      if (String(r.status) !== "reserved") return false;
      if (String(r.refType) !== "order") return false;
      if (sid(r.refId) !== oid) return false;
      if (sid(r.productId) !== pid) return false;

      const rVid = sid(r.variantId); // "" if null
      if (!vid) return !rVid; // simple expects null variantId
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

  // production store (hook)
  const prodStore = useAdminProductionStore();
  const fetchProductionQueue = prodStore?.fetchProductionQueue;
  const fetchProductionSummary = prodStore?.fetchProductionSummary;
  const currentFulfillmentStatus = prodStore?.fulfillmentStatus || "processing";

  // inventory store (hook)
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

      // 1) expire due reservations (frees reservedStock)
      let expiredCount = 0;
      try {
        const r = await expireDueReservations?.();
        expiredCount = Number(r?.expiredCount ?? 0);
      } catch (err) {
        console.log("[SYNC_INV] expireDue failed:", err?.message || err);
      }
      console.log("[SYNC_INV] expired:", expiredCount);

      // 2) fetch confirmed+processing queue (your prod API already returns confirmed only,
      //    but we still re-check in frontend for safety)
      await fetchProductionQueue?.({ fulfillmentStatus: "processing" });

      // IMPORTANT: read fresh queue from zustand state (not from stale render)
      const freshQueue = useAdminProductionStore.getState?.().queue || [];
      const processingConfirmed = (freshQueue || []).filter(
        (o) => String(o?.fulfillmentStatus) === "processing" && Boolean(o?.isConfirmed)
      );

      console.log("[SYNC_INV] processing+confirmed orders:", processingConfirmed.length);

      // 3) fetch current reserved(order) reservations
      await fetchInventoryReservations?.({ status: "reserved", refType: "order" });
      const reservationList = useInventoryReservationStore.getState?.().reservations || [];
      console.log("[SYNC_INV] reserved(order) reservations:", reservationList.length);

      // 4) reserve wherever possible
      let created = 0;
      let failed = 0;

      // cap to avoid accidental spam
      const HARD_CAP = 800;
      let attempts = 0;

      for (const order of processingConfirmed) {
        if (attempts >= HARD_CAP) break;

        const orderId = order?._id;
        const orderNo = s(order?.orderNumber);

        // aggregate per (productId+variantId) within this order
        const agg = new Map();

        for (const it of order?.items || []) {
          const pid = sid(it?.productId);
          if (!pid) continue;

          const vid = sid(it?.variant?.variantId) || null;
          const key = makeKey(pid, vid);

          const qty = Math.max(0, num(it?.quantity));

          // store best snapshots for denormalized fields
          const prev = agg.get(key) || {
            productId: pid,
            variantId: vid || null,
            requiredQty: 0,

            // denormalized for admin tables
            orderNumber: orderNo,
            productTitle: s(it?.productSnapshot?.title),
            productImage: s(
              it?.productSnapshot?.thumbnail ||
                (Array.isArray(it?.productSnapshot?.images) ? it?.productSnapshot?.images?.[0] : "")
            ),
            variantSku: s(it?.variant?.sku),
            selectedSize: s(it?.selectedSize),
            selectedColor: s(it?.selectedColor),
          };

          prev.requiredQty += qty;
          // keep best values (don’t overwrite good with blank)
          if (!prev.productTitle) prev.productTitle = s(it?.productSnapshot?.title);
          if (!prev.productImage)
            prev.productImage = s(
              it?.productSnapshot?.thumbnail ||
                (Array.isArray(it?.productSnapshot?.images) ? it?.productSnapshot?.images?.[0] : "")
            );
          if (!prev.variantSku) prev.variantSku = s(it?.variant?.sku);
          if (!prev.selectedSize) prev.selectedSize = s(it?.selectedSize);
          if (!prev.selectedColor) prev.selectedColor = s(it?.selectedColor);

          agg.set(key, prev);
        }

        // now reserve per aggregated key
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

            // ✅ denormalized
            orderNumber: g.orderNumber || orderNo,
            productTitle: g.productTitle || "",
            productImage: g.productImage || "",
            variantSku: g.variantSku || "",
            selectedSize: g.selectedSize || "",
            selectedColor: g.selectedColor || "",

            notes: `Manual sync reserve | orderNumber=${orderNo}`,
          };

          console.log("[SYNC_INV] reserve try", {
            order: orderNo,
            productId: g.productId,
            variantId: g.variantId || null,
            need,
            already,
          });

          try {
            await createReservation?.(payload);
            created += 1;
            console.log("[SYNC_INV] reserve ok", { order: orderNo, need });
          } catch (err) {
            failed += 1;
            console.log("[SYNC_INV] reserve failed", {
              order: orderNo,
              msg: err?.response?.data?.message || err?.message || String(err),
            });
          }
        }
      }

      console.log("[SYNC_INV] done", { expiredCount, created, failed, attempts });

      // 5) refresh UI
      await Promise.allSettled([
        fetchInventoryReservations?.({ status: "reserved", refType: "order" }),
        fetchProductionQueue?.({ fulfillmentStatus: currentFulfillmentStatus }),
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
