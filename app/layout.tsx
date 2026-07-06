import type { Metadata } from "next";
import { Unbounded, Wix_Madefor_Text } from "next/font/google";
import { RegionRatesProvider } from "@/lib/pricing/context";
import { getRegionRate } from "@/lib/pricing/rates";
import { getRegionalPricingRates } from "@/lib/pricing/rates.server";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const wixMadefor = Wix_Madefor_Text({
  subsets: ["latin", "cyrillic"],
  weight: "variable",
  variable: "--font-wix-madefor",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumo - игры на PlayStation",
  description: "Игры под твой бюджет",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rates = await getRegionalPricingRates().catch(() => []);
  const tryRate = getRegionRate("TR", rates);

  return (
    <html lang="ru" className={`${unbounded.variable} ${wixMadefor.variable}`}>
      <body>
        <RegionRatesProvider rates={{ TR: tryRate }}>
          {children}
        </RegionRatesProvider>
      </body>
    </html>
  );
}
