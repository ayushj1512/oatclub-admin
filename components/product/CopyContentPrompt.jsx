"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { useCategoryStore } from "@/store/categorystore";

const BASE_PROMPT = `You are the Senior Fashion Content Manager, Luxury Copywriter, SEO Expert, and Product Merchandiser for OATCLUB.

Brand Name: OATCLUB
Tagline: Own All Trends

Analyze the uploaded product images and generate a luxury ecommerce product JSON.

Tone:
- Premium
- Fashion-forward
- Modern luxury
- Zara inspired
- Mango inspired
- Massimo Dutti inspired
- Clean and elegant
- No cheap marketplace language
- No generic AI sounding text
- No excessive adjectives
- Short, refined and conversion focused

Important Rules:
1. Analyze the product image carefully.
2. Write confidently as a fashion brand.
3. Never mention uncertainty.
4. Never say "appears to be".
5. Do not add markdown.
6. Do not add explanation.
7. Do not wrap JSON in code block.
8. Output ONLY valid JSON.
9. Keep price and compareAtPrice empty string.
10. Keep categories as an array.
11. Do not include image URLs.
12. Always create clothing size variants: XS, S, M, L, XL.
13. Do not add price inside variants.

CATEGORY RULES:
{{CATEGORY_RULES}}

Required JSON Shape:

{
  "title": "",
  "price": "",
  "compareAtPrice": "",
  "categories": [],
  "shortDescription": "",
  "howToStyle": "",
  "fabricDetails": "",
  "keyFeatures": [],
  "specifications": [
    { "key": "Color", "value": "" },
    { "key": "Pattern", "value": "" },
    { "key": "Type", "value": "" },
    { "key": "Neckline", "value": "" },
    { "key": "Sleeve Type", "value": "" },
    { "key": "Length", "value": "" },
    { "key": "Fit", "value": "" },
    { "key": "Occasion", "value": "" },
    { "key": "Fabric", "value": "" },
    { "key": "Season", "value": "" }
  ],
  "attributes": [
    {
      "key": "Size",
      "values": ["XS", "S", "M", "L", "XL"]
    }
  ],
  "variants": [
    {
      "patternNumber": "",
      "attributes": [{ "key": "Size", "value": "XS" }],
      "sku": "",
      "barcode": "",
      "stock": 0,
      "isInStock": false,
      "reservedStock": 0,
      "weight": 0
    },
    {
      "patternNumber": "",
      "attributes": [{ "key": "Size", "value": "S" }],
      "sku": "",
      "barcode": "",
      "stock": 0,
      "isInStock": false,
      "reservedStock": 0,
      "weight": 0
    },
    {
      "patternNumber": "",
      "attributes": [{ "key": "Size", "value": "M" }],
      "sku": "",
      "barcode": "",
      "stock": 0,
      "isInStock": false,
      "reservedStock": 0,
      "weight": 0
    },
    {
      "patternNumber": "",
      "attributes": [{ "key": "Size", "value": "L" }],
      "sku": "",
      "barcode": "",
      "stock": 0,
      "isInStock": false,
      "reservedStock": 0,
      "weight": 0
    },
    {
      "patternNumber": "",
      "attributes": [{ "key": "Size", "value": "XL" }],
      "sku": "",
      "barcode": "",
      "stock": 0,
      "isInStock": false,
      "reservedStock": 0,
      "weight": 0
    }
  ],
  "tags": [],
  "colors": [],
  "highlights": [],
  "metaTitle": "",
  "metaDescription": "",
  "keywords": [],
  "collections": [],
  "isActive": true,
  "isDraft": false,
  "isFeatured": false,
  "originalProductLink": ""
}

Field Rules:

title:
Premium product title. Example: "Ivory Draped Cowl Neck Top"

price:
Keep empty string only.

compareAtPrice:
Keep empty string only.

categories:
Always return an array.
Use only categories provided in CATEGORY RULES.
Never create, rename, modify or guess a category.
Copy category names exactly as provided.
Do not return category IDs or slugs.

shortDescription:
2 refined ecommerce lines.

howToStyle:
2-3 lines of premium styling advice.

fabricDetails:
2-3 lines with confident estimated fabric composition.

keyFeatures:
Comma-free array of 6-8 product features.

specifications:
Array of objects with key and value.

attributes:
Always include Size with XS, S, M, L, XL.

variants:
Always create 5 variants for XS, S, M, L, XL.
Keep patternNumber, sku and barcode empty.
Keep stock and reservedStock 0.
Keep isInStock false.
Do not add price or compareAtPrice inside variants.

tags:
10-15 SEO tags in lowercase.

colors:
Primary colors only in lowercase array.

highlights:
5 short luxury highlights.

metaTitle:
Under 60 characters.

metaDescription:
150-160 characters.

keywords:
10-15 SEO keywords.

collections:
5 premium collection suggestions as text.
Collections are not categories and may be newly suggested.

originalProductLink:
Keep empty string unless a product source link is provided.

If product is:
- Dress: create premium dress copy
- Co-Ord Set: create premium co-ord copy
- Crop Top: create trendy Gen-Z luxury copy
- Corset Top: create elevated feminine copy
- Resort Wear: create vacation luxury copy
- Party Wear: create evening glamour copy

Output only valid JSON.`;

const getCategoryName = (category) =>
  String(category?.name || category?.title || "").trim();

export default function CopyContentPrompt() {
  const {
    categories,
    loading,
    fetchCategories,
  } = useCategoryStore();

  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!categories.length) {
      fetchCategories({ active: true });
    }
  }, [categories.length, fetchCategories]);

  const activeCategories = useMemo(
    () =>
      categories.filter((category) => {
        const name = getCategoryName(category);

        if (!name) return false;
        if (category?.isActive === false) return false;

        return true;
      }),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return activeCategories;

    return activeCategories.filter((category) =>
      getCategoryName(category).toLowerCase().includes(query)
    );
  }, [activeCategories, search]);

  const selectedCategories = useMemo(
    () =>
      activeCategories.filter((category) =>
        selectedIds.includes(category._id)
      ),
    [activeCategories, selectedIds]
  );

  const toggleCategory = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const removeCategory = (id) => {
    setSelectedIds((current) =>
      current.filter((item) => item !== id)
    );
  };

  const createCategoryRules = () => {
    if (!selectedCategories.length) {
      return `No categories have been selected.

Return:
"categories": []

Do not create or guess any category.`;
    }

    const allowedNames = selectedCategories.map(getCategoryName);

    return `Allowed categories:
${allowedNames.map((name) => `- ${name}`).join("\n")}

Strict instructions:
- Use only category names from the allowed list above.
- Copy category names exactly.
- Never create a new category.
- Never use synonyms or plural variations.
- Never return category IDs or slugs.
- Select only categories that accurately match the uploaded product.
- Return at least one category from this list.
- The categories array must contain only these allowed values.

Example:
"categories": ${JSON.stringify(allowedNames)}`;
  };

  const copyPrompt = async () => {
    try {
      const prompt = BASE_PROMPT.replace(
        "{{CATEGORY_RULES}}",
        createCategoryRules()
      );

      await navigator.clipboard.writeText(prompt);

      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Copy failed. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-950">
              AI Product Content Prompt
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
              Select existing categories before copying. ChatGPT will only
              use the selected OATCLUB categories and will not create new ones.
            </p>
          </div>

          <button
            type="button"
            onClick={copyPrompt}
            disabled={!selectedIds.length}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}

            {copied ? "Copied" : "Copy Prompt"}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-gray-300"
          >
            <div>
              <p className="text-xs font-medium text-gray-950">
                Allowed Categories
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                {selectedIds.length
                  ? `${selectedIds.length} selected`
                  : "Select categories for this prompt"}
              </p>
            </div>

            {loading ? (
              <Loader2
                size={16}
                className="animate-spin text-gray-500"
              />
            ) : (
              <ChevronDown
                size={16}
                className={`text-gray-500 transition ${
                  open ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {open && (
            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 p-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3">
                  <Search size={15} className="text-gray-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search categories..."
                    className="h-10 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading categories...
                  </div>
                ) : filteredCategories.length ? (
                  filteredCategories.map((category) => {
                    const selected = selectedIds.includes(
                      category._id
                    );

                    return (
                      <button
                        key={category._id}
                        type="button"
                        onClick={() =>
                          toggleCategory(category._id)
                        }
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {getCategoryName(category)}
                          </p>

                          {category?.parent?.name && (
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              Under {category.parent.name}
                            </p>
                          )}
                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            selected
                              ? "border-black bg-black text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selected && <Check size={13} />}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-xs text-gray-500">
                    No categories found.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <span
                key={category._id}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-medium text-white"
              >
                {getCategoryName(category)}

                <button
                  type="button"
                  onClick={() => removeCategory(category._id)}
                  className="rounded-full p-0.5 transition hover:bg-white/20"
                  aria-label={`Remove ${getCategoryName(category)}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {!selectedIds.length && (
          <p className="text-xs font-medium text-amber-600">
            Select at least one category to enable prompt copying.
          </p>
        )}
      </div>
    </div>
  );
}