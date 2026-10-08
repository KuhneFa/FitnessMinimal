import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Fitmin",
  description: "Dein Training. Dein Essen. Dein Tagebuch.",
  icons: { icon: "/icon-192.png", apple: "/icon-180.png" },
  appleWebApp: {
    capable: true,
    title: "Fitmin",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#193e35",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
