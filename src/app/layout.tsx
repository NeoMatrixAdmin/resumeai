import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Script from 'next/script';

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
        </body>
      </html>
    </ClerkProvider>
  );
}