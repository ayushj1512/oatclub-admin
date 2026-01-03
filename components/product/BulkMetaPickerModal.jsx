"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useCategoryStore } from "@/store/categorystore";
import { useAdminAttributeStore } from "@/store/adminAttributeStore";
import { toast } from "react-hot-toast";

export default function BulkMetaPickerModal({
  open,
  onClose,
  onApply,
  initialValue = {},
  allowApplyAll = true,
}) {
  const { categories, fetchCategories } = useCategoryStore();
  const { attributes, fetchAttributes } = useAdminAttributeStore();

  /* ============================================================
     ✅ SAFE HELPERS
  ============================================================ */
  const safeText = (x) => {
    if (x === null || x === undefined) return "";
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (typeof x === "object") return x.label || x.name || x.value || x._id || "";
    return "";
  };

  // ✅ ALWAYS return a comparable ID for value
  const safeValueId = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v === "object") return String(v.value || v._id || v.label || "");
    return "";
  };

  /* ============================================================
     ✅ STATE
  ============================================================ */
  const [selectedCategories, setSelectedCategories] = useState(
    initialValue.categories || []
  );

  const [selectedAttrs, setSelectedAttrs] = useState(
    initialValue.attributes || []
  );

  const [images, setImages] = useState(initialValue.images || []);
  const [thumbnail, setThumbnail] = useState(initialValue.thumbnail || "");

  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaMultiOpen, setMediaMultiOpen] = useState(false);

  /* ============================================================
     ✅ Fetch Categories & Attributes
  ============================================================ */
  useEffect(() => {
    if (!open) return;
    fetchCategories();
    fetchAttributes();
  }, [open]);

  useEffect(() => {
    setSelectedCategories(initialValue.categories || []);
    setSelectedAttrs(initialValue.attributes || []);
    setImages(initialValue.images || []);
    setThumbnail(initialValue.thumbnail || "");
  }, [initialValue, open]);

  /* ============================================================
     ✅ Options
  ============================================================ */
  const categoryOptions = useMemo(() => {
    return (categories || []).map((c) => ({
      value: c.slug || c.name || c._id,
      label: c.name,
    }));
  }, [categories]);

  const attrOptions = useMemo(() => {
    return (attributes || []).map((a) => ({
      id: a._id,
      key: a.key,
      label: a.name || a.key,
      values: Array.isArray(a.values) ? a.values : [],
    }));
  }, [attributes]);

  /* ============================================================
     ✅ Category Toggle
  ============================================================ */
  const toggleCategory = (slug) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]
    );
  };

  /* ============================================================
     ✅ Attribute Handling (SAFE)
     - Always store attribute values as strings (id/value)
  ============================================================ */
  const toggleAttrValue = (attrId, key, val) => {
    const valId = safeValueId(val);

    setSelectedAttrs((prev) => {
      const idx = prev.findIndex((x) => String(x.attribute) === String(attrId));
      let next = [...prev];

      // ✅ if attribute does not exist in selectedAttrs
      if (idx === -1) {
        next.push({ attribute: attrId, key, values: [valId] });
        return next;
      }

      const found = next[idx];
      const values = Array.isArray(found.values) ? found.values : [];

      const updatedValues = values.includes(valId)
        ? values.filter((x) => x !== valId)
        : [...values, valId];

      next[idx] = { ...found, values: updatedValues };

      // ✅ remove empty attributes
      return next.filter((x) => x.values?.length);
    });
  };

  const getAttrSelected = (attrId) =>
    selectedAttrs.find((x) => String(x.attribute) === String(attrId))?.values ||
    [];

  /* ============================================================
     ✅ Submit
  ============================================================ */
  const submit = () => {
    if (!selectedCategories.length) {
      toast.error("Select at least 1 category");
      return;
    }

    const meta = {
      categories: selectedCategories,
      attributes: selectedAttrs,
      images,
      thumbnail: thumbnail || images[0] || "",
    };

    onApply(meta);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            Bulk Category + Attribute + Media Picker
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
          {/* Categories */}
          <div>
            <h3 className="mb-2 font-semibold">Categories</h3>
            <div className="max-h-64 overflow-auto rounded-xl border p-3">
              {categoryOptions.map((c) => (
                <label
                  key={c.value}
                  className="flex cursor-pointer items-center gap-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c.value)}
                    onChange={() => toggleCategory(c.value)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Attributes */}
          <div>
            <h3 className="mb-2 font-semibold">Attributes</h3>
            <div className="max-h-64 overflow-auto rounded-xl border p-3">
              {attrOptions.map((a) => (
                <div key={a.id} className="mb-3 border-b pb-2 last:border-0">
                  <p className="font-medium">{a.label}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {(a.values || []).map((v) => {
                      const valId = safeValueId(v);
                      const selected = getAttrSelected(a.id).includes(valId);

                      return (
                        <button
                          key={`${a.id}-${valId}`}
                          onClick={() => toggleAttrValue(a.id, a.key, v)}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-sm ${
                            selected
                              ? "bg-black text-white"
                              : "bg-white text-black"
                          }`}
                        >
                          {safeText(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Media */}
          <div className="md:col-span-2">
            <h3 className="mb-2 font-semibold">Images / Thumbnail</h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMediaOpen(true)}
                className="rounded-xl bg-black px-4 py-2 text-white"
              >
                Select Thumbnail
              </button>

              <button
                onClick={() => setMediaMultiOpen(true)}
                className="rounded-xl border px-4 py-2"
              >
                Select Gallery Images
              </button>

              {!!thumbnail && (
                <p className="text-sm text-green-700">✅ Thumbnail Selected</p>
              )}

              {!!images.length && (
                <p className="text-sm text-blue-700">
                  ✅ {images.length} images selected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          <button onClick={onClose} className="rounded-xl border px-4 py-2">
            Cancel
          </button>

          <button
            onClick={submit}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            Apply Selection ✅
          </button>
        </div>

        {/* Media Picker Modals */}
        <MediaPickerModal
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          folder="miray/products"
          onSelect={(media) => {
            const url = media?.url;
            if (!url) return;
            setThumbnail(url);
          }}
        />

        <MediaPickerModal
          open={mediaMultiOpen}
          onClose={() => setMediaMultiOpen(false)}
          multiple
          folder="miray/products/gallery"
          onSelect={(list) => {
            const urls = Array.isArray(list) ? list.map((x) => x.url) : [];
            setImages(urls.filter(Boolean));
            if (!thumbnail && urls[0]) setThumbnail(urls[0]);
          }}
        />
      </div>
    </div>
  );
}
