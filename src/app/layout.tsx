import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
});
const jet = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jet",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MAMSS Prep — Mater Misericordiae Secondary School | WAEC, JAMB & CBT Practice",
  description:
    "Mater Misericordiae Secondary School's SS1–SS3 exam preparation platform: curriculum-true quizzes by term, a live CBT hall modelled on JAMB, and worked answers for WAEC, NECO and UTME.",
  icons: {
    icon: "/media/mamss-logo.png",
    apple: "/media/mamss-logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${space.variable} ${jet.variable}`}>
      <body className="bg-ink font-sans text-paper antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
