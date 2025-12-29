const WC_BASE = `${process.env.NEXT_PUBLIC_WC_STORE_URL}/wp-json/wc/v3`;

const CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
const CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;

export async function fetchWooOrderById(orderId) {
  const url = `${WC_BASE}/orders/${orderId}?consumer_key=${CK}&consumer_secret=${CS}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch Woo order");
  }

  return res.json();
}

export async function fetchWooOrderByNumber(orderNumber) {
  const url = `${WC_BASE}/orders?search=${orderNumber}&consumer_key=${CK}&consumer_secret=${CS}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch Woo order");
  }

  const data = await res.json();
  return data?.[0] || null;
}
