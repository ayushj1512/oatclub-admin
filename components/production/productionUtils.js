const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const STATUS_OPTIONS = [
  { label: "Processing", value: "processing" },
  { label: "Packed", value: "packed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export const PACKABILITY_TABS = [
  { label: "All", value: "all" },
  { label: "Packable", value: "packable" },
  { label: "Unpackable", value: "unpackable" },
];

export const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All" },
];

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const toYYYYMMDD = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getPresetRange = (key) => {
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

  return { from: null, to: null };
};

export const toAbsoluteUrl = (url) => {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `https://mirayfashions.in${u}`;
  return `https://mirayfashions.in/${u}`;
};

export const proxifyImage = (url) => {
  const abs = toAbsoluteUrl(url);
  if (!abs) return "";
  return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(abs)}`;
};

export const resolveItemImage = (item) =>
  proxifyImage(
    item?.variant?.image ||
      item?.productSnapshot?.thumbnail ||
      (item?.productSnapshot?.images || [])[0] ||
      ""
  );

export const safeId = (v) => String(v?._id || v || "").trim();

export const getVariantIdFromItem = (item) =>
  String(item?.variant?.variantId || item?.variantId || item?.variant?._id || "");

export async function exportProductionXLSX(orders, filename = "production.xlsx") {
  if (!orders?.length) return;

  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Production", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Order#", key: "orderNumber", width: 16 },
    { header: "Date", key: "date", width: 22 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Packable", key: "isPackable", width: 12 },
    { header: "Product", key: "productName", width: 34 },
    { header: "Size", key: "size", width: 10 },
    { header: "Color", key: "color", width: 12 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Qty", key: "qty", width: 8 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const order of orders) {
    const orderNumber = order?.orderNumber || "";
    const customer = order?.shippingAddressSnapshot?.fullName || "";
    const phone = order?.shippingAddressSnapshot?.phone || "";
    const date = new Date(order?.createdAt || order?.orderDate || Date.now()).toLocaleString();
    const isPackable = order?.isPackable ? "Yes" : "No";

    for (const item of order?.items || []) {
      sheet.addRow({
        orderNumber,
        date,
        customer,
        phone,
        isPackable,
        productName: item?.productSnapshot?.title || "Item",
        size: item?.selectedSize || "",
        color: item?.selectedColor || "",
        sku: item?.variant?.sku || item?.productSnapshot?.sku || "",
        qty: Number(item?.quantity || 1),
      });
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}