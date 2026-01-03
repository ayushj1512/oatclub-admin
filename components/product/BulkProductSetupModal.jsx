"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useCategoryStore } from "@/store/categorystore";
import { useAdminAttributeStore } from "@/store/adminAttributeStore";

/**
 * ✅ BulkProductSetupModal (UPDATED)
 * Now supports:
 * ✅ Attribute selection + manual value (label) selection
 * ✅ Saves attribute values as strings (not value _id)
 *
 * Payload attributes shape:
 * [
 *   {
 *     attribute: "ObjectId",
 *     key: "size",
 *     values: ["XS","S","M"]
 *   }
 * ]
 */
export default function BulkProductSetupModal({
  open,
  onClose,
  onApply,
  defaultValues = {},
}) {
  const { categories, fetchCategories, loading: catLoading } = useCategoryStore();
  const { attributes, fetchAttributes, loading: attrLoading } =
    useAdminAttributeStore();

  const [selectedCategories, setSelectedCategories] = useState(
    defaultValues.categories || []
  );

  /**
   * ✅ Selected Attributes State
   * Each item:
   * {
   *   attribute: attrId,
   *   key: slug,
   *   name: "Size",
   *   values: ["XS","S"]
   * }
   */
  const [selectedAttributes, setSelectedAttributes] = useState(
    defaultValues.attributes || []
  );

  // ✅ Description fields
  const [shortDescription, setShortDescription] = useState(
    defaultValues.shortDescription || ""
  );
  const [description, setDescription] = useState(defaultValues.description || "");

  // ✅ Tags
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(defaultValues.tags)
      ? defaultValues.tags.join(", ")
      : defaultValues.tags || ""
  );

  // Media selections
  const [thumbOpen, setThumbOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [thumbnail, setThumbnail] = useState(defaultValues.thumbnail || null);
  const [gallery, setGallery] = useState(defaultValues.images || []);

  // Fetch categories + attributes once modal opens
  useEffect(() => {
    if (!open) return;

    if (!categories?.length) fetchCategories();
    if (!attributes?.length) fetchAttributes();
  }, [open]);

  // ✅ Reset state when modal opens (row/global)
  useEffect(() => {
    if (!open) return;

    setSelectedCategories(defaultValues.categories || []);
    setSelectedAttributes(defaultValues.attributes || []);
    setThumbnail(defaultValues.thumbnail || null);
    setGallery(defaultValues.images || []);
    setShortDescription(defaultValues.shortDescription || "");
    setDescription(defaultValues.description || "");

    setTagsInput(
      Array.isArray(defaultValues.tags)
        ? defaultValues.tags.join(", ")
        : defaultValues.tags || ""
    );
  }, [open, defaultValues]);

  // Flatten category list
  const flatCategories = useMemo(() => {
    if (Array.isArray(categories)) return categories;
    return [];
  }, [categories]);

  const handleToggleCategory = (slugOrName) => {
    setSelectedCategories((prev) => {
      if (prev.includes(slugOrName)) return prev.filter((c) => c !== slugOrName);
      return [...prev, slugOrName];
    });
  };

  /**
   * ✅ Toggle whole attribute
   * If checked → add attribute with ALL values selected by default
   * If unchecked → remove attribute entirely
   */
  const handleToggleAttribute = (attrObj) => {
    setSelectedAttributes((prev) => {
      const exists = prev.find((a) => a.attribute === attrObj._id);

      // remove
      if (exists) return prev.filter((a) => a.attribute !== attrObj._id);

      // default select all value labels
      const allLabels = Array.isArray(attrObj.values)
        ? attrObj.values.map((v) => v.label || v.value).filter(Boolean)
        : [];

      return [
        ...prev,
        {
          attribute: attrObj._id,
          key: attrObj.slug || attrObj.key || (attrObj.name || "").toLowerCase(),
          name: attrObj.name || attrObj.key,
          values: allLabels, // ✅ storing labels/values as strings
        },
      ];
    });
  };

  /**
   * ✅ Toggle a single value label inside an attribute
   */
  const toggleAttributeValue = (attrId, label) => {
    setSelectedAttributes((prev) =>
      prev.map((a) => {
        if (a.attribute !== attrId) return a;

        const exists = a.values.includes(label);
        return {
          ...a,
          values: exists ? a.values.filter((v) => v !== label) : [...a.values, label],
        };
      })
    );
  };

  const removeGalleryItem = (url) => {
    setGallery((prev) => prev.filter((img) => img?.url !== url && img !== url));
  };

  // ✅ Parse tags into array
  const parsedTags = useMemo(() => {
    return String(tagsInput || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }, [tagsInput]);

  const applyAndClose = () => {
    const payload = {
      categories: selectedCategories,

      // ✅ Only keep attributes that have values selected
      attributes: selectedAttributes
        .map((a) => ({
          attribute: a.attribute,
          key: a.key,
          values: Array.isArray(a.values) ? a.values : [],
        }))
        .filter((a) => a.attribute && a.key && a.values.length),

      shortDescription,
      description,
      tags: parsedTags,

      thumbnail: thumbnail
        ? typeof thumbnail === "string"
          ? thumbnail
          : thumbnail.url
        : "",

      images: gallery.map((g) => (typeof g === "string" ? g : g.url)),
    };

    onApply?.(payload);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
  <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.20)] ring-1 ring-gray-200/60">
    
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-b from-white to-gray-50">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">
          Bulk Import Setup
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Categories • Attributes • Values • Media • Tags • Descriptions
        </p>
      </div>

      <button
        onClick={onClose}
        className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
      >
        <X size={18} />
      </button>
    </div>

    {/* Body */}
    <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2">

      {/* LEFT: Categories */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Select Categories
        </h3>

        {catLoading ? (
          <p className="text-sm text-gray-500">Loading categories…</p>
        ) : (
          <div className="max-h-[260px] overflow-auto space-y-2 pr-2">
            {flatCategories.map((cat) => {
              const label = cat.slug || cat.name || cat.title;
              if (!label) return null;

              const checked = selectedCategories.includes(label);

              return (
                <label
                  key={cat._id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleCategory(label)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-800">
                    {cat.name || label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Attributes */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Attributes + Values
        </h3>

        {attrLoading ? (
          <p className="text-sm text-gray-500">Loading attributes…</p>
        ) : (
          <div className="max-h-[320px] overflow-auto space-y-3 pr-2">
            {attributes.map((a) => {
              const selectedAttr = selectedAttributes.find(
                (x) => x.attribute === a._id
              );

              const checked = !!selectedAttr;

              const valueLabels = Array.isArray(a.values)
                ? a.values.map((v) => v.label || v.value).filter(Boolean)
                : [];

              return (
                <div
                  key={a._id}
                  className="rounded-2xl bg-gray-50/70 ring-1 ring-gray-200/50 px-4 py-4"
                >
                  {/* Attribute header */}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAttribute(a)}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {a.name || a.key}
                      </p>
                      <p className="text-xs text-gray-500">
                        Choose attribute and manually select values
                      </p>
                    </div>
                  </label>

                  {/* Values */}
                  {checked && valueLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {valueLabels.map((label) => {
                        const active = selectedAttr?.values?.includes(label);

                        return (
                          <button
                            type="button"
                            key={label}
                            onClick={() => toggleAttributeValue(a._id, label)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ring-1 ${
                              active
                                ? "bg-black text-white ring-black"
                                : "bg-white text-gray-800 ring-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {checked && !valueLabels.length && (
                    <p className="mt-3 text-xs text-red-500">
                      ⚠️ No values found for this attribute
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Descriptions + Tags */}
      <div className="md:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Descriptions + Tags
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              Short Description
            </p>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 ring-1 ring-gray-200/60 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              Long Description
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 ring-1 ring-gray-200/60 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-gray-600">
            Tags (comma separated)
          </p>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="cotton, men, shirt"
            className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 ring-1 ring-gray-200/60 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {!!parsedTags.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 ring-1 ring-gray-200/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="md:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Media (Thumbnail + Gallery)
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Thumbnail */}
          <div className="rounded-2xl bg-gray-50/70 ring-1 ring-gray-200/50 p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">Thumbnail</p>

            {thumbnail ? (
              <div className="flex items-center gap-4">
                <img
                  src={
                    typeof thumbnail === "string" ? thumbnail : thumbnail.url
                  }
                  alt="thumb"
                  className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-gray-200/60"
                />
                <button
                  onClick={() => setThumbnail(null)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No thumbnail selected</p>
            )}

            <button
              onClick={() => setThumbOpen(true)}
              className="mt-4 w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Select Thumbnail
            </button>
          </div>

          {/* Gallery */}
          <div className="rounded-2xl bg-gray-50/70 ring-1 ring-gray-200/50 p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">
              Gallery Images
            </p>

            {gallery?.length ? (
              <div className="flex flex-wrap gap-2">
                {gallery.slice(0, 6).map((img) => {
                  const url = typeof img === "string" ? img : img.url;
                  return (
                    <div
                      key={url}
                      className="relative h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-gray-200/60"
                    >
                      <img
                        src={url}
                        alt="gallery"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(url)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 text-[10px] text-white hover:bg-black"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {gallery.length > 6 && (
                  <span className="text-xs text-gray-500 self-end">
                    +{gallery.length - 6} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No gallery selected</p>
            )}

            <button
              onClick={() => setGalleryOpen(true)}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Select Gallery
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4">
      <button
        onClick={onClose}
        className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-200/60 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        onClick={applyAndClose}
        className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Apply
      </button>
    </div>
  </div>

  {/* ✅ Media Pickers */}
  <MediaPickerModal
    open={thumbOpen}
    onClose={() => setThumbOpen(false)}
    folder="miray/products"
    onSelect={(media) => {
      setThumbnail(media);
      setThumbOpen(false);
    }}
  />

  <MediaPickerModal
    open={galleryOpen}
    onClose={() => setGalleryOpen(false)}
    multiple
    folder="miray/products/gallery"
    onSelect={(list) => {
      setGallery(list || []);
      setGalleryOpen(false);
    }}
  />
</div>

  );
}
