import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "../components/common/LayoutWrapper";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oatclub.in"),

  title: {
    default: "OATCLUB | Own All Trends",
    template: "%s | OATCLUB",
  },

  description:
    "Shop premium fashion, co-ord sets, dresses, tops and trend-led styles at OATCLUB.",

  keywords: [
    "OATCLUB",
    "Women's Fashion",
    "Co-ord Sets",
    "Dresses",
    "Tops",
    "Bottoms",
    "Fashion",
    "Luxury Fashion",
    "Own All Trends",
  ],

  openGraph: {
    title: "OATCLUB | Own All Trends",
    description:
      "Shop premium fashion, co-ord sets, dresses, tops and trend-led styles at OATCLUB.",
    url: "https://oatclub.in",
    siteName: "OATCLUB",
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "OATCLUB | Own All Trends",
    description:
      "Shop premium fashion, co-ord sets, dresses, tops and trend-led styles at OATCLUB.",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={poppins.variable}
      suppressHydrationWarning
    >
      <body
        className="bg-oat-bg text-oat-text antialiased"
        suppressHydrationWarning
      >
        <Toaster position="top-right" />
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}