import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { MotionProvider } from "./MotionProvider";

const siteUrl = "https://minna-de-quiz.vercel.app";

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
  metadataBase: new URL(siteUrl),
  title: "みんクイ - みんなでクイズ",
  description: "みんなで作ってみんなで遊ぶクイズゲーム",
  openGraph: {
    title: "みんクイ - みんなでクイズ",
    description: "みんなで作ってみんなで遊ぶクイズゲーム",
    url: siteUrl,
    siteName: "みんクイ - みんなでクイズ",
    images: [
      {
        url: "/ogp.png",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "みんクイ - みんなでクイズ",
    description: "みんなで作ってみんなで遊ぶクイズゲーム",
    images: ["/ogp.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1A2238",
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

