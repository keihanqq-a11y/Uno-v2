import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { AppNav } from "@/components/layout/AppNav";
import "./globals.css";

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UnoX",
  description: "Host your own UNO lobbies — deposit to play",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} atmosphere antialiased`}>
        <AuthProvider>
          <AppNav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
