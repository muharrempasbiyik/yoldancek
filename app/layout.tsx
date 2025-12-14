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
                  const allElements = document.querySelectorAll('*');
                  allElements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    if (
                      style.position === 'fixed' &&
                      rect.left === 0 &&
                      rect.bottom === 0 &&
                      (rect.width < 50 && rect.height < 50)
                    ) {
                      el.style.display = 'none';
                      el.style.visibility = 'hidden';
                      el.style.opacity = '0';
                      el.style.pointerEvents = 'none';
                    }
                  });
                }
                hideNIcon();
                setInterval(hideNIcon, 1000);
                document.addEventListener('DOMContentLoaded', hideNIcon);
                window.addEventListener('load', hideNIcon);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
