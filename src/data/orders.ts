export interface OrderItem {
  orderId: string;
  customerName: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  studyProgram: string;
  instagram?: string;
  ticketId: string;
  ticketName: string;
  ticketCategory: "free" | "paid";
  quantity: number;
  totalPrice: number;
  paymentStatus: "pending" | "approved" | "rejected";
  paymentProofUrl?: string;
  paymentMethod?: string;
  createdAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  rejectReason?: string;
}

export const initialOrders: OrderItem[] = [
  {
    orderId: "OM26-00124",
    customerName: "Annisa Humairah Rosyid",
    email: "annisa.humairah@student.telkomuniversity.ac.id",
    whatsapp: "081234567891",
    nim: "6706220014",
    faculty: "Fakultas Ilmu Terapan",
    studyProgram: "Sistem Informasi Kota Cerdas",
    instagram: "@annisahumairah",
    ticketId: "early-bird",
    ticketName: "EARLY BIRD",
    ticketCategory: "paid",
    quantity: 1,
    totalPrice: 50000,
    paymentStatus: "approved",
    paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop",
    paymentMethod: "Bank BRI Manual Transfer",
    createdAt: "2026-08-10 14:32 WIB",
    checkedIn: false,
  },
  {
    orderId: "OM26-00125",
    customerName: "Fajar Ramadhan",
    email: "fajar.ramadhan@student.telkomuniversity.ac.id",
    whatsapp: "085712349988",
    nim: "1202213045",
    faculty: "Fakultas Rekayasa Industri",
    studyProgram: "Sistem Informasi",
    instagram: "@fajar_rmdhn",
    ticketId: "free-pass",
    ticketName: "FREE PASS",
    ticketCategory: "free",
    quantity: 1,
    totalPrice: 0,
    paymentStatus: "approved",
    paymentMethod: "Free Pass",
    createdAt: "2026-08-11 09:15 WIB",
    checkedIn: true,
    checkedInAt: "08:44 WIB",
  },
  {
    orderId: "OM26-00126",
    customerName: "Dina Novita Sari",
    email: "dinanovita@gmail.com",
    whatsapp: "082199887766",
    nim: "1301220455",
    faculty: "Fakultas Informatika",
    studyProgram: "Informatika",
    instagram: "@dinanovitaa",
    ticketId: "regular-pass",
    ticketName: "NORMAL PASS",
    ticketCategory: "paid",
    quantity: 1,
    totalPrice: 75000,
    paymentStatus: "pending",
    paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop",
    paymentMethod: "Bank BRI Manual Transfer",
    createdAt: "2026-08-14 19:20 WIB",
    checkedIn: false,
  },
  {
    orderId: "OM26-00127",
    customerName: "Rizky Akbar Maulana",
    email: "rizky.akbar@student.telkomuniversity.ac.id",
    whatsapp: "081377889900",
    nim: "1401210112",
    faculty: "Fakultas Ekonomi dan Bisnis",
    studyProgram: "Manajemen Bisnis Telekomunikasi & Informatika",
    instagram: "@rizky.akbar",
    ticketId: "early-bird",
    ticketName: "EARLY BIRD",
    ticketCategory: "paid",
    quantity: 2,
    totalPrice: 100000,
    paymentStatus: "pending",
    paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop",
    paymentMethod: "Bank BRI Manual Transfer",
    createdAt: "2026-08-14 20:05 WIB",
    checkedIn: false,
  },
];
