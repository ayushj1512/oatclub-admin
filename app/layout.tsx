import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "../components/common/LayoutWrapper";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Miray Fashions Admin",
  description: "Miray Fashions Admin Dashboard",
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
    <html lang="en" className={poppins.className} suppressHydrationWarning>
      <body className="antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>
        <Toaster position="top-right" />
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
