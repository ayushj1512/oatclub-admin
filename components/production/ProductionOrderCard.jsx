import {
  getVariantIdFromItem,
  resolveItemImage,
  safeId,
} from "./productionUtils";

function Tag({ label }) {
  return (
    <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-700 ring-1 ring-black/5">
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
    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${cls}`}>
      {s.replaceAll("_", " ")}
    </span>
  );
}

function ItemStatusBadge({ item }) {
  const allocatedQty = Number(item?.fulfillment?.allocatedQty || 0);
  const toProduceQty = Number(item?.fulfillment?.toProduceQty || 0);
  const shippedQty = Number(item?.fulfillment?.shippedQty || 0);

  let status = null;

  // ✅ only one indicator, priority based
  if (shippedQty >= 1) {
    status = {
      label: "Shipped",
      cls: "bg-blue-100 text-blue-800",
    };
  } else if (toProduceQty >= 1) {
    status = {
      label: "Pending",
      cls: "bg-amber-100 text-amber-800",
    };
  } else if (allocatedQty >= 1) {
    status = {
      label: "Reserved",
      cls: "bg-green-100 text-green-800",
    };
  }

  if (!status) return null;

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}
    >
      {status.label}
    </span>
  );
}

function ItemRow({ item }) {
  const title = item?.productSnapshot?.title || "Item";
  const img = resolveItemImage(item);
  const qty = Number(item?.quantity || 1);
  const size = item?.selectedSize || "";
  const color = item?.selectedColor || "";
  const sku = item?.variant?.sku || item?.productSnapshot?.sku || "";

  return (
    <div className="flex gap-2 rounded-xl bg-gray-50 p-2">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
        {img ? (
          <img src={img} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="text-[10px] text-gray-400">No Image</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-xs font-medium text-gray-900">
            {title}
          </div>
          <ItemStatusBadge item={item} />
        </div>

        <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-gray-600">
          <Tag label={`Qty: ${qty}`} />
          {size ? <Tag label={`Size: ${size}`} /> : null}
          {color ? <Tag label={`Color: ${color}`} /> : null}
          {sku ? <Tag label={`SKU: ${sku}`} /> : null}
        </div>
      </div>
    </div>
  );
}

export default function ProductionOrderCard({
  order,
  onOpen,
  onMarkPacked,
  canMarkPacked,
  showSelect = false,
  isPackable = false,
  selected = false,
  onToggleSelect,
  packing = false,
}) {
  const items = order?.items || [];
  const itemsCount = items.reduce(
    (sum, it) => sum + Number(it?.quantity || 0),
    0
  );

  const disablePackBtn = !isPackable || packing;

  return (
    <div
      className={`cursor-pointer rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow ${
        selected ? "ring-2 ring-black/70" : ""
      }`}
      onClick={onOpen}
    >
      <div className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex items-start gap-2">
          {showSelect ? (
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                disabled={!isPackable}
                onChange={() => onToggleSelect?.()}
                className="h-4 w-4 accent-black disabled:opacity-40"
              />
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {order.orderNumber}
              </h3>

              <StatusPill status={order.fulfillmentStatus} />

              <span className="text-[11px] text-gray-500">
                • {itemsCount} pcs
              </span>

              {showSelect ? (
                isPackable ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-medium text-green-800">
                    Packable
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                    Unpackable
                  </span>
                )
              ) : null}
            </div>

            <div className="mt-0.5 truncate text-[11px] text-gray-500">
              {order?.shippingAddressSnapshot?.fullName || "—"} •{" "}
              {order?.shippingAddressSnapshot?.phone || "—"} •{" "}
              {new Date(
                order.createdAt || order.orderDate || Date.now()
              ).toLocaleString()}
            </div>
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
              disabled={disablePackBtn}
              className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
            >
              {packing ? "Packing..." : "Mark Packed"}
            </button>
          ) : (
            <div className="px-2 text-xs text-gray-400">—</div>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {items.map((item, idx) => (
            <ItemRow
              key={String(
                item?._id ||
                  `${safeId(item?.productId)}-${
                    getVariantIdFromItem(item) || "simple"
                  }-${idx}`
              )}
              item={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}