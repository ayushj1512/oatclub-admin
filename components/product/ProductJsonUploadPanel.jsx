"use client";

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Clipboard, Loader2, UploadCloud } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const sampleJson = {
  title: "Black Ribbed Tank Top",
  slug: "black-ribbed-tank-top",
  productCode: "OAT-TOP-001",
  sku: "OAT-TOP-001-BLK-S",
  shortDescription: "Minimal everyday ribbed tank top.",
  description: "A clean black ribbed tank top designed for daily styling.",
  category: "Tops",
  subcategory: "Tank Tops",
  badge: "New Arrival",
  price: 899,
  mrp: 1299,
  stock: 20,
  images: [
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  ],
  variants: [
    {
      sku: "OAT-TOP-001-BLK-S",
      size: "S",
      color: "Black",
      price: 899,
      mrp: 1299,
      stock: 10,
      images: [
        "https://res.cloudinary.com/demo/image/upload/sample.jpg"
      ]
    }
  ]
};

export default function ProductJsonUploadPanel() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(sampleJson, null, 2)
  );
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => {
    try {
      return { ok: true, data: JSON.parse(jsonText) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [jsonText]);

  const handlePasteSample = () => {
    setJsonText(JSON.stringify(sampleJson, null, 2));
  };

  const handleSubmit = async () => {
    if (!parsed.ok) {
      toast.error("Invalid JSON. Please fix it first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/products/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.message || "Product upload failed");
        return;
      }

      toast.success("Product uploaded successfully");
    } catch (err) {
      toast.error("Something went wrong while uploading");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            JSON Product Upload
          </h2>
          <p className="text-sm text-gray-500">
            Paste product data with images and upload directly.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePasteSample}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50"
        >
          <Clipboard size={16} />
          Sample JSON
        </button>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        spellCheck={false}
        className="h-[420px] w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10"
      />

      <div className="mt-3">
        {parsed.ok ? (
          <p className="text-xs font-semibold text-green-600">
            Valid JSON
          </p>
        ) : (
          <p className="text-xs font-semibold text-red-600">
            Invalid JSON: {parsed.error}
          </p>
        )}
      </div>

      {parsed.ok && (
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Preview
          </p>

          <h3 className="mt-1 font-bold text-gray-900">
            {parsed.data?.title || "Untitled Product"}
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            Code: {parsed.data?.productCode || "-"} · SKU:{" "}
            {parsed.data?.sku || "-"}
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            ₹{parsed.data?.price || 0}{" "}
            <span className="text-gray-400 line-through">
              ₹{parsed.data?.mrp || 0}
            </span>
          </p>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {(parsed.data?.images || []).map((img, index) => (
              <img
                key={index}
                src={img}
                alt=""
                className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !parsed.ok}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {loading ? "Uploading..." : "Upload Product"}
      </button>
    </div>
  );
}