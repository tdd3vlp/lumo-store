import type { Metadata } from "next";
import { Unbounded, Wix_Madefor_Text } from "next/font/google";
import FloatingBudgetStatus from "@/components/FloatingBudgetStatus";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${wixMadefor.variable}`}>
      <body>
        {children}
        <FloatingBudgetStatus />
      </body>
    </html>
  );
}
