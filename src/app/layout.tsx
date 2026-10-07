import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { preconnect } from "react-dom";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Propiedades en alquiler y venta",
  description: "Propiedades en alquiler y venta con tour virtual 360° y planos.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Fotos, panorámicas y planos vienen de Storage (otro dominio): abrir la conexión ya acorta el LCP.
  if (isSupabaseConfigured()) preconnect(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  return (
    <html lang="es-AR" className={`${inter.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
