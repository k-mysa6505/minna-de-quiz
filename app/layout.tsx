import type { Metadata } from "next";
import { Geist, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { MotionProvider } from "./MotionProvider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-noto-sans-jp",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "みんクイ - みんなでクイズ",
  description: "みんなで作ってみんなで遊ぶクイズゲーム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "みんクイ",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${notoSansJp.variable} ${jetbrainsMono.variable} antialiased selection:bg-white/10`}>
        <AuthProvider>
          <MotionProvider>
            {children}
          </MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

