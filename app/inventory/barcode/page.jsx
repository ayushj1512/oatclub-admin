"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:6000";

const BARCODE_PREFIX = "OATCLUB";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

function getVariantSize(variant) {
  const attrs = Array.isArray(variant?.attributes) ? variant.attributes : [];
  const item = attrs.find(
    (a) => String(a?.key || "").toLowerCase() === "size"
  );

  return item?.value ? String(item.value).toUpperCase() : "";
}

function makeBarcodeText({ productId, size, price }) {
  const pid = String(productId || "").trim();
  const s = String(size || "").trim().toUpperCase();
  const pr = String(price || "").trim();

  if (!pid || !s || !pr) return "";

  return `${BARCODE_PREFIX}-${pid}-${s}-${pr}`;
}

function Card({ title, right, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right ? <div style={{ fontSize: 12, opacity: 0.7 }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function InventoryBarcodePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState("1299");
  const [saveToDb, setSaveToDb] = useState(true);

  const [scanText, setScanText] = useState("OATCLUB-12134-M-1299");
  const [createIfMissing, setCreateIfMissing] = useState(true);

  const [saved, setSaved] = useState(null);

  const [bulkSelected, setBulkSelected] = useState({});
  const [bulkMode, setBulkMode] = useState(false);

  async function loadProducts({ search = "", page = 1 } = {}) {
    const url = new URL(`${API_URL}/api/products`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "20");

    if (search) url.searchParams.set("search", search);

    return await fetchJson(url.toString());
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setMsg("");

        const data = await loadProducts({ search: "", page: 1 });

        if (!mounted) return;

        setProducts(data.products || []);
        setPage(data.page || 1);
      } catch (e) {
        if (mounted) setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedProduct = useMemo(() => {
    return (
      products.find((p) => String(p._id) === String(selectedProductId)) || null
    );
  }, [products, selectedProductId]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct) return null;

    const variants = Array.isArray(selectedProduct.variants)
      ? selectedProduct.variants
      : [];

    return (
      variants.find((v) => String(v._id) === String(selectedVariantId)) || null
    );
  }, [selectedProduct, selectedVariantId]);

  useEffect(() => {
    setSaved(null);
    setMsg("");

    if (!selectedProduct) return;

    setProductId(String(selectedProduct._id));

    const p =
      selectedProduct.price ??
      selectedProduct.salePrice ??
      selectedProduct.mrp ??
      "";

    setPrice(p ? String(p) : "");

    const variants = Array.isArray(selectedProduct.variants)
      ? selectedProduct.variants
      : [];

    if (variants.length) {
      setSelectedVariantId(String(variants[0]._id));
    } else {
      setSelectedVariantId("");
      setSize("M");
    }
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSaved(null);
    setMsg("");

    if (!selectedProduct || !selectedVariant) return;

    const s = getVariantSize(selectedVariant);
    if (s) setSize(s);

    const vp =
      selectedVariant.price ??
      selectedVariant.salePrice ??
      selectedVariant.mrp ??
      null;

    if (vp != null && vp !== "") setPrice(String(vp));
  }, [selectedVariantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const barcodeText = useMemo(() => {
    return makeBarcodeText({ productId, size, price });
  }, [productId, size, price]);

  const barcodePreviewUrl = useMemo(() => {
    if (!barcodeText) return "";

    const qs = new URLSearchParams({
      productId: String(productId).trim(),
      size: String(size).trim().toUpperCase(),
      price: String(price).trim(),
    });

    return `${BACKEND_URL}/api/barcodes/generate.png?${qs.toString()}`;
  }, [barcodeText, productId, size, price]);

  async function onSearch() {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const data = await loadProducts({ search: q, page: 1 });

      setProducts(data.products || []);
      setPage(data.page || 1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onNextPage() {
    try {
      setLoading(true);
      setErr("");

      const data = await loadProducts({ search: q, page: page + 1 });

      setProducts(data.products || []);
      setPage(data.page || page + 1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onPrevPage() {
    if (page <= 1) return;

    try {
      setLoading(true);
      setErr("");

      const data = await loadProducts({ search: q, page: page - 1 });

      setProducts(data.products || []);
      setPage(data.page || page - 1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveBarcode() {
    try {
      setErr("");
      setMsg("");
      setSaved(null);

      if (!barcodeText) {
        throw new Error("Fill productId, size, price to generate barcode");
      }

      if (!saveToDb) {
        setMsg("Preview ready. Not saved.");
        return;
      }

      const payload = {
        productId: String(productId).trim(),
        size: String(size).trim().toUpperCase(),
        price: Number(price),
      };

      if (!Number.isFinite(payload.price)) {
        throw new Error("Price must be a number");
      }

      const resp = await fetchJson(`${API_URL}/api/barcodes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSaved(resp.data);
      setMsg("Barcode saved to DB.");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onScanLookup() {
    try {
      setErr("");
      setMsg("");

      const resp = await fetchJson(`${API_URL}/api/barcodes/scan`, {
        method: "POST",
        body: JSON.stringify({ barcodeText: scanText, createIfMissing }),
      });

      setMsg(resp.created ? "Created from scan" : "Found");
    } catch (e) {
      setErr(e.message);
    }
  }

  function toggleBulk(id) {
    setBulkSelected((prev) => {
      const next = { ...prev };

      if (next[id]) delete next[id];
      else next[id] = true;

      return next;
    });
  }

  const bulkProducts = useMemo(() => {
    const ids = new Set(Object.keys(bulkSelected));
    return products.filter((p) => ids.has(String(p._id)));
  }, [bulkSelected, products]);

  const bulkLabels = useMemo(() => {
    const labels = [];

    for (const p of bulkProducts) {
      const pid = String(p._id);
      const basePrice = p.price ?? p.salePrice ?? p.mrp ?? "";
      const variants = Array.isArray(p.variants) ? p.variants : [];

      if (variants.length) {
        for (const v of variants) {
          const s = getVariantSize(v) || "M";
          const vp = v.price ?? v.salePrice ?? v.mrp ?? basePrice ?? "";

          if (!vp) continue;

          const qs = new URLSearchParams({
            productId: pid,
            size: s,
            price: String(vp),
          });

          labels.push({
            key: `${pid}-${v._id}`,
            text: makeBarcodeText({ productId: pid, size: s, price: vp }),
            url: `${BACKEND_URL}/api/barcodes/generate.png?${qs.toString()}`,
            title: p.title || p.name || pid,
          });
        }
      } else {
        if (!basePrice) continue;

        const s = "M";

        const qs = new URLSearchParams({
          productId: pid,
          size: s,
          price: String(basePrice),
        });

        labels.push({
          key: `${pid}`,
          text: makeBarcodeText({ productId: pid, size: s, price: basePrice }),
          url: `${BACKEND_URL}/api/barcodes/generate.png?${qs.toString()}`,
          title: p.title || p.name || pid,
        });
      }
    }

    return labels;
  }, [bulkProducts]);

  function printBulk() {
    window.print();
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.h1}>Inventory → Barcode</div>
          <div style={styles.sub}>
            Generate OATCLUB barcodes for products from{" "}
            <code style={styles.code}>/api/products</code>
          </div>
        </div>

        <div style={styles.topActions}>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.target.checked)}
            />
            Bulk Mode
          </label>

          {bulkMode ? (
            <button
              style={styles.btnPrimary}
              onClick={printBulk}
              disabled={bulkLabels.length === 0}
            >
              Print Selected
            </button>
          ) : null}
        </div>
      </div>

      {err ? <div style={styles.error}>⚠️ {err}</div> : null}
      {msg ? <div style={styles.success}>{msg}</div> : null}

      <Card
        title="Products"
        right={
          <div style={styles.rowWrap}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              style={styles.input}
            />
            <button style={styles.btn} onClick={onSearch}>
              Search
            </button>
            <button style={styles.btn} onClick={onPrevPage} disabled={page <= 1}>
              Prev
            </button>
            <button style={styles.btn} onClick={onNextPage}>
              Next
            </button>
          </div>
        }
      >
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {bulkMode ? <th style={styles.th}>Select</th> : null}
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Pick</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={bulkMode ? 6 : 5}
                    style={{ padding: 12, opacity: 0.7 }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} style={styles.tr}>
                    {bulkMode ? (
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={!!bulkSelected[String(p._id)]}
                          onChange={() => toggleBulk(String(p._id))}
                        />
                      </td>
                    ) : null}

                    <td style={styles.td}>
                      <div style={{ fontWeight: 800 }}>
                        {p.title || p.name || "-"}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {String(p._id)}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {p.productType || (p.variants?.length ? "variable" : "simple")}
                    </td>

                    <td style={styles.td}>
                      ₹{p.price ?? p.salePrice ?? p.mrp ?? "-"}
                    </td>

                    <td style={styles.td}>{p.sku || "-"}</td>

                    <td style={styles.td}>
                      <button
                        style={styles.btnSmall}
                        onClick={() => {
                          setSelectedProductId(String(p._id));
                          setSelectedVariantId("");
                          setBulkMode(false);
                        }}
                      >
                        Generate
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {!loading && products.length === 0 ? (
                <tr>
                  <td
                    colSpan={bulkMode ? 6 : 5}
                    style={{ padding: 12, opacity: 0.7 }}
                  >
                    No products.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {bulkMode ? (
        <Card
          title="Bulk Print Preview"
          right={
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Selected: {bulkLabels.length} labels
            </span>
          }
        >
          {bulkLabels.length === 0 ? (
            <div style={styles.emptyBox}>
              Select some products to generate printable labels.
            </div>
          ) : (
            <div style={styles.bulkFlex}>
              {bulkLabels.map((x) => (
                <div key={x.key} style={styles.bulkCard}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{x.title}</div>
                  <div style={styles.mono}>{x.text}</div>
                  <img src={x.url} alt={x.text} style={{ width: "100%" }} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div style={styles.flex2}>
          <Card
            title="Generate Barcode for Product"
            right="Saves to BarcodeItem collection"
          >
            <div style={styles.col}>
              <label style={styles.label}>
                <span style={styles.labelTxt}>Selected Product</span>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={styles.input}
                >
                  <option value="">-- Select a product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {(p.title || p.name || "Untitled").slice(0, 60)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProduct &&
                Array.isArray(selectedProduct.variants) &&
                selectedProduct.variants.length > 0 ? (
                <label style={styles.label}>
                  <span style={styles.labelTxt}>Variant</span>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    style={styles.input}
                  >
                    {selectedProduct.variants.map((v) => {
                      const s = getVariantSize(v) || "M";
                      const vp =
                        v.price ??
                        v.salePrice ??
                        v.mrp ??
                        selectedProduct.price ??
                        "";

                      return (
                        <option key={v._id} value={v._id}>
                          {v.sku ? `${v.sku} — ` : ""}Size {s} — ₹{vp}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ) : null}

              <div style={styles.rowWrap}>
                <label style={{ ...styles.label, minWidth: 220, flex: 1 }}>
                  <span style={styles.labelTxt}>Product ID</span>
                  <input
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={{ ...styles.label, minWidth: 140 }}>
                  <span style={styles.labelTxt}>Size</span>
                  <input
                    value={size}
                    onChange={(e) => setSize(e.target.value.toUpperCase())}
                    style={styles.input}
                  />
                </label>

                <label style={{ ...styles.label, minWidth: 160 }}>
                  <span style={styles.labelTxt}>Price</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.rowWrap}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={saveToDb}
                    onChange={(e) => setSaveToDb(e.target.checked)}
                  />
                  Save to DB
                </label>

                <button style={styles.btnPrimary} onClick={onSaveBarcode}>
                  {saveToDb ? "Generate & Save" : "Generate Preview"}
                </button>

                <button
                  style={styles.btn}
                  onClick={() =>
                    barcodePreviewUrl && window.open(barcodePreviewUrl, "_blank")
                  }
                  disabled={!barcodePreviewUrl}
                >
                  Open PNG
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Barcode text:{" "}
                <span style={styles.mono}>{barcodeText || "—"}</span>
              </div>

              {barcodePreviewUrl ? (
                <img
                  src={barcodePreviewUrl}
                  alt="preview"
                  style={styles.previewImg}
                />
              ) : (
                <div style={styles.emptyBox}>
                  Select a product and variant to preview barcode.
                </div>
              )}

              {saved ? (
                <div style={styles.savedBox}>
                  <div style={{ fontWeight: 900 }}>Saved: {saved.barcode}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    ID: {saved._id}
                  </div>
                  <img
                    src={`${BACKEND_URL}/api/barcodes/${saved._id}/barcode.png`}
                    alt="saved"
                    style={styles.previewImg}
                  />
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Quick Scan / Lookup" right="Paste scanned OATCLUB code">
            <div style={styles.col}>
              <label style={styles.label}>
                <span style={styles.labelTxt}>Scanned Barcode Text</span>
                <input
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  style={styles.input}
                />
              </label>

              <div style={styles.rowWrap}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={createIfMissing}
                    onChange={(e) => setCreateIfMissing(e.target.checked)}
                  />
                  Auto-create if missing
                </label>

                <button style={styles.btnPrimary} onClick={onScanLookup}>
                  Lookup
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Endpoint: <code style={styles.code}>POST /api/barcodes/scan</code>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    background: "#fafafa",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  h1: { fontSize: 22, fontWeight: 950 },
  sub: { fontSize: 13, opacity: 0.75 },
  code: { background: "#f3f3f3", padding: "2px 6px", borderRadius: 8 },

  card: {
    background: "white",
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  rowWrap: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  col: { display: "flex", flexDirection: "column", gap: 10 },

  input: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    outline: "none",
    minWidth: 220,
  },
  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
  btnSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
  },

  error: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ffd6d6",
    background: "#fff5f5",
    color: "#9b1c1c",
    marginBottom: 10,
  },
  success: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #d1fae5",
    background: "#ecfdf5",
    color: "#065f46",
    marginBottom: 10,
  },

  tableWrap: { overflowX: "auto", border: "1px solid #eee", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", background: "white" },
  th: {
    textAlign: "left",
    fontSize: 12,
    opacity: 0.7,
    padding: 10,
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f2f2f2" },
  td: { padding: 10, fontSize: 13, verticalAlign: "top" },

  flex2: { display: "flex", gap: 12, flexWrap: "wrap" },

  checkboxRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
    opacity: 0.85,
  },

  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
  },
  previewImg: {
    width: "100%",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 10,
    background: "white",
  },
  emptyBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px dashed #ddd",
    opacity: 0.75,
  },
  savedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #eee",
    background: "#fcfcfc",
  },

  bulkFlex: { display: "flex", flexWrap: "wrap", gap: 10 },
  bulkCard: {
    width: 260,
    border: "1px dashed #ddd",
    borderRadius: 12,
    padding: 10,
    background: "white",
  },
};
