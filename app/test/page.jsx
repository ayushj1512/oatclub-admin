// app/test/page.jsx
"use client";

import { useMemo, useState } from "react";

const fonts = [
  "Poppins",
  "Inter",
  "Space Grotesk",
  "Manrope",
  "Montserrat",
  "DM Sans",
  "Outfit",
  "Urbanist",
  "Plus Jakarta Sans",
  "Work Sans",
  "Raleway",
  "Archivo",
  "Barlow",
  "Nunito Sans",
  "Lato",
  "Roboto",
  "Oswald",
  "Bebas Neue",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Cinzel",
  "Georgia",
  "Arial",
  "Helvetica",
];

const product = {
  title: "Linen Blend Co-ord Set",
  price: 2499,
  compareAtPrice: 3499,
  shortDescription:
    "A clean matching set designed with a relaxed silhouette, refined texture, and effortless everyday polish.",
  howToStyle:
    "Style it with minimal sandals, soft curls, and a structured mini bag for an elevated day-to-evening look.",
  fabricDetails:
    "Soft linen-blend fabric with a breathable handfeel, smooth drape, and comfortable all-day finish.",
  keyFeatures: [
    "Relaxed premium fit",
    "Matching top and bottom",
    "Lightweight breathable fabric",
    "Clean resort-inspired silhouette",
  ],
  specifications: [
    { key: "Color", value: "Ivory" },
    { key: "Fit", value: "Relaxed" },
    { key: "Pattern", value: "Solid" },
    { key: "Occasion", value: "Vacation / Brunch" },
  ],
  images: [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop",
  ],
};

export default function TestPage() {
  const [headingFont, setHeadingFont] = useState("Space Grotesk");
  const [bodyFont, setBodyFont] = useState("Inter");

  const headingStyle = useMemo(
    () => ({
      fontFamily: `"${headingFont}", Arial, sans-serif`,
      textTransform: "uppercase",
      letterSpacing: "-0.045em",
    }),
    [headingFont]
  );

  const bodyStyle = useMemo(
    () => ({
      fontFamily: `"${bodyFont}", Arial, sans-serif`,
      textTransform: "uppercase",
      letterSpacing: "0.055em",
    }),
    [bodyFont]
  );

  const discount = Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  );

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Barlow:wght@400;500;600;700;800;900&family=Bebas+Neue&family=Cinzel:wght@400;500;600;700;800;900&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=Lato:wght@400;700;900&family=Libre+Baskerville:wght@400;700&family=Manrope:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800;900&family=Raleway:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;600;700&family=Urbanist:wght@400;500;600;700;800;900&family=Work+Sans:wght@400;500;600;700;800;900&display=swap");

        .pg-heading,
        .pg-heading * {
          font-family: var(--heading-font) !important;
        }

        .pg-body,
        .pg-body * {
          font-family: var(--body-font) !important;
        }
      `}</style>

      <main
        className="min-h-screen bg-[#f5f5f3] text-black"
        style={{
          "--heading-font": `"${headingFont}", Arial, sans-serif`,
          "--body-font": `"${bodyFont}", Arial, sans-serif`,
        }}
      >
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="pg-body text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
                OATCLUB Typography Playground
              </p>
              <h1 className="pg-heading mt-1 text-2xl font-black uppercase tracking-[-0.05em] md:text-4xl">
                Product Detail Preview
              </h1>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Heading Font
                </span>
                <select
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  className="h-11 w-full min-w-[240px] border border-neutral-300 bg-white px-3 text-xs font-semibold uppercase tracking-wider outline-none"
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Body Font
                </span>
                <select
                  value={bodyFont}
                  onChange={(e) => setBodyFont(e.target.value)}
                  className="h-11 w-full min-w-[240px] border border-neutral-300 bg-white px-3 text-xs font-semibold uppercase tracking-wider outline-none"
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-[56%_44%]">
          <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1">
            {product.images.map((img, i) => (
              <div key={i} className="aspect-[4/5] overflow-hidden bg-neutral-200">
                <img
                  src={img}
                  alt={product.title}
                  className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                />
              </div>
            ))}
          </div>

          <aside className="bg-white px-5 py-7 md:sticky md:top-[85px] md:h-[calc(100vh-85px)] md:overflow-y-auto md:px-10 md:py-10">
            <div className="flex items-center justify-between">
              <p style={bodyStyle} className="text-[10px] font-bold text-neutral-500">
                OATCLUB / NEW ARRIVALS
              </p>

              <p style={bodyStyle} className="text-[10px] font-bold text-neutral-500">
                {discount}% OFF
              </p>
            </div>

            <h2
              style={headingStyle}
              className="mt-4 text-[40px] font-black leading-[0.88] md:text-[70px]"
            >
              {product.title}
            </h2>

            <p
              style={bodyStyle}
              className="mt-5 text-xs font-medium leading-6 text-neutral-600"
            >
              {product.shortDescription}
            </p>

            <div className="mt-6 flex items-end gap-3 border-y border-neutral-200 py-4">
              <p style={bodyStyle} className="text-lg font-black">
                ₹{product.price.toLocaleString("en-IN")}
              </p>
              <p
                style={bodyStyle}
                className="text-xs font-semibold text-neutral-400 line-through"
              >
                ₹{product.compareAtPrice.toLocaleString("en-IN")}
              </p>
              <p style={bodyStyle} className="ml-auto text-[10px] text-neutral-500">
                Inclusive of all taxes
              </p>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p style={bodyStyle} className="text-[11px] font-bold">
                  Select Size
                </p>
                <button style={bodyStyle} className="text-[10px] underline">
                  Size Guide
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {["XS", "S", "M", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    style={bodyStyle}
                    className="h-11 border border-neutral-300 text-[11px] font-bold transition hover:border-black hover:bg-black hover:text-white"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={bodyStyle}
              className="mt-6 h-12 w-full bg-black text-[11px] font-black text-white transition hover:bg-neutral-800"
            >
              Add To Bag
            </button>

            <button
              style={bodyStyle}
              className="mt-2 h-12 w-full border border-black text-[11px] font-black transition hover:bg-neutral-100"
            >
              Buy Now
            </button>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {["Quality Checked", "Curated For You", "Premium Finish"].map((x) => (
                <div key={x} className="bg-neutral-100 px-3 py-3 text-center">
                  <p style={bodyStyle} className="text-[9px] font-bold leading-4">
                    {x}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-6 border-t border-neutral-200 pt-6">
              <Block
                title="Product Details"
                text={product.shortDescription}
                headingStyle={headingStyle}
                bodyStyle={bodyStyle}
              />

              <Block
                title="How To Style"
                text={product.howToStyle}
                headingStyle={headingStyle}
                bodyStyle={bodyStyle}
              />

              <Block
                title="Fabric Details"
                text={product.fabricDetails}
                headingStyle={headingStyle}
                bodyStyle={bodyStyle}
              />

              <div>
                <h3 style={headingStyle} className="text-sm font-black">
                  Key Features
                </h3>

                <div className="mt-3 grid gap-2">
                  {product.keyFeatures.map((item) => (
                    <p
                      key={item}
                      style={bodyStyle}
                      className="border-b border-neutral-100 pb-2 text-[10px] font-medium leading-5 text-neutral-600"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={headingStyle} className="text-sm font-black">
                  Specifications
                </h3>

                <div className="mt-3 border border-neutral-200">
                  {product.specifications.map((spec) => (
                    <div
                      key={spec.key}
                      className="grid grid-cols-2 border-b border-neutral-200 last:border-b-0"
                    >
                      <p
                        style={bodyStyle}
                        className="bg-neutral-50 px-3 py-3 text-[10px] font-bold text-neutral-500"
                      >
                        {spec.key}
                      </p>
                      <p
                        style={bodyStyle}
                        className="px-3 py-3 text-[10px] font-semibold text-neutral-800"
                      >
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-neutral-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Current Selection
              </p>
              <p className="mt-1 text-xs font-semibold uppercase">
                Heading: {headingFont}
              </p>
              <p className="text-xs font-semibold uppercase">Body: {bodyFont}</p>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function Block({ title, text, headingStyle, bodyStyle }) {
  return (
    <div>
      <h3 style={headingStyle} className="text-sm font-black">
        {title}
      </h3>
      <p
        style={bodyStyle}
        className="mt-2 text-[10px] font-medium leading-5 text-neutral-600"
      >
        {text}
      </p>
    </div>
  );
}