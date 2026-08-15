"use client";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { eventData } from "@/data/event";
import { Lightbulb, Users, Sparkles, TrendingUp } from "lucide-react";
import { mockTalents, TalentItem } from "@/data/talents";
import { TalentCard } from "@/components/landing/talent-card";
import { TalentModal } from "@/components/landing/talent-modal";

export default function TentangPage() {
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);

  const valueIcons: Record<string, React.ElementType> = {
    Lightbulb,
    Users,
    Sparkles,
    TrendingUp,
  };

  const speakers = mockTalents.filter((t) => t.role === "speaker");
  const moderators = mockTalents.filter((t) => t.role === "moderator");
  const mcs = mockTalents.filter((t) => t.role === "mc");

  return (
    <>
      <div className="bg-white">
        {/* Tentang Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <SectionHeading
                badge="Tentang Acara"
                title={`Selamat Datang di ${eventData.name} ${eventData.year}`}
                subtitle={eventData.about}
              />
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                {eventData.values.map((value) => {
                  const Icon = valueIcons[value.icon] || Sparkles;
                  return (
                    <div key={value.title} className="relative pl-16">
                      <dt className="text-base font-semibold leading-7 text-gray-900">
                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500">
                          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
                        {value.title}
                      </dt>
                      <dd className="mt-2 text-base leading-7 text-gray-600">{value.description}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
          </div>
        </div>

        {/* Pembicara Section */}
        <section className="bg-secondary/30 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 text-center">
              <SectionHeading
                badge="Line-up"
                title="Bertemu Para Ahli di OPEN MIND 2026"
                subtitle="Kami menghadirkan para pemimpin industri, praktisi bisnis, dan entrepreneur inspiratif untuk berbagi wawasan dan pengalaman."
              />
            </div>

            {/* Speakers */}
            <div className="mt-20">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-center font-display">
                Keynote & Guest Speakers
              </h2>
              <div className="isolate mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {speakers.map((talent) => (
                  <TalentCard
                    key={talent.id}
                    talent={talent}
                    onSelect={() => setSelectedTalent(talent)}
                  />
                ))}
              </div>
            </div>

            {/* Moderators & MCs */}
            <div className="mt-20">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-center font-display">
                Moderator & MC
              </h2>
              <div className="isolate mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                {[...moderators, ...mcs].map((talent) => (
                  <TalentCard
                    key={talent.id}
                    talent={talent}
                    onSelect={() => setSelectedTalent(talent)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      {selectedTalent && (
        <TalentModal
          talent={selectedTalent}
          onClose={() => setSelectedTalent(null)}
        />
      )}
    </>
  );
}
