import type { Metadata } from "next";
import "./globals.css";
import { ConsoleShell } from "@/components/console/ConsoleShell";

export const metadata: Metadata = {
  title: "ClawLab - OpenClaw Agent Management",
  description: "Industrial control console for managing OpenClaw agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">
        <ConsoleShell>{children}</ConsoleShell>
      </body>
    </html>
  );
}
