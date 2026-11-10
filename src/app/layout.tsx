import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import StyledJsxRegistry from "./registry";

export const metadata: Metadata = {
  title: "ELYSIQ",
  description:
    "ELYSIQ — AI-powered crypto wallet recovery intelligence. Dormant will. Recovered. Powered by Anthropic Claude.",
  openGraph: {
    title: "ELYSIQ — The chain never forgets.",
    description:
      "Dormant will. Recovered. AI wallet forensics powered by Anthropic Claude.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StyledJsxRegistry>{children}</StyledJsxRegistry>
        <Script
          src="/widget/embed.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
