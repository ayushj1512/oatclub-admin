"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useCategoryStore } from "@/store/categorystore";
import { useHomepageSettingsStore } from "@/store/useHomepageSettingsStore";

/* =========================================================
   HELPERS
========================================================= */

const getProductCode = (product = {}) =>
  String(
    product?.productCode ||
    product?.code ||
    product?.sku ||
    product?.patternNumber ||
    product?.variants?.[0]?.patternNumber ||
    ""
  )
    .trim()
    .toUpperCase();

const getProductName = (product = {}) =>
  String(product?.title || product?.name || "Untitled Product");

const getProductImage = (product = {}) => {
  const firstImage = Array.isArray(product?.images)
    ? product.images[0]
    : "";

  if (typeof firstImage === "string") {
    return firstImage;
  }

  return (
    product?.image ||
    product?.thumbnail ||
    firstImage?.url ||
    "/placeholder.png"
  );
};

const getProductLink = (product = {}) => {
  if (!product?.slug) return "";

  return `/product/${product.slug}`;
};

const resetSortOrder = (items = []) =>
  items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

const createClientId = () =>
  `oat-gallery-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

/* =========================================================
   PAGE
========================================================= */

export default function OatGalleryPage() {
  const {
    oatGallery,
    loading,
    saving,
    error,
    success,
    fetchOatGallery,
    updateOatGallery,
    setOatGalleryLocal,
    clearMessages,
  } = useHomepageSettingsStore();

  const {
    products,
    loading: productsLoading,
    fetchProducts,
  } = useAdminProductStore();

  const {
    categories,
    loading: categoriesLoading,
    fetchCategories,
  } = useCategoryStore();

  const [items, setItems] = useState([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProductCode, setSelectedProductCode] =
    useState("");

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  /* =======================================================
     INITIAL DATA
  ======================================================= */

  useEffect(() => {
    const loadPage = async () => {
      await Promise.all([
        fetchOatGallery(),
        fetchCategories(),
        fetchProducts({
          page: 1,
          limit: 50,
          isActive: true,
        }),
      ]);

      setHasLoaded(true);
    };

    loadPage();
  }, [
    fetchOatGallery,
    fetchCategories,
    fetchProducts,
  ]);

  useEffect(() => {
    if (!hasLoaded) return;

    setItems(resetSortOrder(oatGallery || []));
  }, [oatGallery, hasLoaded]);

  /* =======================================================
     PRODUCT OPTIONS
  ======================================================= */

  const productOptions = useMemo(() => {
    return (products || [])
      .map((product) => ({
        product,
        code: getProductCode(product),
        name: getProductName(product),
        image: getProductImage(product),
        link: getProductLink(product),
      }))
      .filter((item) => item.code);
  }, [products]);

  const selectedProduct = useMemo(
    () =>
      productOptions.find(
        (item) => item.code === selectedProductCode
      ) || null,
    [productOptions, selectedProductCode]
  );

  /* =======================================================
     SEARCH PRODUCTS
  ======================================================= */

  const handleSearchProducts = async () => {
    await fetchProducts({
      page: 1,
      limit: 100,
      search: searchText.trim(),
      category: selectedCategory,
      isActive: true,
    });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchProducts();
    }
  };

  const handleCategoryChange = async (event) => {
    const category = event.target.value;

    setSelectedCategory(category);
    setSelectedProductCode("");

    await fetchProducts({
      page: 1,
      limit: 100,
      search: searchText.trim(),
      category,
      isActive: true,
    });
  };

  const handleClearSearch = async () => {
    setSearchText("");
    setSelectedCategory("");
    setSelectedProductCode("");

    await fetchProducts({
      page: 1,
      limit: 50,
      isActive: true,
    });
  };

  /* =======================================================
     MEDIA PICKER
  ======================================================= */

  const handleMediaSelect = (media) => {
    const selected = Array.isArray(media)
      ? media[0]
      : media;

    if (!selected?.url) return;

    setSelectedMedia({
      url: selected.url,
      publicId: selected.publicId || "",
    });

    setMediaOpen(false);
  };

  /* =======================================================
     ADD ITEM
  ======================================================= */

  const handleAddItem = () => {
    if (!selectedMedia?.url) {
      window.alert("Please select an image first.");
      return;
    }

    if (!selectedProduct?.code) {
      window.alert("Please select a product.");
      return;
    }

    const duplicate = items.some(
      (item) =>
        String(item.productCode).toUpperCase() ===
        selectedProduct.code
    );

    if (duplicate) {
      window.alert(
        "This product is already present in OAT Gallery."
      );
      return;
    }

    const nextItems = resetSortOrder([
      ...items,
      {
        clientId: createClientId(),
        image: selectedMedia.url,
        productCode: selectedProduct.code,
        isActive: true,
      },
    ]);

    setItems(nextItems);
    setOatGalleryLocal(nextItems);

    setSelectedMedia(null);
    setSelectedProductCode("");
    clearMessages();
  };

  /* =======================================================
     ITEM ACTIONS
  ======================================================= */

  const updateLocalItems = (nextItems) => {
    const normalized = resetSortOrder(nextItems);

    setItems(normalized);
    setOatGalleryLocal(normalized);
    clearMessages();
  };

  const handleRemove = (index) => {
    const confirmed = window.confirm(
      "Remove this image from OAT Gallery?"
    );

    if (!confirmed) return;

    updateLocalItems(
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleToggle = (index) => {
    updateLocalItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
            ...item,
            isActive: !item.isActive,
          }
          : item
      )
    );
  };

  const moveItem = (fromIndex, toIndex) => {
    if (
      toIndex < 0 ||
      toIndex >= items.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);

    nextItems.splice(toIndex, 0, movedItem);
    updateLocalItems(nextItems);
  };

  /* =======================================================
     DRAG AND DROP
  ======================================================= */

  const handleDragStart = (event, index) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event, dropIndex) => {
    event.preventDefault();

    if (draggedIndex === null) return;

    moveItem(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    const invalidItem = items.find(
      (item) => !item?.image || !item?.productCode
    );

    if (invalidItem) {
      window.alert(
        "Every gallery item must have an image and product."
      );
      return;
    }

    const payload = resetSortOrder(items).map(
      (item) => ({
        image: item.image,
        productCode: item.productCode,
        isActive: item.isActive !== false,
        sortOrder: item.sortOrder,
      })
    );

    const result = await updateOatGallery(payload);

    if (result) {
      setItems(resetSortOrder(result));
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading && !hasLoaded) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading OAT Gallery...
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <a
              href="/designing"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black"
            >
              <ArrowLeft size={14} />
              Designing
            </a>

            <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
              OAT Gallery
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Add campaign images and connect each image to
              a product.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Saving..." : "Save Gallery"}
          </button>
        </section>

        {/* Messages */}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={16} />
            {success}
          </div>
        ) : null}

        {/* Add new item */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-950">
              Add Gallery Item
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Step 1: select image. Step 2: find product.
              Step 3: add it to the gallery.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Image picker */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                1. Gallery Image
              </p>

              <button
                type="button"
                onClick={() => setMediaOpen(true)}
                className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-black hover:bg-gray-100"
              >
                {selectedMedia?.url ? (
                  <>
                    <img
                      src={selectedMedia.url}
                      alt="Selected gallery"
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute inset-x-3 bottom-3 rounded-lg bg-black/80 px-3 py-2 text-xs font-semibold text-white">
                      Change image
                    </span>
                  </>
                ) : (
                  <div className="px-5 text-center">
                    <ImagePlus className="mx-auto h-8 w-8 text-gray-400 group-hover:text-black" />

                    <p className="mt-3 text-sm font-semibold text-gray-700">
                      Select image
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Upload or choose from Media Library
                    </p>
                  </div>
                )}
              </button>
            </div>

            {/* Product selector */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                2. Connect Product
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search name or product code"
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-black"
                  />

                  {searchText ? (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>

                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  disabled={categoriesLoading}
                  className="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-black"
                >
                  <option value="">All categories</option>

                  {(categories || []).map((category) => (
                    <option
                      key={category._id}
                      value={category.slug || category._id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSearchProducts}
                  disabled={productsLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                  {productsLoading ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Search size={16} />
                  )}
                  Search Products
                </button>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Select from search results
                </label>

                <select
                  value={selectedProductCode}
                  onChange={(event) =>
                    setSelectedProductCode(
                      event.target.value
                    )
                  }
                  disabled={
                    productsLoading ||
                    productOptions.length === 0
                  }
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-black disabled:bg-gray-100"
                >
                  <option value="">
                    {productsLoading
                      ? "Searching products..."
                      : productOptions.length
                        ? "Select a product"
                        : "No products found"}
                  </option>

                  {productOptions.map((item) => (
                    <option
                      key={item.product._id}
                      value={item.code}
                    >
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-16 w-13 rounded-lg border border-gray-200 object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {selectedProduct.name}
                    </p>

                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Code: {selectedProduct.code}
                    </p>

                    {selectedProduct.link ? (
                      <a
                        href={selectedProduct.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Open product
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleAddItem}
                disabled={
                  !selectedMedia?.url ||
                  !selectedProduct?.code
                }
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <Plus size={17} />
                Add to Gallery
              </button>
            </div>
          </div>
        </section>

        {/* Gallery list */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-950">
                Gallery Order
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Drag cards or use arrows to change the
                storefront order.
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {items.length} items
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 px-5 py-14 text-center">
              <ImagePlus className="mx-auto h-9 w-9 text-gray-300" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                No gallery items yet
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Select an image and product above to begin.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <article
                  key={
                    item._id ||
                    item.clientId ||
                    `${item.productCode}-${index}`
                  }
                  draggable
                  onDragStart={(event) =>
                    handleDragStart(event, index)
                  }
                  onDragOver={handleDragOver}
                  onDrop={(event) =>
                    handleDrop(event, index)
                  }
                  onDragEnd={handleDragEnd}
                  className={`overflow-hidden rounded-xl border bg-white transition ${draggedIndex === index
                    ? "scale-[0.98] border-black opacity-50"
                    : "border-gray-200 hover:border-gray-400"
                    }`}
                >
                  <div className="relative aspect-[4/5] bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.productCode}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                      <GripVertical size={13} />
                      Drag
                    </div>

                    <span className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-gray-900">
                      #{index + 1}
                    </span>

                    {!item.isActive ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                          Hidden
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {item.productCode}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Storefront position: {index + 1}
                    </p>

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          moveItem(index, index - 1)
                        }
                        disabled={index === 0}
                        title="Move up"
                        className="flex h-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveItem(index, index + 1)
                        }
                        disabled={index === items.length - 1}
                        title="Move down"
                        className="flex h-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(index)}
                        title={
                          item.isActive
                            ? "Hide item"
                            : "Show item"
                        }
                        className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold ${item.isActive
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-500"
                          }`}
                      >
                        {item.isActive ? "ON" : "OFF"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        title="Remove item"
                        className="flex h-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                {saving ? "Saving..." : "Save Gallery"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        multiple={false}
        folder="oatclub/homepage/oat-gallery"
        onSelect={handleMediaSelect}
      />
    </main>
  );
}
