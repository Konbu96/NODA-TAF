import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AppSetup } from "@/components/AppSetup";
import { EnterToSave } from "@/components/EnterToSave";
import { PageSlide } from "@/components/PageSlide";
import { PageTransition } from "@/components/PageTransition";

const noto = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "野田陸上部",
  description: "野田学園 陸上競技部のアプリ",
  appleWebApp: { title: "野田陸上部", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${noto.variable} font-sans antialiased`}>
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-page">
          <PageSlide>{children}</PageSlide>
        </div>
        <EnterToSave />
        <AppSetup />
        <PageTransition />
      </body>
    </html>
  );
}
