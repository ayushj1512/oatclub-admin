"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Hash,
  Loader2,
  PackageSearch,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import ProductPicker from "@/components/common/ProductPicker";

const COMMERCE_BASE_URL =
  "https://studio.oatclub.in/api/commerce-manager";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeCodes = (codes = []) => [
  ...new Set(safeArray(codes).map(normalizeCode).filter(Boolean)),
];

const createSlug = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const parseCodes = (value = "") =>
  normalizeCodes(String(value).split(/[\n,\s;|]+/));

const getProductCode = (product) => {
  const candidates = [
    product?.productCode,
    product?.sku,
    product?.styleCode,
    product?.patternNumber,
    product?.code,
    product?.productDetails?.productCode,
    product?.productDetails?.code,
  ];

  for (const value of candidates) {
    const code = normalizeCode(value);

    if (code) {
      return code;
    }
  }

  return "";
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-black outline-none transition placeholder:text-zinc-400 focus:border-black";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500";

const cardClass =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export default function CommerceFeedForm({
  mode = "create",
  initialData = null,
  loading = false,
  onSubmit,
  onDelete,
  onRefreshXml,
}) {
  const router = useRouter();

  const initialCodes = normalizeCodes(
    initialData?.selectedProductCodes || [],
  );

  const [name, setName] = useState(initialData?.name || "");
  const [platform, setPlatform] = useState(
    initialData?.platform || "meta",
  );
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugTouched, setSlugTouched] = useState(
    Boolean(initialData?.slug),
  );

  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isActive, setIsActive] = useState(
    initialData?.isActive ?? true,
  );

  const [selectedCodes, setSelectedCodes] =
    useState(initialCodes);

  const [manualCodes, setManualCodes] = useState("");

  const [selectedProductIds, setSelectedProductIds] =
    useState([]);

  const [pickerProducts, setPickerProducts] = useState([]);

  const [feedSettings, setFeedSettings] = useState({
    title:
      initialData?.feedSettings?.title ||
      initialData?.name ||
      "",

    description:
      initialData?.feedSettings?.description || "",

    forceInStock:
      initialData?.feedSettings?.forceInStock ?? true,

    forcedInventory:
      initialData?.feedSettings?.forcedInventory ?? 999999,

    includeOutOfStock:
      initialData?.feedSettings?.includeOutOfStock ?? false,

    includeAdditionalImages:
      initialData?.feedSettings?.includeAdditionalImages ?? true,

    maxAdditionalImages:
      initialData?.feedSettings?.maxAdditionalImages ?? 10,

    customLabel0:
      initialData?.feedSettings?.customLabel0 || "",

    customLabel1:
      initialData?.feedSettings?.customLabel1 || "",
  });

  const generatedXmlUrl = useMemo(() => {
    const currentSlug = createSlug(slug);

    if (!currentSlug) return "";

    const path =
      platform === "google"
        ? "google/xml"
        : "xml";

    return `${COMMERCE_BASE_URL}/${path}/${currentSlug}`;
  }, [platform, slug]);

  const pickerCodes = useMemo(
    () =>
      normalizeCodes(
        safeArray(pickerProducts).map(getProductCode),
      ),
    [pickerProducts],
  );

  const handleNameChange = (value) => {
    setName(value);

    if (!slugTouched) {
      setSlug(createSlug(value));
    }

    if (!feedSettings.title) {
      setFeedSettings((current) => ({
        ...current,
        title: value,
      }));
    }
  };

  const handleSlugChange = (value) => {
    setSlugTouched(true);
    setSlug(createSlug(value));
  };

  const handleAddManualCodes = () => {
    const codes = parseCodes(manualCodes);

    if (!codes.length) {
      toast.error("Enter valid product codes");
      return;
    }

    setSelectedCodes((current) =>
      normalizeCodes([...current, ...codes]),
    );

    setManualCodes("");
    toast.success(`${codes.length} code(s) added`);
  };

  const handleAddPickerCodes = () => {
    if (!pickerCodes.length) {
      toast.error("Selected products have no valid product codes");
      return;
    }

    setSelectedCodes((current) =>
      normalizeCodes([...current, ...pickerCodes]),
    );

    setSelectedProductIds([]);
    setPickerProducts([]);

    toast.success(`${pickerCodes.length} product(s) added`);
  };

  const handleRemoveCode = (code) => {
    const target = normalizeCode(code);

    setSelectedCodes((current) =>
      current.filter(
        (item) => normalizeCode(item) !== target,
      ),
    );
  };

  const handleCopyXml = async () => {
    if (!generatedXmlUrl) {
      toast.error("Add a valid slug first");
      return;
    }

    await navigator.clipboard.writeText(generatedXmlUrl);
    toast.success("XML link copied");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedName = String(name).trim();
    const normalizedSlug = createSlug(slug);

    if (!normalizedName) {
      toast.error("Feed name is required");
      return;
    }

    if (!normalizedSlug) {
      toast.error("Feed slug is required");
      return;
    }

    if (!selectedCodes.length) {
      toast.error("Select at least one product");
      return;
    }

    const result = await onSubmit?.({
      name: normalizedName,
      slug: normalizedSlug,
      platform,
      selectedProductCodes: selectedCodes,
      isActive,
      notes: String(notes).trim(),

      feedSettings: {
        title:
          String(feedSettings.title).trim() ||
          normalizedName,

        description: String(
          feedSettings.description,
        ).trim(),

        forceInStock: Boolean(
          feedSettings.forceInStock,
        ),

        forcedInventory: Math.max(
          0,
          Number(feedSettings.forcedInventory) || 0,
        ),

        includeOutOfStock: Boolean(
          feedSettings.includeOutOfStock,
        ),

        includeAdditionalImages: Boolean(
          feedSettings.includeAdditionalImages,
        ),

        maxAdditionalImages: Math.max(
          0,
          Math.min(
            10,
            Number(feedSettings.maxAdditionalImages) || 0,
          ),
        ),

        customLabel0: String(
          feedSettings.customLabel0,
        ).trim(),

        customLabel1:
          String(feedSettings.customLabel1).trim() ||
          normalizedSlug,
      },

      lastUpdatedBy: "Admin",
    });

    return result;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen bg-[#f6f6f6] p-4 text-black md:p-6"
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <section className={cardClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/marketing/commerceManager",
                  )
                }
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div>
                <h1 className="text-xl font-black tracking-tight md:text-2xl">
                  {mode === "edit"
                    ? "Edit Commerce Feed"
                    : "Create Commerce Feed"}
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Select products and generate a dedicated {platform === "google"
                    ? "Google Merchant"
                    : "Meta Commerce"} XML link.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {mode === "edit" && generatedXmlUrl ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopyXml}
                    className={`${buttonClass} border border-zinc-200 bg-white hover:bg-zinc-50`}
                  >
                    <Copy className="h-4 w-4" />
                    Copy XML
                  </button>

                  <a
                    href={generatedXmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonClass} border border-zinc-200 bg-white hover:bg-zinc-50`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open XML
                  </a>
                </>
              ) : null}

              {mode === "edit" && onRefreshXml ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onRefreshXml}
                  className={`${buttonClass} border border-zinc-200 bg-white hover:bg-zinc-50`}
                >
                  <Settings2 className="h-4 w-4" />
                  Refresh XML
                </button>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={`${buttonClass} bg-black text-white hover:bg-zinc-800`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {mode === "edit"
                  ? "Save Changes"
                  : "Create Feed"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className={cardClass}>
              <div className="mb-4 flex items-center gap-2">
                <PackageSearch className="h-5 w-5" />

                <h2 className="font-bold">
                  Feed Information
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Feed name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      handleNameChange(event.target.value)
                    }
                    placeholder="Trending Tops"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Slug
                  </label>

                  <input
                    value={slug}
                    onChange={(event) =>
                      handleSlugChange(event.target.value)
                    }
                    placeholder="trending-tops"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Platform
                  </label>

                  <select
                    value={platform}
                    onChange={(event) =>
                      setPlatform(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="meta">
                      Meta Commerce
                    </option>
                    <option value="google">
                      Google Merchant
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    XML link
                  </label>

                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedXmlUrl}
                      placeholder="XML link will appear here"
                      className={`${inputClass} bg-zinc-50`}
                    />

                    <button
                      type="button"
                      onClick={handleCopyXml}
                      disabled={!generatedXmlUrl}
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    rows={3}
                    placeholder="Internal notes..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    Select Products
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Select products using the product picker.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddPickerCodes}
                  disabled={!pickerCodes.length}
                  className={`${buttonClass} bg-black text-white hover:bg-zinc-800`}
                >
                  <Plus className="h-4 w-4" />
                  Add Selected
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <ProductPicker
                  title="Select Products"
                  multiple
                  value={selectedProductIds}
                  onChange={setSelectedProductIds}
                  onSelectedProductsChange={setPickerProducts}
                  categoryOptions={[]}
                />
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-4">
                <h2 className="font-bold">
                  Manual Product Codes
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Add codes using commas, spaces or new lines.
                </p>
              </div>

              <textarea
                value={manualCodes}
                onChange={(event) =>
                  setManualCodes(event.target.value)
                }
                placeholder={`TOP-00019\nAPP-00046\nAPP-00047`}
                rows={5}
                className={`${inputClass} resize-none`}
              />

              <button
                type="button"
                onClick={handleAddManualCodes}
                className={`${buttonClass} mt-3 bg-zinc-900 text-white hover:bg-black`}
              >
                <Plus className="h-4 w-4" />
                Add Codes
              </button>
            </section>

            <section className={cardClass}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    Selected Product Codes
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedCodes.length} product code(s)
                    selected.
                  </p>
                </div>

                {selectedCodes.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCodes([])}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>

              {selectedCodes.length ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedCodes.map((code) => (
                    <div
                      key={code}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                        <span className="truncate text-sm font-semibold">
                          {code}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveCode(code)
                        }
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
                  No products selected.
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className={cardClass}>
              <div className="mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5" />

                <h2 className="font-bold">
                  Feed Settings
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    XML title
                  </label>

                  <input
                    value={feedSettings.title}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="OATCLUB Trending Tops"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    XML description
                  </label>

                  <textarea
                    value={feedSettings.description}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder={
                      platform === "google"
                        ? "Selected products for Google Merchant Center."
                        : "Selected products for Meta Commerce Manager."
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Forced inventory
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={feedSettings.forcedInventory}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        forcedInventory: event.target.value,
                      }))
                    }
                    disabled={!feedSettings.forceInStock}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Additional images
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={feedSettings.maxAdditionalImages}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        maxAdditionalImages:
                          event.target.value,
                      }))
                    }
                    disabled={
                      !feedSettings.includeAdditionalImages
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Custom label 0
                  </label>

                  <input
                    value={feedSettings.customLabel0}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        customLabel0: event.target.value,
                      }))
                    }
                    placeholder="Trending Tops"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Custom label 1
                  </label>

                  <input
                    value={feedSettings.customLabel1}
                    onChange={(event) =>
                      setFeedSettings((current) => ({
                        ...current,
                        customLabel1: event.target.value,
                      }))
                    }
                    placeholder={slug || "feed-slug"}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="space-y-3">
                <ToggleRow
                  label="Feed active"
                  description={`Allow ${platform === "google" ? "Google" : "Meta"
                    } to access this XML feed.`}
                  checked={isActive}
                  onChange={setIsActive}
                />

                <ToggleRow
                  label="Force in stock"
                  description="Always send products as available."
                  checked={feedSettings.forceInStock}
                  onChange={(checked) =>
                    setFeedSettings((current) => ({
                      ...current,
                      forceInStock: checked,
                    }))
                  }
                />

                <ToggleRow
                  label="Include out of stock"
                  description="Send unavailable variants too."
                  checked={feedSettings.includeOutOfStock}
                  onChange={(checked) =>
                    setFeedSettings((current) => ({
                      ...current,
                      includeOutOfStock: checked,
                    }))
                  }
                />

                <ToggleRow
                  label="Additional images"
                  description={`Send gallery images to ${platform === "google" ? "Google" : "Meta"
                    }.`}
                  checked={
                    feedSettings.includeAdditionalImages
                  }
                  onChange={(checked) =>
                    setFeedSettings((current) => ({
                      ...current,
                      includeAdditionalImages: checked,
                    }))
                  }
                />
              </div>
            </section>

            {mode === "edit" && onDelete ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-bold text-red-700">
                  Delete Feed
                </h3>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  The XML link will stop working immediately.
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={onDelete}
                  className={`${buttonClass} mt-4 bg-red-600 text-white hover:bg-red-700`}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Feed
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left"
    >
      <div>
        <div className="text-sm font-semibold">
          {label}
        </div>

        <div className="mt-0.5 text-xs text-zinc-500">
          {description}
        </div>
      </div>

      <div
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-black" : "bg-zinc-300"
          }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"
            }`}
        >
          {checked ? (
            <Check className="h-3 w-3 text-black" />
          ) : null}
        </span>
      </div>
    </button>
  );
}
