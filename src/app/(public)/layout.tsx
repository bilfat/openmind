import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { MobileCtaBar } from "@/components/ui/mobile-cta-bar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 page-enter has-mobile-cta">{children}</main>
      <Footer />
      <MobileCtaBar />
    </>
  );
}
