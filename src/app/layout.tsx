import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import MainContent from "@/components/MainContent";
import AuthProvider from "@/components/AuthProvider";
import FeedbackButton from "@/components/FeedbackButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crew",
  description: "People and HR operations",
};

// Runs before paint to avoid FOUC: applies stored theme or falls back to OS preference.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>
        <div className="min-h-screen bg-[var(--background)]">
          {/* Top header */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--background)] border-b-2 border-[var(--border)]">
            <div className="flex h-12 items-center justify-between px-5">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/spade-logo-filled.svg"
                  alt="Crew Logo"
                  width={28}
                  height={24}
                  className="h-6 w-auto"
                />
                <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                  Crew
                </h1>
              </Link>
              <div className="flex items-center gap-5">
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </header>

          {/* Main content */}
          <MainContent>{children}</MainContent>

          <FeedbackButton />
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
