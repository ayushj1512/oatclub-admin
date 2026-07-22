import UnconfirmedOrderWhatsAppPage from "@/components/orders/UnconfirmedOrderWhatsAppPage";

export default function Page() {
  return (
    <UnconfirmedOrderWhatsAppPage
      title="Unconfirmed Orders"
      badge="OATCLUB Order Desk"
      description="Review pending orders and open a personalised WhatsApp confirmation message in one click."
      orderDetailsBasePath="/orders"
    />
  );
}