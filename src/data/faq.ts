export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "ticketing" | "payment" | "event-day";
}

export const mockFAQs: FAQItem[] = [
  {
    id: "faq-1",
    question: "Apa itu OPEN MIND 2026?",
    answer: "OPEN MIND 2026 adalah seminar dan networking eksklusif persembahan HIPMI PT Telkom University yang bertujuan untuk mengakselerasi potensi kewirausahaan generasi muda melalui wawasan dari praktisi bisnis sukses.",
    category: "general",
  },
  {
    id: "faq-2",
    question: "Kapan dan di mana acara akan diselenggarakan?",
    answer: "Acara akan diselenggarakan pada tanggal 18 September 2026, dari pukul 09:00 - 17:00 WIB, bertempat di Telkom University.",
    category: "general",
  },
  {
    id: "faq-3",
    question: "Apa saja jenis tiket yang tersedia?",
    answer: "Kami menyediakan beberapa jenis tiket: FREE PASS (kuota terbatas), EARLY BIRD (harga spesial), dan NORMAL PASS. Setiap tiket memiliki benefit yang berbeda.",
    category: "ticketing",
  },
  {
    id: "faq-4",
    question: "Bagaimana cara saya mendapatkan tiket?",
    answer: "Anda bisa mendapatkan tiket dengan mengklik tombol 'Amankan Tiket Sekarang' di halaman utama atau mengunjungi halaman 'Tiket', lalu ikuti alur pendaftaran hingga selesai.",
    category: "ticketing",
  },
  {
    id: "faq-5",
    question: "Metode pembayaran apa saja yang diterima?",
    answer: "Untuk tiket berbayar, kami menerima pembayaran melalui transfer manual ke rekening Bank BRI yang tertera pada halaman pembayaran. Pastikan untuk mengunggah bukti transfer setelahnya.",
    category: "payment",
  },
  {
    id: "faq-6",
    question: "Kapan saya akan menerima E-Ticket setelah pembayaran?",
    answer: "Verifikasi pembayaran dilakukan maksimal 1x24 jam. Setelah disetujui, Anda dapat mengakses E-Ticket melalui halaman 'Cek Tiket' menggunakan Order ID Anda.",
    category: "payment",
  },
  {
    id: "faq-7",
    question: "Apakah saya akan mendapatkan sertifikat?",
    answer: "Ya, semua peserta yang hadir akan mendapatkan E-Certificate of Participation. Beberapa kategori tiket premium akan mendapatkan E-Certificate of Excellence.",
    category: "event-day",
  },
  {
    id: "faq-8",
    question: "Apa yang harus saya bawa saat hari H?",
    answer: "Cukup tunjukkan E-Ticket (berisi QR Code) yang telah Anda dapatkan melalui ponsel Anda. Tidak perlu dicetak. Pastikan juga membawa kartu identitas mahasiswa.",
    category: "event-day",
  },
];
