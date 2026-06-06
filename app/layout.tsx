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
  applicationName: "OATCLUB Admin Panel",

  title: {
    default: "OATCLUB Admin Panel",
    template: "%s | OATCLUB Admin Panel",
  },

  description:
    "OATCLUB admin panel for managing orders, products, inventory, RMA, refunds, reports, and operations.",

  keywords: [
    "OATCLUB",
    "OATCLUB Admin Panel",
    "Admin Panel",
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
    title: "OATCLUB Admin Panel",
    description:
      "OATCLUB admin panel for managing orders, products, inventory, RMA, refunds, reports, and operations.",
    url: "https://oatclub.in",
    siteName: "OATCLUB Admin Panel",
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "OATCLUB Admin Panel",
    description:
      "OATCLUB admin panel for managing orders, products, inventory, RMA, refunds, reports, and operations.",
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
