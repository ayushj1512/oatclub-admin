import UnconfirmedOrderWhatsAppPage from "@/components/orders/UnconfirmedOrderWhatsAppPage";

export default function Page() {
  return (
    <UnconfirmedOrderWhatsAppPage
      title="WhatsApp Order Desk"
      badge="OATCLUB Order Desk"
      description="Manage order confirmations, shipping updates and delayed order communication from one place."
      orderDetailsBasePath="/orders"
    />
  );
}
