"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useCategoryStore } from "@/store/categorystore";
import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";

const normalizeOrder = (items = []) =>
  items.map((item, index) => ({ ...item, sortOrder: index }));

const emptyForm = {
  categoryId: "",
  categoryName: "",
  categorySlug: "",
  title: "",
  subtitle: "",
  image: "",
  link: "",
  isActive: true,
};

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return normalizeOrder(next);
}

export default function CategoryBannerPage() {
  const {
    categoryBanners,
    loading,
    saving,
    error,
    success,
    fetchHomepageSettings,
    setCategoryBannersLocal,
    updateCategoryBanners,
    clearMessages,
  } = useHomepageSettingsStore();

  const { categories, fetchCategories } = useCategoryStore();

  const [form, setForm] = useState(emptyForm);
  const [mediaTarget, setMediaTarget] = useState(null);

  useEffect(() => {
    fetchHomepageSettings();
    fetchCategories();
  }, [fetchHomepageSettings, fetchCategories]);

  const sortedBanners = useMemo(
    () =>
      [...(categoryBanners || [])].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      ),
    [categoryBanners]
  );

  const selectCategory = (categoryId) => {
    const category = (categories || []).find((item) => item._id === categoryId);

    const categoryName = category?.name || "";
    const categorySlug = category?.slug || "";

    setForm((current) => ({
      ...current,
      categoryId,
      categoryName,
      categorySlug,
      title: current.title || categoryName,
      link: categorySlug ? `/category/${categorySlug}` : "",
    }));
  };

  const handleMediaSelect = (media) => {
    if (!media?.url || !mediaTarget) return;

    if (mediaTarget.type === "form") {
      setForm((current) => ({ ...current, image: media.url }));
    }

    if (mediaTarget.type === "list") {
      const next = sortedBanners.map((item, index) =>
        index === mediaTarget.index ? { ...item, image: media.url } : item
      );

      setCategoryBannersLocal(next);
    }

    setMediaTarget(null);
  };

  const addBanner = () => {
    const categoryName = form.categoryName.trim();
    const categorySlug = form.categorySlug.trim();
    const image = form.image.trim();

    if (!categoryName) return alert("Please select category");
    if (!categorySlug) return alert("Category slug missing");
    if (!image) return alert("Please select banner image");

    const next = normalizeOrder([
      ...sortedBanners,
      {
        categoryName,
        categorySlug,
        title: form.title.trim() || categoryName,
        subtitle: form.subtitle.trim(),
        image,
        link: form.link.trim() || `/category/${categorySlug}`,
        isActive: form.isActive !== false,
      },
    ]);

    setCategoryBannersLocal(next);
    setForm(emptyForm);
  };

  const updateField = (index, field, value) => {
    const next = sortedBanners.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );

    setCategoryBannersLocal(next);
  };

  const removeBanner = (index) => {
    const next = sortedBanners.filter((_, itemIndex) => itemIndex !== index);
    setCategoryBannersLocal(normalizeOrder(next));
  };

  const save = async () => {
    clearMessages?.();

    const payload = normalizeOrder(sortedBanners);
    await updateCategoryBanners(payload);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 md:px-8">
      <MediaPickerModal
        open={Boolean(mediaTarget)}
        onClose={() => setMediaTarget(null)}
        folder="oatclub/category-banners"
        onSelect={handleMediaSelect}
      />

      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Homepage settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Category Banner
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Controls homepage category banners on storefront.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchHomepageSettings}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save banners"}
          </button>
        </div>
      </div>

      {(loading || error || success) && (
        <div className="mb-5 border border-zinc-200 bg-white px-4 py-3 text-sm">
          {loading ? "Loading homepage settings..." : error || success}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">
              Add category
            </h2>
          </div>

          <div className="space-y-3">
            <select
              value={form.categoryId}
              onChange={(event) => selectCategory(event.target.value)}
              className="w-full border border-zinc-300 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="">Select category</option>
              {(categories || []).map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Display title"
              className="w-full border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-zinc-950"
            />

            <input
              value={form.subtitle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subtitle: event.target.value,
                }))
              }
              placeholder="Subtitle optional"
              className="w-full border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-zinc-950"
            />

            <input
              value={form.link}
              onChange={(event) =>
                setForm((current) => ({ ...current, link: event.target.value }))
              }
              placeholder="/category/dresses"
              className="w-full border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-zinc-950"
            />

            <button
              type="button"
              onClick={() => setMediaTarget({ type: "form" })}
              className="inline-flex w-full items-center justify-center gap-2 border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              <ImageIcon size={16} />
              Select banner image
            </button>

            {form.image && (
              <div className="relative aspect-[4/5] overflow-hidden border border-zinc-200 bg-zinc-100">
                <Image
                  src={form.image}
                  alt="Category preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active on storefront
            </label>

            <button
              type="button"
              onClick={addBanner}
              className="inline-flex w-full items-center justify-center gap-2 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              <Plus size={16} />
              Add to stream
            </button>
          </div>
        </section>

        <section className="border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">
                Current stream
              </h2>
              <p className="text-xs text-zinc-500">
                {sortedBanners.length} category banners
              </p>
            </div>
          </div>

          {sortedBanners.length === 0 ? (
            <div className="border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
              No category banners added yet.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sortedBanners.map((item, index) => (
                <div
                  key={`${item.categorySlug}-${index}`}
                  className="border border-zinc-200 bg-zinc-50"
                >
                  <div className="relative aspect-[4/5] bg-zinc-100">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.title || item.categoryName || "Banner"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}

                    <div className="absolute left-3 top-3 bg-white px-2 py-1 text-xs font-semibold">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="space-y-2 p-3">
                    <input
                      value={item.title || ""}
                      onChange={(event) =>
                        updateField(index, "title", event.target.value)
                      }
                      className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-zinc-950"
                      placeholder="Title"
                    />

                    <input
                      value={item.subtitle || ""}
                      onChange={(event) =>
                        updateField(index, "subtitle", event.target.value)
                      }
                      className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      placeholder="Subtitle"
                    />

                    <input
                      value={item.link || ""}
                      onChange={(event) =>
                        updateField(index, "link", event.target.value)
                      }
                      className="w-full border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-950"
                      placeholder="Link"
                    />

                    <button
                      type="button"
                      onClick={() => setMediaTarget({ type: "list", index })}
                      className="w-full border border-zinc-300 bg-white px-2 py-2 text-xs font-semibold hover:bg-zinc-100"
                    >
                      Change banner image
                    </button>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryBannersLocal(
                            moveItem(sortedBanners, index, index - 1)
                          )
                        }
                        className="border border-zinc-300 bg-white p-2 hover:bg-zinc-100"
                        title="Move up"
                      >
                        <ArrowUp size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCategoryBannersLocal(
                            moveItem(sortedBanners, index, index + 1)
                          )
                        }
                        className="border border-zinc-300 bg-white p-2 hover:bg-zinc-100"
                        title="Move down"
                      >
                        <ArrowDown size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateField(index, "isActive", item.isActive === false)
                        }
                        className="border border-zinc-300 bg-white p-2 hover:bg-zinc-100"
                        title={item.isActive === false ? "Show" : "Hide"}
                      >
                        {item.isActive === false ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeBanner(index)}
                        className="ml-auto border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}