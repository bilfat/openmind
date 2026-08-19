import { eventData } from "@/data/event";
import { FaqSection } from "./faq-section";
import { ContactSection } from "./contact-section";
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
      <ContactSection
        venue={venue}
        waHref={waHref}
        waDisplay={waDisplay}
        openMindIg={openMindIg}
        openMindTiktok={openMindTiktok}
        hipmiIg={hipmiIg}
      />
    </div>
  );
}
