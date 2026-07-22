import ProductMetaManager from "@/components/product/ProductMetaManager";

export const metadata = {
  title: "Product Meta Editor | Products",
  description:
    "Manage product SEO titles, descriptions and keywords.",
};

export default function ProductsMetaEditorPage() {
  return (
    <ProductMetaManager
      title="Product Meta Editor"
      description="Search, filter and bulk edit product SEO metadata from the products workspace."
    />
  );
}   