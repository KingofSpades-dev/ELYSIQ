import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ELYSIQ Outpost — The chain never forgets.',
  description: 'Dormant will. Recovered. AI wallet forensics powered by Anthropic Claude.',
  openGraph: {
    title: 'ELYSIQ Outpost — The chain never forgets.',
    description: 'Dormant will. Recovered. AI wallet forensics powered by Anthropic Claude.',
    url: 'https://www.elysiq.xyz/gamefi/outpost',
    siteName: 'ELYSIQ Outpost',
    images: [
      {
        url: 'https://www.elysiq.xyz/images/logo-outpost.jpeg',
        width: 1200,
        height: 630,
        alt: 'ELYSIQ Outpost Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ELYSIQ Outpost — The chain never forgets.',
    description: 'Dormant will. Recovered. AI wallet forensics powered by Anthropic Claude.',
    images: ['https://www.elysiq.xyz/images/logo-outpost.jpeg'],
  },
};

export default function OutpostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
