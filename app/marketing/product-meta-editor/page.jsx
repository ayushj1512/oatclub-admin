import ProductMetaManager from "@/components/product/ProductMetaManager";

export const metadata = {
  title: "Product Meta Editor | Marketing",
  description:
    "Manage product SEO titles, descriptions and keywords.",
};

export default function MarketingProductMetaEditorPage() {
  return (
    <ProductMetaManager
      title="Product Meta Editor"
      description="Search, filter and bulk edit product SEO metadata from the marketing workspace."
    />
  );
}