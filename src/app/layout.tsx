import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

// 若配置了 APP_URL，将其作为 metadataBase，使 OG / 规范链接等元数据正确解析
const appUrl = process.env.APP_URL;

export const metadata: Metadata = {
  title: "LiteLLM SearchLog",
  description: "Search and manage LiteLLM proxy spend logs",
  ...(appUrl && { metadataBase: new URL(appUrl) }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <NavBar appUrl={appUrl} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
