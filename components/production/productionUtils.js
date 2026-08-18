const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6001";

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://oatclub.in";

export const STATUS_OPTIONS = [
  ["Processing", "processing"],
  ["Packed", "packed"],
  ["Shipped", "shipped"],
  ["Delivered", "delivered"],
  ["Cancelled", "cancelled"],
].map(([label, value]) => ({ label, value }));

export const PACKABILITY_TABS = [
  ["All", "all"],
  ["Packable", "packable"],
  ["Unpackable", "unpackable"],
].map(([label, value]) => ({ label, value }));

export const DATE_PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 Days"],
  ["30d", "Last 30 Days"],
  ["all", "All"],
].map(([key, label]) => ({ key, label }));

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const toYYYYMMDD = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

export const getPresetRange = (key) => {
  const now = new Date();
  const to = endOfDay(now);

  if (key === "all") return { from: null, to: null };

  const days =
    key === "yesterday" ? 1 :
      key === "7d" ? 6 :
        key === "30d" ? 29 : 0;

  const from = startOfDay(now);
  from.setDate(from.getDate() - days);

  if (key === "yesterday") {
    return {
      from,
      to: endOfDay(from),
    };
  }

  return { from, to };
};

const cleanBase = (url) =>
  String(url || "").trim().replace(/\/+$/, "");

const extractImageUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value.map(extractImageUrl).find(Boolean) || "";
  }

  if (typeof value === "object") {
    return extractImageUrl(
      value.secure_url ||
      value.secureUrl ||
      value.url ||
      value.src ||
      value.image ||
      value.imageUrl ||
      value.imageURL ||
      value.thumbnail ||
      value.thumbnailUrl ||
      value.featuredImage ||
      value.path ||
      value.original ||
      value.large ||
      value.medium ||
      value.small
    );
  }

  return "";
};

export const toAbsoluteUrl = (value) => {
  const url = extractImageUrl(value);
  if (!url) return "";

  if (/^(https?:|data:image\/|blob:)/.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("res.cloudinary.com")) return `https://${url}`;

  const backend = cleanBase(BASE_URL);
  const storefront = cleanBase(STOREFRONT_URL);
  const backendPath = /^(\/)?(uploads|public|media|storage)\//.test(url);

  if (backendPath) {
    return `${backend}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  return `${storefront}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const proxifyImage = toAbsoluteUrl;

export const resolveItemImage = (item = {}) => {
  const candidates = [
    item.image,
    item.imageUrl,
    item.thumbnail,

    item.variant?.image,
    item.variant?.imageUrl,
    item.variant?.featuredImage,
    item.variant?.images,

    item.productSnapshot?.thumbnail,
    item.productSnapshot?.image,
    item.productSnapshot?.imageUrl,
    item.productSnapshot?.featuredImage,
    item.productSnapshot?.images,

    item.productId?.thumbnail,
    item.productId?.image,
    item.productId?.imageUrl,
    item.productId?.featuredImage,
    item.productId?.images,

    item.product?.thumbnail,
    item.product?.image,
    item.product?.imageUrl,
    item.product?.featuredImage,
    item.product?.images,
  ];

  return (
    candidates
      .map(extractImageUrl)
      .find(Boolean)
      ?.pipe?.(toAbsoluteUrl) ||
    toAbsoluteUrl(candidates.map(extractImageUrl).find(Boolean))
  );
};

export const safeId = (value) =>
  String(value?._id || value || "").trim();

export const getVariantIdFromItem = (item = {}) =>
  String(
    item.variant?.variantId ||
    item.variantId ||
    item.variant?._id ||
    ""
  );

export async function exportProductionXLSX(
  orders = [],
  filename = "production.xlsx"
) {
  if (!orders.length) return;

  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Production", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    ["Order#", "orderNumber", 16],
    ["Date", "date", 14],
    ["Customer", "customer", 22],
    ["Phone", "phone", 16],
    ["Packable", "isPackable", 12],
    ["Product", "productName", 34],
    ["Size", "size", 10],
    ["Color", "color", 12],
    ["SKU", "sku", 18],
    ["Qty", "qty", 8],
  ].map(([header, key, width]) => ({ header, key, width }));

  sheet.getRow(1).font = { bold: true };

  for (const order of orders) {
    const rawDate = new Date(
      order.createdAt ||
      order.orderDate ||
      Date.now()
    );

    const date = Number.isNaN(rawDate.getTime())
      ? null
      : new Date(
        rawDate.getFullYear(),
        rawDate.getMonth(),
        rawDate.getDate()
      );

    for (const item of order.items || []) {
      sheet.addRow({
        orderNumber: order.orderNumber || "",
        date,
        customer: order.shippingAddressSnapshot?.fullName || "",
        phone: order.shippingAddressSnapshot?.phone || "",
        isPackable: order.isPackable ? "Yes" : "No",
        productName:
          item.productSnapshot?.title ||
          item.productId?.title ||
          item.product?.title ||
          "Item",
        size:
          item.selectedSize ||
          item.variant?.size ||
          item.size ||
          "",
        color:
          item.selectedColor ||
          item.variant?.color ||
          item.color ||
          "",
        sku:
          item.variant?.sku ||
          item.productSnapshot?.sku ||
          item.productId?.sku ||
          item.product?.sku ||
          "",
        qty: Number(item.quantity || 1),
      });
    }
  }

  // Real Excel date + date-only display
  sheet.getColumn("date").numFmt = "dd-mm-yyyy";

  // Filters on every column
  sheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}
