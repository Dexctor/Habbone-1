"use client";

import { useState } from "react";
import { Package, ShoppingBag } from "lucide-react";
import { AdminButton } from "@/components/admin/ui";
import { ShopItemsTab } from "./ShopItemsTab";
import { ShopOrdersTab } from "./ShopOrdersTab";

type ShopTab = "items" | "orders";

export function AdminShopFeature() {
  const [tab, setTab] = useState<ShopTab>("items");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 rounded-[6px] bg-[#141433]/50 p-1">
        <AdminButton
          tone={tab === "items" ? "primary" : "ghost"}
          size="sm"
          icon={<Package className="h-4 w-4" />}
          onClick={() => setTab("items")}
        >
          Articles
        </AdminButton>
        <AdminButton
          tone={tab === "orders" ? "primary" : "ghost"}
          size="sm"
          icon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => setTab("orders")}
        >
          Commandes
        </AdminButton>
      </div>

      {tab === "items" && <ShopItemsTab />}
      {tab === "orders" && <ShopOrdersTab />}
    </div>
  );
}
