const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6001";

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://oatclub.in";

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

export const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

export const toYYYYMMDD = (date) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getPresetRange = (key) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (key === "today") {
    return {
      from: todayStart,
      to: todayEnd,
    };
  }

  if (key === "yesterday") {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      from: startOfDay(yesterday),
      to: endOfDay(yesterday),
    };
  }

  if (key === "7d") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);

    return {
      from: startOfDay(from),
      to: todayEnd,
    };
  }

  if (key === "30d") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 29);

    return {
      from: startOfDay(from),
      to: todayEnd,
    };
  }

  return {
    from: null,
    to: null,
  };
};

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const extractImageUrl = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = extractImageUrl(entry);

      if (resolved) {
        return resolved;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    return extractImageUrl(
      value?.secure_url ||
      value?.secureUrl ||
      value?.url ||
      value?.src ||
      value?.image ||
      value?.imageUrl ||
      value?.imageURL ||
      value?.thumbnail ||
      value?.thumbnailUrl ||
      value?.featuredImage ||
      value?.path ||
      value?.original ||
      value?.large ||
      value?.medium ||
      value?.small ||
      ""
    );
  }

  return "";
};

export const toAbsoluteUrl = (value) => {
  const url = extractImageUrl(value);

  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("res.cloudinary.com")) {
    return `https://${url}`;
  }

  const backendUrl = normalizeBaseUrl(BASE_URL);
  const storefrontUrl = normalizeBaseUrl(STOREFRONT_URL);

  if (
    url.startsWith("/uploads/") ||
    url.startsWith("/public/") ||
    url.startsWith("/media/") ||
    url.startsWith("/storage/")
  ) {
    return `${backendUrl}${url}`;
  }

  if (
    url.startsWith("uploads/") ||
    url.startsWith("public/") ||
    url.startsWith("media/") ||
    url.startsWith("storage/")
  ) {
    return `${backendUrl}/${url}`;
  }

  if (url.startsWith("/")) {
    return `${storefrontUrl}${url}`;
  }

  return `${storefrontUrl}/${url}`;
};

/*
 * Proxy intentionally bypassed.
 * Images are loaded directly from Cloudinary/storefront/backend.
 */
export const proxifyImage = (value) => toAbsoluteUrl(value);

export const resolveItemImage = (item = {}) => {
  const candidates = [
    item?.image,
    item?.imageUrl,
    item?.imageURL,
    item?.thumbnail,
    item?.thumbnailUrl,

    item?.variant?.image,
    item?.variant?.imageUrl,
    item?.variant?.imageURL,
    item?.variant?.thumbnail,
    item?.variant?.thumbnailUrl,
    item?.variant?.featuredImage,
    item?.variant?.images?.[0],
    item?.variant?.images,

    item?.productSnapshot?.thumbnail,
    item?.productSnapshot?.thumbnailUrl,
    item?.productSnapshot?.image,
    item?.productSnapshot?.imageUrl,
    item?.productSnapshot?.imageURL,
    item?.productSnapshot?.featuredImage,
    item?.productSnapshot?.images?.[0],
    item?.productSnapshot?.images,

    item?.productId?.thumbnail,
    item?.productId?.thumbnailUrl,
    item?.productId?.image,
    item?.productId?.imageUrl,
    item?.productId?.imageURL,
    item?.productId?.featuredImage,
    item?.productId?.images?.[0],
    item?.productId?.images,

    item?.product?.thumbnail,
    item?.product?.thumbnailUrl,
    item?.product?.image,
    item?.product?.imageUrl,
    item?.product?.imageURL,
    item?.product?.featuredImage,
    item?.product?.images?.[0],
    item?.product?.images,
  ];

  for (const candidate of candidates) {
    const imageUrl = extractImageUrl(candidate);

    if (imageUrl) {
      return toAbsoluteUrl(imageUrl);
    }
  }

  return "";
};

export const safeId = (value) =>
  String(value?._id || value || "").trim();

export const getVariantIdFromItem = (item) =>
  String(
    item?.variant?.variantId ||
    item?.variantId ||
    item?.variant?._id ||
    ""
  );

export async function exportProductionXLSX(
  orders,
  filename = "production.xlsx"
) {
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

  sheet.getRow(1).font = {
    bold: true,
  };

  for (const order of orders) {
    const orderNumber = order?.orderNumber || "";

    const customer =
      order?.shippingAddressSnapshot?.fullName || "";

    const phone =
      order?.shippingAddressSnapshot?.phone || "";

    const date = new Date(
      order?.createdAt ||
      order?.orderDate ||
      Date.now()
    ).toLocaleString();

    const isPackable = order?.isPackable ? "Yes" : "No";

    for (const item of order?.items || []) {
      sheet.addRow({
        orderNumber,
        date,
        customer,
        phone,
        isPackable,

        productName:
          item?.productSnapshot?.title ||
          item?.productId?.title ||
          item?.product?.title ||
          "Item",

        size:
          item?.selectedSize ||
          item?.variant?.size ||
          item?.size ||
          "",

        color:
          item?.selectedColor ||
          item?.variant?.color ||
          item?.color ||
          "",

        sku:
          item?.variant?.sku ||
          item?.productSnapshot?.sku ||
          item?.productId?.sku ||
          item?.product?.sku ||
          "",

        qty: Number(item?.quantity || 1),
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}
