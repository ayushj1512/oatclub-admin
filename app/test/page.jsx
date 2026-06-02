"use client";

import { useMemo, useState } from "react";
import {
  Abril_Fatface,
  Archivo,
  Bodoni_Moda,
  Bricolage_Grotesque,
  Cinzel,
  Cormorant_Garamond,
  DM_Sans,
  Epilogue,
  Fraunces,
  Inter,
  Instrument_Sans,
  Libre_Baskerville,
  Lora,
  Manrope,
  Marcellus,
  Montserrat,
  Newsreader,
  Onest,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Sora,
  Space_Grotesk,
  Syne,
  Tenor_Sans,
  Unbounded,
  Urbanist,
  Viaoda_Libre,
  Work_Sans,
  Yeseva_One,
} from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-dm-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-manrope",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-jakarta",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-outfit",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-sora",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-space-grotesk",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-instrument-sans",
});

const onest = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-onest",
});

const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-urbanist",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-work-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-montserrat",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-test-poppins",
});

const raleway = Raleway({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-raleway",
});

const epilogue = Epilogue({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-epilogue",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-archivo",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-bricolage",
});

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-syne",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-fraunces",
});

const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-test-abril",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-bodoni",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-cinzel",
});

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-test-marcellus",
});

const tenor = Tenor_Sans({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-test-tenor",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-unbounded",
});

const viaoda = Viaoda_Libre({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-test-viaoda",
});

const yeseva = Yeseva_One({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-test-yeseva",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-playfair",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-lora",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-test-libre",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-test-newsreader",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-test-cormorant",
});

const bodyFonts = [
  { label: "Inter", family: "var(--font-test-inter)" },
  { label: "DM Sans", family: "var(--font-test-dm-sans)" },
  { label: "Manrope", family: "var(--font-test-manrope)" },
  { label: "Plus Jakarta", family: "var(--font-test-jakarta)" },
  { label: "Instrument Sans", family: "var(--font-test-instrument-sans)" },
  { label: "Onest", family: "var(--font-test-onest)" },
  { label: "Urbanist", family: "var(--font-test-urbanist)" },
  { label: "Work Sans", family: "var(--font-test-work-sans)" },
  { label: "Montserrat", family: "var(--font-test-montserrat)" },
  { label: "Poppins", family: "var(--font-test-poppins)" },
  { label: "Raleway", family: "var(--font-test-raleway)" },
  { label: "Epilogue", family: "var(--font-test-epilogue)" },
  { label: "Archivo", family: "var(--font-test-archivo)" },
  { label: "Outfit", family: "var(--font-test-outfit)" },
  { label: "Sora", family: "var(--font-test-sora)" },
  { label: "Space Grotesk", family: "var(--font-test-space-grotesk)" },
];

const headingFonts = [
  { label: "Outfit", family: "var(--font-test-outfit)" },
  { label: "Sora", family: "var(--font-test-sora)" },
  { label: "Space Grotesk", family: "var(--font-test-space-grotesk)" },
  { label: "Bricolage", family: "var(--font-test-bricolage)" },
  { label: "Syne", family: "var(--font-test-syne)" },
  { label: "Urbanist", family: "var(--font-test-urbanist)" },
  { label: "Instrument Sans", family: "var(--font-test-instrument-sans)" },
  { label: "Plus Jakarta", family: "var(--font-test-jakarta)" },
  { label: "Montserrat", family: "var(--font-test-montserrat)" },
  { label: "Fraunces", family: "var(--font-test-fraunces)" },
  { label: "Abril Fatface", family: "var(--font-test-abril)" },
  { label: "Bodoni Moda", family: "var(--font-test-bodoni)" },
  { label: "Cinzel", family: "var(--font-test-cinzel)" },
  { label: "Marcellus", family: "var(--font-test-marcellus)" },
  { label: "Tenor Sans", family: "var(--font-test-tenor)" },
  { label: "Unbounded", family: "var(--font-test-unbounded)" },
  { label: "Viaoda Libre", family: "var(--font-test-viaoda)" },
  { label: "Yeseva One", family: "var(--font-test-yeseva)" },
  { label: "Playfair", family: "var(--font-test-playfair)" },
  { label: "Newsreader", family: "var(--font-test-newsreader)" },
  { label: "Cormorant", family: "var(--font-test-cormorant)" },
  { label: "Lora", family: "var(--font-test-lora)" },
  { label: "Libre Baskerville", family: "var(--font-test-libre)" },
];

const fontVariables = [
  inter.variable,
  dmSans.variable,
  manrope.variable,
  jakarta.variable,
  outfit.variable,
  sora.variable,
  spaceGrotesk.variable,
  instrumentSans.variable,
  onest.variable,
  urbanist.variable,
  workSans.variable,
  montserrat.variable,
  poppins.variable,
  raleway.variable,
  epilogue.variable,
  archivo.variable,
  bricolage.variable,
  syne.variable,
  fraunces.variable,
  abril.variable,
  bodoni.variable,
  cinzel.variable,
  marcellus.variable,
  tenor.variable,
  unbounded.variable,
  viaoda.variable,
  yeseva.variable,
  playfair.variable,
  lora.variable,
  libre.variable,
  newsreader.variable,
  cormorant.variable,
].join(" ");

function FontButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
          : "border-zinc-100 bg-white text-zinc-700 hover:border-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function TestPage() {
  const [headingFont, setHeadingFont] = useState(headingFonts[0]);
  const [bodyFont, setBodyFont] = useState(
    bodyFonts.find((font) => font.label === "Poppins") || bodyFonts[0]
  );

  const previewStyle = useMemo(
    () => ({
      "--preview-heading": headingFont.family,
      "--preview-body": bodyFont.family,
      fontFamily: "var(--preview-body)",
    }),
    [headingFont, bodyFont]
  );

  return (
    <main className={`${fontVariables} min-h-screen bg-zinc-50 px-5 py-6 text-zinc-950 lg:px-8`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-100 bg-white/90 p-5 shadow-[0_18px_50px_rgba(9,9,11,0.04)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              OATCLUB font test
            </p>
            <h1 className="text-3xl font-bold tracking-normal text-zinc-950 md:text-4xl">
              Choose heading and body fonts
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600">
              Select any combination below and check how dashboard cards, tables,
              labels, and product text feel together.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-100 bg-white/90 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-zinc-700">
              Heading fonts
            </h2>
            <div className="flex flex-wrap gap-2">
              {headingFonts.map((font) => (
                <FontButton
                  key={font.label}
                  active={headingFont.label === font.label}
                  onClick={() => setHeadingFont(font)}
                >
                  {font.label}
                </FontButton>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-white/90 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-zinc-700">
              Body fonts
            </h2>
            <div className="flex flex-wrap gap-2">
              {bodyFonts.map((font) => (
                <FontButton
                  key={font.label}
                  active={bodyFont.label === font.label}
                  onClick={() => setBodyFont(font)}
                >
                  {font.label}
                </FontButton>
              ))}
            </div>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_18px_50px_rgba(9,9,11,0.04)]"
          style={previewStyle}
        >
          <div className="border-b border-zinc-100 bg-white px-5 py-4">
            <p className="text-sm font-semibold text-zinc-600">
              Heading: {headingFont.label} / Body: {bodyFont.label}
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-5 md:p-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Dashboard preview
              </p>
              <h2
                className="max-w-2xl text-4xl font-bold leading-tight tracking-normal text-zinc-950 md:text-5xl"
                style={{ fontFamily: "var(--preview-heading)" }}
              >
                Orders are moving cleanly across OATCLUB operations
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                Review fulfillment, refunds, stock alerts, influencer campaigns,
                and customer credits from one admin dashboard. This paragraph is
                here to test readability during long work sessions.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["Orders", "1,248", "+12.4%"],
                  ["Revenue", "₹8.7L", "+8.1%"],
                  ["Pending", "36", "-5.2%"],
                ].map(([label, value, change]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-zinc-100 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      {label}
                    </p>
                    <p
                      className="mt-2 text-3xl font-bold text-zinc-950"
                      style={{ fontFamily: "var(--preview-heading)" }}
                    >
                      {value}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#3f5c41]">{change}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50 p-5 lg:border-l lg:border-t-0 md:p-7">
              <h3
                className="text-2xl font-bold text-zinc-950"
                style={{ fontFamily: "var(--preview-heading)" }}
              >
                Recent orders
              </h3>
              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-100 bg-white">
                {[
                  ["OAT-1048", "Oversized Tee", "Processing"],
                  ["OAT-1049", "Cropped Hoodie", "Delivered"],
                  ["OAT-1050", "Cargo Joggers", "Refund"],
                  ["OAT-1051", "Graphic Shirt", "Packed"],
                ].map(([order, item, status]) => (
                  <div
                    key={order}
                    className="grid grid-cols-[0.9fr_1.2fr_0.8fr] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0"
                  >
                    <span className="text-sm font-bold text-zinc-950">{order}</span>
                    <span className="text-sm text-zinc-600">{item}</span>
                    <span className="rounded-full bg-zinc-50 px-3 py-1 text-center text-xs font-bold text-zinc-700">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
