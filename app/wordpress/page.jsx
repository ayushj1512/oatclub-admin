import { redirect } from "next/navigation";

export default function WordpressRootPage() {
  // 🔁 Redirect base /wordpress to orders list
  redirect("/wordpress/orders");
}
