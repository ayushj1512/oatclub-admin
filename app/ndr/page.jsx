// app/ndr/page.jsx

import NdrDashboard from "@/components/ndr/NdrDashboard";

export const metadata = {
  title: "NDR Management | OATCLUB Admin",
  description:
    "Manage failed deliveries, customer responses and courier NDR actions.",
};

export default function NdrPage() {
  return <NdrDashboard />;
}
