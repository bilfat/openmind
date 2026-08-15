import { SectionHeading } from "@/components/ui/section-heading";
import { Building, Award, Users, Zap } from "lucide-react";

export default function HipmiPage() {
  const activityPillars = [
    {
      icon: Award,
      title: "Kompetisi & Prestasi",
      description: "Mendorong anggota untuk berpartisipasi dan menjuarai berbagai kompetisi bisnis tingkat nasional dan internasional.",
    },
    {
      icon: Users,
      title: "Networking & Kolaborasi",
      description: "Menghubungkan mahasiswa dengan ekosistem startup, investor, dan praktisi industri melalui event eksklusif.",
    },
    {
      icon: Zap,
      title: "Inkubasi & Akselerasi",
      description: "Menyediakan program inkubasi untuk ide bisnis dari nol hingga validasi pasar dan siap untuk pendanaan.",
    },
    {
      icon: Building,
      title: "Kunjungan Industri",
      description: "Memberikan wawasan langsung ke dalam operasional perusahaan teknologi dan startup terkemuka di Indonesia.",
    },
  ];

  return (
    <div className="bg-white text-navy-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0 text-center">
          <SectionHeading
            badge="Organizer Profile"
            title="Mengenal HIPMI PT Telkom University"
            subtitle="Wadah resmi pencetak wirausaha muda tangguh di lingkungan Telkom University. Kami berkomitmen untuk membangun ekosistem bisnis yang inovatif, kolaboratif, dan berdaya saing tinggi."
          />
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4 lg:gap-8">
          {activityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="flex gap-x-4 rounded-2xl bg-white p-6 ring-1 ring-inset ring-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                <Icon className="h-7 w-7 flex-none text-gold-500 mt-1" aria-hidden="true" />
                <div className="text-base leading-7">
                  <h3 className="font-semibold text-navy-900">{pillar.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{pillar.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
