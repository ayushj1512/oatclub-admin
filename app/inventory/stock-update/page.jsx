// app/inventory/stock-update/page.jsx
"use client";

import StockUpdate from "@/components/common/StockUpdate";

export default function InventoryStockUpdatePage() {
  return (
    <StockUpdate
      title="Inventory / Stock Update"
      hideFootwear={true}
      footwearKeys={["footwear", "shoes", "sneakers", "slippers", "sandals"]}
    />
  );
}
