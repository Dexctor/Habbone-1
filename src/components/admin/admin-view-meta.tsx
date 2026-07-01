import type { ReactNode } from "react";
import {
  FileText,
  LayoutGrid,
  Megaphone,
  Palette,
  Shield,
  ShoppingBag,
  Users,
} from "lucide-react";
import type { AdminView } from "./AdminContext";

export type AdminViewTone = "blue" | "green" | "yellow" | "red" | "violet";

export type AdminViewMeta = {
  id: AdminView;
  label: string;
  title: string;
  description: string;
  group: "Pilotage" | "Communauté" | "Business" | "Configuration";
  icon: ReactNode;
  tone: AdminViewTone;
  focus: string;
};

export const ADMIN_VIEW_META: Record<AdminView, AdminViewMeta> = {
  overview: {
    id: "overview",
    label: "Dashboard",
    title: "Centre de contrôle",
    description: "Vue opérationnelle de l'activité, des urgences et de la santé du site.",
    group: "Pilotage",
    icon: <LayoutGrid className="h-[18px] w-[18px]" />,
    tone: "blue",
    focus: "Vue synthèse",
  },
  content: {
    id: "content",
    label: "Contenus",
    title: "Publication & modération",
    description: "Pilote les articles, sujets, commentaires et stories depuis un seul espace.",
    group: "Communauté",
    icon: <FileText className="h-[18px] w-[18px]" />,
    tone: "green",
    focus: "Actualités, forum, stories",
  },
  users: {
    id: "users",
    label: "Utilisateurs",
    title: "Utilisateurs & sanctions",
    description: "Recherche les membres, ajuste les rôles, envoie des coins et applique les sanctions.",
    group: "Communauté",
    icon: <Users className="h-[18px] w-[18px]" />,
    tone: "blue",
    focus: "Rôles, coins, bannissements",
  },
  shop: {
    id: "shop",
    label: "Boutique",
    title: "Boutique & commandes",
    description: "Gère les articles, stocks, visuels et commandes à livrer.",
    group: "Business",
    icon: <ShoppingBag className="h-[18px] w-[18px]" />,
    tone: "yellow",
    focus: "Articles, stocks, commandes",
  },
  pub: {
    id: "pub",
    label: "Partenaires",
    title: "Partenaires & publicité",
    description: "Configure les partenaires affichés sur l'accueil et leurs liens.",
    group: "Business",
    icon: <Megaphone className="h-[18px] w-[18px]" />,
    tone: "violet",
    focus: "Vitrine accueil",
  },
  theme: {
    id: "theme",
    label: "Thème",
    title: "Apparence du site",
    description: "Contrôle le logo, le fond du header et les réglages visuels publics.",
    group: "Configuration",
    icon: <Palette className="h-[18px] w-[18px]" />,
    tone: "green",
    focus: "Header, logo, fond",
  },
  roles: {
    id: "roles",
    label: "Rôles",
    title: "Permissions & accès",
    description: "Structure les rôles, l'accès admin et les responsabilités internes.",
    group: "Configuration",
    icon: <Shield className="h-[18px] w-[18px]" />,
    tone: "red",
    focus: "Permissions critiques",
  },
};

export const ADMIN_VIEW_GROUPS: Array<AdminViewMeta["group"]> = [
  "Pilotage",
  "Communauté",
  "Business",
  "Configuration",
];

export function adminToneClasses(tone: AdminViewTone) {
  return {
    blue: {
      icon: "bg-[#42A5FF] text-white",
      soft: "bg-[#42A5FF]/14 text-[#CFEAFF] border-[#42A5FF]/35",
      glow: "shadow-[0_18px_45px_-24px_rgba(66,165,255,0.95)]",
    },
    green: {
      icon: "bg-[#0FD52F] text-[#061306]",
      soft: "bg-[#0FD52F]/12 text-[#B7FFBF] border-[#0FD52F]/30",
      glow: "shadow-[0_18px_45px_-24px_rgba(15,213,47,0.8)]",
    },
    yellow: {
      icon: "bg-[#FFC800] text-[#171000]",
      soft: "bg-[#FFC800]/14 text-[#FFE58A] border-[#FFC800]/35",
      glow: "shadow-[0_18px_45px_-24px_rgba(255,200,0,0.8)]",
    },
    red: {
      icon: "bg-[#FF4B6C] text-white",
      soft: "bg-[#FF4B6C]/14 text-[#FFC7D2] border-[#FF4B6C]/35",
      glow: "shadow-[0_18px_45px_-24px_rgba(255,75,108,0.8)]",
    },
    violet: {
      icon: "bg-[#9D7BFF] text-white",
      soft: "bg-[#9D7BFF]/14 text-[#DFD5FF] border-[#9D7BFF]/35",
      glow: "shadow-[0_18px_45px_-24px_rgba(157,123,255,0.8)]",
    },
  }[tone];
}
