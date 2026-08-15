"use client";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { mockFAQs, FAQItem } from "@/data/faq";
import { Search, ChevronDown } from "lucide-react";

export function FaqSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openAccordion, setOpenAccordion] = useState<string | null>(mockFAQs[0]?.id || null);

  const categories = ["all", "general", "ticketing", "payment", "event-day"];

  const filteredFAQs = mockFAQs.filter(
    (faq) =>
      (activeCategory === "all" || faq.category === activeCategory) &&
      (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <section className="bg-secondary/30 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center">
          <SectionHeading
            badge="Tanya Jawab"
            title="Pertanyaan Umum (FAQ)"
            subtitle="Temukan jawaban untuk semua pertanyaan Anda tentang OPEN MIND 2026. Jika tidak menemukan jawaban, hubungi kami."
          />
        </div>

        <div className="mt-12 space-y-6">
          {/* Search and Filter */}
          <div className="sticky top-24 z-10 bg-secondary/50 backdrop-blur-sm p-4 rounded-2xl border border-border">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pertanyaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-border bg-white py-3 pl-12 pr-4 text-navy-900 focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                    activeCategory === cat
                      ? "bg-gold-500 text-navy-950"
                      : "bg-white text-navy-900 hover:bg-gray-100"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion */}
          <div className="space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq) => (
                <div key={faq.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <button
                    onClick={() => toggleAccordion(faq.id)}
                    className="flex w-full items-center justify-between p-6 text-left"
                  >
                    <span className="font-display text-lg font-bold text-navy-900">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gold-500 transition-transform duration-300 ${
                        openAccordion === faq.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${
                      openAccordion === faq.id
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-sm leading-relaxed text-navy-900/70">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-navy-900/70">Tidak ada pertanyaan yang cocok dengan pencarian Anda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
