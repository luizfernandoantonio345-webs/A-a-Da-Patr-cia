import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Açaí da Patrícia",
  description: "Peça pelo seu celular. Comanda digital.",
};
export const viewport: Viewport = {
  themeColor: "#2A0E3F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: "#FCF8F2" }}>{children}</body>
    </html>
  );
}
