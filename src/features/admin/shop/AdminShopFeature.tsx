"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Package, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopItemsTab } from "./ShopItemsTab";
import { ShopOrdersTab } from "./ShopOrdersTab";

type ShopTab = "items" | "orders";

export function AdminShopFeature() {
  const [tab, setTab] = useState<ShopTab>("items");

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-[10px] border border-white/10 bg-admin-bg-800/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-2">
        <ShopTabButton
          active={tab === "items"}
          icon={<Package className="h-4 w-4" />}
          title="Articles"
          description="Prix, stock, images"
          onClick={() => setTab("items")}
        />
        <ShopTabButton
          active={tab === "orders"}
          icon={<ShoppingBag className="h-4 w-4" />}
          title="Commandes"
          description="Livraisons et statuts"
          onClick={() => setTab("orders")}
        />
      </div>

      {tab === "items" && <ShopItemsTab />}
      {tab === "orders" && <ShopOrdersTab />}
    </div>
  );
}

function ShopTabButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[62px] items-center gap-3 rounded-[8px] border px-4 text-left transition-colors",
        active
          ? "border-[#42A5FF]/55 bg-[#42A5FF]/18 text-white shadow-[0_12px_28px_-20px_rgba(66,165,255,0.95)]"
          : "border-transparent bg-white/[0.035] text-admin-text-secondary hover:border-white/10 hover:bg-white/[0.07] hover:text-white",
      )}
      aria-pressed={active}
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[8px]", active ? "bg-[#42A5FF] text-white" : "bg-admin-bg-600 text-admin-text-tertiary")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-black uppercase tracking-[0.04em]">{title}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-admin-text-tertiary">{description}</span>
      </span>
    </button>
  );
}
