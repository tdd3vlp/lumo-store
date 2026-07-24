"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

// Clears the client cart once an order has reached a paid state. Rendered only
// on the success branch of the checkout status page.
export default function ClearCartOnSuccess() {
  const clearCart = useStore((state) => state.clearCart);
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
