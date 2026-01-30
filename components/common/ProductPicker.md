ProductPicker (Common Product Selection Component) — README

A reusable Product Selection component for admin screens where selecting product(s) is mandatory (Collections, Tight Reviews, Category blocks, etc.).
Supports infinite scroll, search by title + product code, product thumbnails, and single/multi select.

✅ Features

Multi-select / Single-select

Required selection validation support

Infinite scroll (loads next pages automatically while scrolling)

Search

normal text search (title)

product code search with normalization:

360 → 000360

2 → 000002

000360 stays 000360

Shows product image thumbnail

Shows Product Code (hides Mongo _id)

📦 File Location

Create this file:

src/components/common/ProductPicker.jsx

Then import and use anywhere.

⚙️ Requirements (Store)

Uses your Zustand store:

useAdminProductStore

fetchProducts(params)

fetchProductsByCategory(category, params) (returns products array ✅)

Uses useAdminProductStore.getState().products fallback when fetchProducts doesn’t return.

Tip: If you update fetchProducts to return data.products || [], this component becomes even cleaner (not required).

🧩 Props (API)
Required props

value

onChange

Full props list
Prop	Type	Default	Description
title	string	"Select Products"	Header title
multiple	boolean	true	Multi-select or single-select
required	boolean	false	Show “Selection required” state + validate on Done
value	string[] | string | null	—	Selected ids (array for multi, string for single)
onChange	function(next)	—	Called on selection change
categoryOptions	{label,value}[]	[]	Dropdown options
defaultCategory	string	""	Initially selected category
lockedCategory	string	""	Forces category; disables dropdown
initialLimit	number	20	Page batch size for infinite loading
🧪 Usage Examples
1) Multi-select (Collections) — Required
import { useState } from "react";
import ProductPicker from "@/components/common/ProductPicker";

export default function CollectionForm() {
  const [productIds, setProductIds] = useState([]);

  return (
    <ProductPicker
      title="Select products for collection"
      multiple
      required
      value={productIds}
      onChange={setProductIds}
      categoryOptions={[
        { label: "Sarees", value: "sarees" },
        { label: "Kurtas", value: "kurtas" },
      ]}
    />
  );
}

2) Multi-select with Locked Category (Tight Reviews)
<ProductPicker
  title="Select products for Tight Reviews"
  multiple
  required
  lockedCategory="tight-reviews"
  value={selectedIds}
  onChange={setSelectedIds}
/>

3) Single Select (Featured Product)
import { useState } from "react";
import ProductPicker from "@/components/common/ProductPicker";

export default function FeaturedProduct() {
  const [featuredId, setFeaturedId] = useState(null);

  return (
    <ProductPicker
      title="Pick a featured product"
      multiple={false}
      required
      value={featuredId}
      onChange={setFeaturedId}
    />
  );
}

🔎 Search Behavior
Text Search

Type anything (title keywords) → sent as:

q=<search text>

Product Code Search (numeric input)

If input contains digits, it generates normalized code and sends:

productCode=<normalized>

code=<normalized>

sku=<normalized>

✅ Also has a client-side fallback filter for code search if backend doesn’t support those params.

🖼️ Image Behavior

Thumbnail is auto-picked from common keys:

thumbnail, image, mainImage, featuredImage

images[0] (string or object: url / src)

fallback: variants[0].image etc.

If none exists → shows “NO IMG”

🧠 Product Code Display

Code shown in UI is picked from:

productCode → sku → styleCode → patternNumber → code

And normalized if numeric (pads to 6 digits).

Mongo _id is not shown in UI.

✅ Validation

If required={true}:

component shows “Selection is required”

clicking Done toasts error if nothing selected

In forms, you should still validate before final submit too (recommended).

