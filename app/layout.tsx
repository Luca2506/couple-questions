import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "Couple Questions",
  description: "Frage des Tages für uns zwei.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
