import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardCrew — FaB Card Search",
  description: "Search Flesh and Blood TCG cards on Girafull and export to CSV",
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
