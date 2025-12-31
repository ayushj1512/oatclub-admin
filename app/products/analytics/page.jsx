import ProductAnalyticsDashboard from "@/components/product/ProductAnalyticsDashboard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Product Analytics | Admin",
};

export default function ProductAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Products Analytics</h1>
            <p className="text-sm text-gray-500">
              Track views, purchases, cart adds, wishlist and category performance
            </p>
          </div>
        </div>
      </div>

      {/* DASHBOARD */}
      <ProductAnalyticsDashboard />
    </div>
  );
}
