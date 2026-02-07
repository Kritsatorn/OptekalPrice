import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptekalPrice — FaB Card Price Compare",
  description: "Compare Flesh and Blood card prices across Girafull, ActionPoint, StarCityGames & TCGPlayer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
