import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartCharge - Intelligent EV Scheduling",
  description: "Optimize your EV charging with solar power and grid efficiency",
};

import { Toaster } from 'sonner';
import { LocationProvider } from "@/context/LocationContext";
import ClientSideExperience from "@/components/ui/client-side-experience";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen text-foreground relative`}
      >
        <LocationProvider>
          <ClientSideExperience />
          <div className="relative z-10">
            {children}
          </div>
          <Toaster richColors position="top-center" />
        </LocationProvider>
      </body>
    </html>
  );
}
