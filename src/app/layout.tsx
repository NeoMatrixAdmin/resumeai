import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next"; // <-- 1. Import Analytics

export const metadata: Metadata = {
  title: 'ResumeAI — AI Resume Optimizer',
  description: 'Optimize your resume for any job description in seconds',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
          {children}
          <Analytics /> {/* <-- 2. Add the component right before closing body tag */}
        </body>
      </html>
    </ClerkProvider>
  );
}