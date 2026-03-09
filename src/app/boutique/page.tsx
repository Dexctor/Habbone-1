import Link from "next/link";

export const revalidate = 900;

type ShopItem = {
  id: number;
  name: string;
  price: number;
  category: "Pack" | "Badge" | "VIP" | "Bonus";
  image: string;
  stock: number;
  disabled?: boolean;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: 1, name: "Pack Starter", price: 350, category: "Pack", image: "/img/box.png", stock: 18 },
  { id: 2, name: "Badge Elite", price: 150, category: "Badge", image: "/img/badges.png", stock: 42 },
  { id: 3, name: "Pass VIP 30 jours", price: 1200, category: "VIP", image: "/img/star.png", stock: 7 },
  { id: 4, name: "Bundle Event", price: 690, category: "Pack", image: "/img/public.png", stock: 14 },
  { id: 5, name: "Photo de profil rare", price: 280, category: "Bonus", image: "/img/photo.png", stock: 5 },
  { id: 6, name: "Pack Createur", price: 990, category: "Pack", image: "/img/settings.gif", stock: 0, disabled: true },
];

function categoryTone(category: ShopItem["category"]) {
  switch (category) {
    case "Pack":
      return "bg-[#2596FF]/20 text-[#7CC4FF] border-[#2596FF]/50";
    case "Badge":
      return "bg-[#0FD52F]/20 text-[#A8F5B6] border-[#0FD52F]/50";
    case "VIP":
      return "bg-[#FFC800]/20 text-[#FFE58A] border-[#FFC800]/50";
    case "Bonus":
      return "bg-[#F92330]/20 text-[#FF9AA1] border-[#F92330]/50";
    default:
      return "bg-white/10 text-white border-white/20";
  }
}

export default function BoutiquePage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-10 sm:px-6">
      <header className="rounded-[8px] border border-[#1F1F3E] bg-[#272746] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/store.png" alt="Boutique" className="h-[56px] w-auto image-pixelated" />
          <div className="space-y-1">
            <h1 className="text-[20px] font-bold uppercase tracking-[0.08em] text-[#DDD]">Boutique HabbOne</h1>
            <p className="text-[14px] text-[#BEBECE]">Achete des packs, badges et bonus pour ton compte.</p>
          </div>
        </div>
      </header>

      <section className="rounded-[8px] border border-[#1F1F3E] bg-[#2C2C4F] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-3 py-2 text-[12px] font-bold uppercase text-[#DDD]">
            Catalogue
          </span>
          <span className="rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-3 py-2 text-[12px] text-[#BEBECE]">
            {SHOP_ITEMS.length} produits
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_ITEMS.map((item) => {
            const soldOut = item.stock <= 0 || Boolean(item.disabled);
            return (
              <article
                key={item.id}
                className={`rounded-[8px] border p-3 ${
                  soldOut ? "border-[#34345A] bg-[#1F1F3E]/60 opacity-80" : "border-[#1F1F3E] bg-[#1F1F3E]"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className={`rounded-[4px] border px-2 py-1 text-[11px] font-bold uppercase ${categoryTone(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-[11px] font-bold uppercase text-[#BEBECE]">
                    {soldOut ? "Indisponible" : `Stock ${item.stock}`}
                  </span>
                </div>

                <div className="mb-3 flex min-h-[90px] items-center gap-3 rounded-[6px] bg-[#303060] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} className="h-14 w-14 object-contain image-pixelated" loading="lazy" />
                  <h2 className="text-[16px] font-bold uppercase leading-tight text-[#DDD]">{item.name}</h2>
                </div>

                <div className="mb-3 rounded-[4px] border border-white/15 bg-[#141433] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[14px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/icon-coin.png" alt="" className="h-4 w-4" />
                    <strong className="text-[#DDD]">{item.price}</strong>
                    <span className="text-[#BEBECE]">moedas</span>
                  </span>
                </div>

                <button
                  type="button"
                  disabled={soldOut}
                  className={`w-full rounded-[4px] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.05em] transition ${
                    soldOut
                      ? "cursor-not-allowed border border-[#34345A] bg-transparent text-[#BEBECE]/60"
                      : "bg-[#2596FF] text-white hover:bg-[#2976E8]"
                  }`}
                >
                  {soldOut ? "Rupture" : "Acheter"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#1F1F3E] bg-[#141433] px-4 py-3 text-[12px] text-[#BEBECE]">
        <span>Besoin d'un article specifique ? Propose-le a l'equipe.</span>
        <div className="flex items-center gap-2">
          <Link href="/forum" className="rounded-[4px] bg-white/10 px-3 py-2 font-bold uppercase text-[#DDD] hover:bg-white/15">
            Forum
          </Link>
          <Link href="/partenaires" className="rounded-[4px] bg-white/10 px-3 py-2 font-bold uppercase text-[#DDD] hover:bg-white/15">
            Partenaires
          </Link>
        </div>
      </footer>
    </main>
  );
}
