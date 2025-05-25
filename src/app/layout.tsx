import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const lato = Lato({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "1sh",
  description: "The URL shortener.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lato.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
