export interface TalentItem {
  id: string;
  name: string;
  role: "speaker" | "moderator" | "mc";
  roleLabel: string;
  position: string;
  business: string;
  bio: string;
  image: string;
  instagram?: string;
  linkedin?: string;
  order: number;
}

export const mockTalents: TalentItem[] = [
  {
    id: "speaker-1",
    name: "Arya Wicaksana, M.B.A.",
    role: "speaker",
    roleLabel: "Keynote Speaker",
    position: "Founder & Chief Executive Officer",
    business: "Nusantara Ventures Group",
    bio: "Praktisi bisnis serial entrepreneur dengan pengalaman lebih dari 12 tahun membangun ekosistem startup dan investasi di Asia Tenggara. Berhasil membawa 3 unit usaha meraih pendanaan Series A dan B.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    order: 1,
  },
  {
    id: "speaker-2",
    name: "Dr. Clarissa Aurelia",
    role: "speaker",
    roleLabel: "Keynote Speaker",
    position: "Managing Director & Angel Investor",
    business: "Impact Growth Capital",
    bio: "Pakar strategi pertumbuhan bisnis berkelanjutan dan inovasi digital. Sering menjadi narasumber forum ekonomi internasional dan telah membimbing lebih dari 100+ UMKM mahasiswa naik kelas.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    order: 2,
  },
  {
    id: "speaker-3",
    name: "Farhan Mahendra, S.T.",
    role: "speaker",
    roleLabel: "Guest Speaker",
    position: "Co-Founder & Chief Product Officer",
    business: "Aura Creative Technologies",
    bio: "Alumni Telkom University yang sukses mengembangkan platform SaaS kreatif dengan lebih dari 500.000 pengguna aktif di 14 negara. Aktif mengkampanyekan inovasi berbasis teknologi bagi generasi muda.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    order: 3,
  },
  {
    id: "moderator-1",
    name: "Nabila Saraswati, B.Com.",
    role: "moderator",
    roleLabel: "Moderator",
    position: "Head of Strategic Partnership",
    business: "HIPMI PT Telkom University",
    bio: "Moderator profesional dan penggerak komunitas kewirausahaan kampus. Berpengalaman memandu dialog bisnis tingkat regional bersama praktisi industri terkemuka.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    order: 4,
  },
  {
    id: "mc-1",
    name: "Dimas Raditya",
    role: "mc",
    roleLabel: "Master of Ceremony",
    position: "Professional Host & Broadcaster",
    business: "OPEN MIND 2026",
    bio: "Public speaker energik dan Master of Ceremony kawakan di berbagai event nasional, conference bisnis, dan entertainment.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    order: 5,
  },
  {
    id: "mc-2",
    name: "Valerie Anindya",
    role: "mc",
    roleLabel: "Master of Ceremony",
    position: "TV Presenter & Voice Over Artist",
    business: "OPEN MIND 2026",
    bio: "Presenter dinamis dengan pengalaman memandu festival dan gala dinner skala besar dengan gaya pembawaan elegan nan interaktif.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com",
    order: 6,
  },
];
