import UnconfirmedOrderWhatsAppPage from "@/components/orders/UnconfirmedOrderWhatsAppPage";

export default function Page() {
  return (
    <UnconfirmedOrderWhatsAppPage
      title="Order Confirmation Support"
      badge="Customer Support Desk"
      description="Contact customers whose orders are still awaiting confirmation and help move them into processing."
      orderDetailsBasePath="/orders"
    />
  );
}