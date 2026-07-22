import DispatchReadyManager from "@/components/product/DispatchReadyManager";

export const metadata = {
  title: "Dispatch Ready Products | OATCLUB",
  description:
    "Manage products available for dispatch within 24–48 hours.",
};

export default function DispatchReadyProductsPage() {
  return <DispatchReadyManager />;
}