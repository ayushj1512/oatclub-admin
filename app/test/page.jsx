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
  "Playfair Display",
  "Cormorant Garamond",
  "Georgia",
  "Arial",
  "Helvetica",
];

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

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:wght@500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Urbanist:wght@400;500;600;700;800;900&display=swap");

        .font-playground-heading,
        .font-playground-heading * {
          font-family: var(--test-heading-font) !important;
        }

        .font-playground-body,
        .font-playground-body * {
          font-family: var(--test-body-font) !important;
        }
      `}</style>

      <main
        className="min-h-screen bg-[#f6f6f4] text-black"
        style={{
          "--test-heading-font": `"${headingFont}", Arial, sans-serif`,
          "--test-body-font": `"${bodyFont}", Arial, sans-serif`,
        }}
      >
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-playground-body text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
                OATCLUB Font Playground
              </p>
              <h1 className="font-playground-heading mt-1 text-2xl font-black uppercase tracking-[-0.05em] md:text-4xl">
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
                  className="h-11 w-full min-w-[220px] border border-neutral-300 bg-white px-3 text-xs font-semibold uppercase tracking-wider outline-none"
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
                  className="h-11 w-full min-w-[220px] border border-neutral-300 bg-white px-3 text-xs font-semibold uppercase tracking-wider outline-none"
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

        <section className="grid md:grid-cols-[58%_42%]">
          <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1">
            {[
              "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop",
            ].map((img, i) => (
              <div key={i} className="aspect-[4/5] overflow-hidden bg-neutral-200">
                <img src={img} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>

          <aside className="bg-white px-5 py-7 md:sticky md:top-[88px] md:h-[calc(100vh-88px)] md:px-9 md:py-10">
            <p style={bodyStyle} className="text-[10px] font-semibold text-neutral-500">
              OATCLUB / NEW ARRIVALS
            </p>

            <h2
              style={headingStyle}
              className="mt-4 text-[42px] font-black leading-[0.88] md:text-[72px]"
            >
              Linen Blend Co-ord Set
            </h2>

            <p style={bodyStyle} className="mt-5 text-xs font-medium leading-6 text-neutral-600">
              A clean matching set designed with a relaxed silhouette, refined
              texture, and effortless everyday polish.
            </p>

            <div className="mt-6 flex items-center justify-between border-y border-neutral-200 py-4">
              <p style={bodyStyle} className="text-sm font-bold">
                ₹2,499
              </p>
              <p style={bodyStyle} className="text-[10px] text-neutral-500">
                Inclusive of all taxes
              </p>
            </div>

            <div className="mt-6">
              <p style={bodyStyle} className="mb-3 text-[11px] font-bold">
                Select Size
              </p>

              <div className="grid grid-cols-5 gap-2">
                {["XS", "S", "M", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    style={bodyStyle}
                    className="h-11 border border-neutral-300 text-[11px] font-bold hover:border-black"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={bodyStyle}
              className="mt-6 h-12 w-full bg-black text-[11px] font-bold text-white"
            >
              Add To Bag
            </button>

            <button
              style={bodyStyle}
              className="mt-2 h-12 w-full border border-black text-[11px] font-bold"
            >
              Buy Now
            </button>

            <div className="mt-8 space-y-5 border-t border-neutral-200 pt-6">
              {[
                ["Product Details", "Relaxed fit. Lightweight texture. Premium finish."],
                ["Fabric & Care", "Soft blend fabric. Gentle machine wash recommended."],
                ["Quality Check", "Each piece is checked before dispatch."],
              ].map(([title, text]) => (
                <div key={title}>
                  <h3 style={headingStyle} className="text-sm font-black">
                    {title}
                  </h3>
                  <p style={bodyStyle} className="mt-1 text-[10px] leading-5 text-neutral-500">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 bg-neutral-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Current Selection
              </p>
              <p className="mt-1 text-xs font-semibold uppercase">
                Heading: {headingFont}
              </p>
              <p className="text-xs font-semibold uppercase">
                Body: {bodyFont}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}