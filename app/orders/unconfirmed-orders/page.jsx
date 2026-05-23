// app/orders/unconfirmed-orders/page.jsx

"use client";

import ConfirmedOrdersPage from "../confirmed-orders/page";

export default function UnconfirmedOrdersPage() {
  return <ConfirmedOrdersPage mode="unconfirmed" />;
}