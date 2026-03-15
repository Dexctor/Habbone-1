import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import '@/styles/header.css';
import Providers from '@/components/Providers';
import AppShell from '@/components/layout/app-shell';
import Footer from '@/components/layout/footer';
import HeaderTW from '@/components/layout/header-tw';
import { readThemeSettings } from '@/server/theme-settings-store';
import SonnerClient from '@/components/ui/sonner-client';
import MotionProvider from '@/components/motion/motion-provider';
import LayoutClient from './layout-client';

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.habbone.fr"),
  title: {
    default: "Habbone",
    template: "%s | Habbone",
  },
  description:
    "Habbone, fansite francophone dédié à Habbo : actualités, forum, guides, concours et communauté active pour les joueurs passionnés.",
  keywords: [
    "Habbone",
    "Habbo",
    "fansite",
    "forum habbo",
    "guides habbo",
    "actualités habbo",
    "communauté habbo",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Habbone",
    description:
      "Retrouve toutes les actualités, concours et guides Habbo sur Habbone, le fansite francophone incontournable.",
    url: "https://www.habbone.fr",
    siteName: "Habbone",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Habbone",
    description:
      "Actualités, concours et guides Habbo : rejoins la communauté Habbone.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialTheme = await readThemeSettings().catch(() => undefined);

  return (
    <html lang="fr" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className={montserrat.variable}>
        <Providers>
          <MotionProvider>
            <LayoutClient>
              <AppShell topbar={<HeaderTW initialTheme={initialTheme} />} footer={<Footer />}>{children}</AppShell>
            </LayoutClient>
          </MotionProvider>
          <SonnerClient />
        </Providers>
      </body>
    </html>
  );
}
