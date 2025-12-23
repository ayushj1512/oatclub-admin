import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "../components/common/LayoutWrapper";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast"; // ✅ ADD THIS

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Miray Fashion Admin",
  description: "Miray Fashion Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={poppins.className}>
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* ✅ TOASTER */}
        <Toaster position="top-right" />

        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
