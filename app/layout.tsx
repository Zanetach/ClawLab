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
      <body className="h-full antialiased">
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            <filter id="gooey-filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                result="gooey"
              />
              <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
            </filter>
          </defs>
        </svg>
        <ConsoleShell>{children}</ConsoleShell>
      </body>
    </html>
  );
}
