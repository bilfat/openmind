import { SectionHeading } from "@/components/ui/section-heading";
import { eventData } from "@/data/event";
import { MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { FaqSection } from "./faq-section";
import { fetchActiveEventServer } from "@/lib/event-server";
import { eventDisplayName, formatWhatsAppDisplay, waLink } from "@/lib/event-utils";

export async function generateMetadata() {
  const { event } = await fetchActiveEventServer();
  const name = eventDisplayName(event);
  return {
    title: `Hubungi Kami — ${name}`,
    description: `FAQ, pertanyaan umum, dan kontak untuk ${name}.`,
  };
}

const IgIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.27 8.27 0 004.84 1.55V7a4.85 4.85 0 01-1.07-.31z" />
  </svg>
);

export default async function HubungiPage() {
  const { event } = await fetchActiveEventServer();

  const venue = event?.venue || eventData.venue;
  const waNumber = event?.contact_whatsapp || "6281234567890";
  const waDisplay = event?.contact_whatsapp_display || formatWhatsAppDisplay(waNumber) || "+62 812-3456-7890";
  const waHref = waLink(waNumber) || "https://wa.me/6281234567890";
  const openMindIg = event?.instagram_url || "https://www.instagram.com/openmindhipmi_2026?igsh=MW5neXFsZ3R5bDFldA==";
  const openMindTiktok = event?.tiktok_url || "https://www.tiktok.com/@openmindhipmi2026?_r=1&_t=ZS-98sbK53gQKL";
  const hipmiIg = event?.hipmi_instagram_url || "https://www.instagram.com/hipmiunivtelkom?igsh=MWNqOGNobW81eHRqcw==";

  return (
    <div className="bg-white">
      {/* FAQ Section */}
      <FaqSection />

      {/* Divider */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
        </div>
      </div>

      {/* Contact Section */}
      <section className="bg-secondary/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionHeading
              badge="Get in Touch"
              title="Hubungi Kami"
              subtitle="Punya pertanyaan atau butuh informasi lebih lanjut? Jangan ragu untuk menghubungi kami melalui kanal di bawah ini."
            />
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 md:max-w-none md:grid-cols-2">
            {/* OPEN MIND Sosmed */}
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gray-200">
              <h3 className="text-2xl font-bold font-display text-navy-900">Follow OPEN MIND</h3>
              <p className="mt-2 text-sm text-gray-600">Dapatkan update terbaru seputar acara.</p>
              <div className="mt-6 flex gap-5">
                <Link href={openMindIg} target="_blank" className="text-navy-800 hover:text-gold-500 transition-colors" title="Instagram OPEN MIND">
                  <IgIcon />
                </Link>
                <Link href={openMindTiktok} target="_blank" className="text-navy-800 hover:text-gold-500 transition-colors" title="TikTok OPEN MIND">
                  <TikTokIcon />
                </Link>
              </div>
            </div>

            {/* HIPMI Sosmed */}
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gray-200">
              <h3 className="text-2xl font-bold font-display text-navy-900">Jejaring HIPMI Tel-U</h3>
              <p className="mt-2 text-sm text-gray-600">Kenali lebih dekat organisasi kami.</p>
              <div className="mt-6 flex gap-5">
                <Link href={hipmiIg} target="_blank" className="text-navy-800 hover:text-gold-500 transition-colors" title="Instagram HIPMI Tel-U">
                  <IgIcon />
                </Link>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gray-200 flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gold-500/10 text-gold-600 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Contact Person (WhatsApp)</h3>
                <p className="mt-1 text-gray-600">Untuk pertanyaan seputar tiket &amp; acara.</p>
                <Link href={waHref} target="_blank" className="mt-2 inline-block font-semibold text-gold-600 hover:text-gold-700">
                  {waDisplay}
                </Link>
              </div>
            </div>

            {/* Venue */}
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gray-200 flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gold-500/10 text-gold-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">Venue Acara</h3>
                <p className="mt-1 text-gray-600">{venue}, Bandung, Indonesia</p>
                <Link href="https://maps.app.goo.gl/telkom-university" target="_blank" className="mt-2 inline-block font-semibold text-gold-600 hover:text-gold-700">
                  Lihat di Google Maps
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
