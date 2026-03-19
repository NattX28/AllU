import type { Metadata } from "next";
import { Kanit, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-kanit",
  fallback: ["Inter", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "AllU — ระบบบริหารจัดการการศึกษา",
  description:
    "King Mongkut's University of Technology North Bangkok Course Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${kanit.className} ${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
