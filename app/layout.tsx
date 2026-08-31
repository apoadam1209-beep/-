import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Creativo — منصة المنتجات الرقمية',
  description: 'منصة للمنتجات الرقمية باشتراك شهري أو سنوي — قوالب، كورسات، إي-بوكس، موسيقى، صور ومكتبات جاهزة.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <I18nProvider>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
