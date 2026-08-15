"use client";
import { useState, useMemo } from "react";
import { getStoredOrders, OrderItem } from "@/lib/order-store";
import { mockTickets } from "@/data/tickets";
import { Users, Search, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ParticipantsPage() {
  const [orders] = useState<OrderItem[]>(getStoredOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    ticketId: "all",
    faculty: "all",
    checkedIn: "all",
  });

  const participants = useMemo(() => {
    return orders.filter(o => o.paymentStatus === 'approved');
  }, [orders]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const searchMatch =
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nim.includes(searchTerm) ||
        p.orderId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const ticketMatch = filters.ticketId === 'all' || p.ticketId === filters.ticketId;
      const facultyMatch = filters.faculty === 'all' || p.faculty === filters.faculty;
      const checkedInMatch = filters.checkedIn === 'all' || (filters.checkedIn === 'yes' && p.checkedIn) || (filters.checkedIn === 'no' && !p.checkedIn);

      return searchMatch && ticketMatch && facultyMatch && checkedInMatch;
    });
  }, [participants, searchTerm, filters]);

  const faculties = useMemo(() => [...new Set(participants.map(p => p.faculty))], [participants]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-display text-navy-900">Participants</h1>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition btn-scale touch-target">
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, NIM, Order ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-gold-500 focus:border-gold-500"
              aria-label="Cari peserta berdasarkan nama, NIM, atau Order ID"
            />
          </div>
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:ring-gold-500 focus:border-gold-500 bg-white"
            value={filters.ticketId}
            onChange={e => setFilters(prev => ({...prev, ticketId: e.target.value}))}
            aria-label="Filter berdasarkan tipe tiket"
          >
            <option value="all">All Ticket Types</option>
            {mockTickets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:ring-gold-500 focus:border-gold-500 bg-white"
            value={filters.faculty}
            onChange={e => setFilters(prev => ({...prev, faculty: e.target.value}))}
            aria-label="Filter berdasarkan fakultas"
          >
            <option value="all">All Faculties</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:ring-gold-500 focus:border-gold-500 bg-white"
            value={filters.checkedIn}
            onChange={e => setFilters(prev => ({...prev, checkedIn: e.target.value}))}
            aria-label="Filter berdasarkan status check-in"
            >
            <option value="all">Check-in Status</option>
            <option value="yes">Checked-in</option>
            <option value="no">Not Checked-in</option>
          </select>
        </div>
        
        {filteredParticipants.length === 0 ? (
          <EmptyState
            icon={Users}
            title={participants.length === 0 ? "Belum ada peserta" : "Peserta tidak ditemukan"}
            description={participants.length === 0 
              ? "Belum ada peserta yang terdaftar. Peserta akan muncul setelah melakukan pembelian tiket."
              : "Tidak ada peserta yang sesuai dengan filter yang kamu pilih. Coba ubah filter atau kata kunci pencarian."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">NIM</th>
                  <th scope="col" className="px-6 py-3">Faculty</th>
                  <th scope="col" className="px-6 py-3">Ticket</th>
                  <th scope="col" className="px-6 py-3">Checked-in</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(p => (
                  <tr key={p.orderId} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.customerName}</td>
                    <td className="px-6 py-4">{p.nim}</td>
                    <td className="px-6 py-4">{p.faculty}</td>
                    <td className="px-6 py-4">{p.ticketName}</td>
                    <td className="px-6 py-4">
                      {p.checkedIn ? (
                          <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Yes at {p.checkedInAt}</span>
                      ) : (
                          <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
