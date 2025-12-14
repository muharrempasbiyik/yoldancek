import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "YOLDAN ÇEK",
  description: "Çekici ve firmalar için yalın, hızlı destek arayüzü.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={spaceGrotesk.variable}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function hideNIcon() {
                  // Tüm elementleri kontrol et
                  const allElements = document.querySelectorAll('*');
                  allElements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    const inlineStyle = el.getAttribute('style') || '';
                    
                    // Sol altta küçük elementleri gizle
                    if (
                      (style.position === 'fixed' || inlineStyle.includes('position:fixed') || inlineStyle.includes('position: fixed')) &&
                      (rect.left <= 10 && rect.bottom <= 10) &&
                      (rect.width < 60 && rect.height < 60)
                    ) {
                      el.style.setProperty('display', 'none', 'important');
                      el.style.setProperty('visibility', 'hidden', 'important');
                      el.style.setProperty('opacity', '0', 'important');
                      el.style.setProperty('pointer-events', 'none', 'important');
                      el.style.setProperty('width', '0', 'important');
                      el.style.setProperty('height', '0', 'important');
                      el.style.setProperty('overflow', 'hidden', 'important');
                    }
                  });
                  
                  // Next.js özel elementleri gizle
                  const nextElements = document.querySelectorAll(
                    '#__next-build-watcher, [data-nextjs-toast], [data-nextjs-dialog], [data-nextjs-router], [data-nextjs-scroll-focus-boundary]'
                  );
                  nextElements.forEach(el => {
                    el.style.setProperty('display', 'none', 'important');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    el.style.setProperty('opacity', '0', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                  });
                  
                  // Sol altta fixed position elementleri
                  const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
                  fixedElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const style = el.getAttribute('style') || '';
                    if (
                      (rect.left <= 10 && rect.bottom <= 10) &&
                      (rect.width < 60 && rect.height < 60) &&
                      (style.includes('left:') || style.includes('left :') || style.includes('bottom:') || style.includes('bottom :'))
                    ) {
                      el.style.setProperty('display', 'none', 'important');
                      el.style.setProperty('visibility', 'hidden', 'important');
                      el.style.setProperty('opacity', '0', 'important');
                      el.style.setProperty('pointer-events', 'none', 'important');
                    }
                  });
                }
                
                // Hemen çalıştır
                hideNIcon();
                
                // Periyodik olarak kontrol et
                setInterval(hideNIcon, 500);
                
                // Event listener'lar
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', hideNIcon);
                } else {
                  hideNIcon();
                }
                window.addEventListener('load', hideNIcon);
                
                // MutationObserver ile dinamik eklenen elementleri yakala
                const observer = new MutationObserver(hideNIcon);
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['style', 'class', 'id']
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
