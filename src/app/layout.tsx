import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { AppNav } from "@/components/layout/AppNav";
import "./globals.css";

/** Stick with fonts already used in this project to avoid Google Font fetch 500s. */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UnoX",
  description: "Host your own UNO lobbies — deposit to play",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/brand/unox-icon.png" }],
  },
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
