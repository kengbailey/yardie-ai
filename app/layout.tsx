import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  title: "Yardie AI | Jamaican AI Solutions",
  description:
    "Intelligent AI solutions crafted for the Jamaican community. Empowering Caribbean innovation with cutting-edge technology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${firaCode.variable} font-sans bg-dark-900 text-gray-100 overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
