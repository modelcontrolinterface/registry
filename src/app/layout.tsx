import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

import type { Metadata } from "next";
import { Cairo, Lora, JetBrains_Mono } from "next/font/google";

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ['latin'],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ['latin'],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "MCIR: The MCI service registry",
  description: `
  MCIR is a registry of services that extend the functionality of the model
  control interface (MCI)
  `,
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cairo.variable} ${lora.variable} ${jetbrains.variable}`}>
      <body className="antialiased dark">
        <Navbar/>
        {children}
        <Footer/>
      </body>
    </html>
  );
}
