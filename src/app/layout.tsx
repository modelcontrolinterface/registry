import type { Metadata } from "next";

import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Space_Mono } from "next/font/google";


const space = Space_Mono({
  weight: "400",
  subsets: ['latin'],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  icons: ["/logo.svg"],
  title: "MCIR: The MCI service registry",
  description: `
  MCIR is a registry of services that extend the functionality of the model
  control interface (MCI)
  `,

};

const RootLayout = async ({ children }: { children: React.ReactNode; }) => {
  return (
    <html lang="en" className={`${space.variable}`}>
      <body className="antialiased dark">
        <Navbar/>
        {children}
        <Footer/>
      </body>
    </html>
  );
}

export default RootLayout
