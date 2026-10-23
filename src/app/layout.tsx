import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "FirstWords",
  description: "Emergency assessment for patients who can't communicate with the crew.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5d7a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
