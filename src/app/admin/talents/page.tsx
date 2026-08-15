"use client";
import { useState } from "react";
import { mockTalents, TalentItem } from "@/data/talents";
import { Plus, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { EmptyState } from "@/components/ui/empty-state";

export default function TalentsPage() {
  const [talents, setTalents] = useState<TalentItem[]>(mockTalents);
  
  const handleAdd = () => alert("Add new talent functionality coming soon!");
  const handleEdit = (id: string) => alert(`Editing talent ${id} coming soon!`);
  const handleDelete = (id: string) => {
    if(confirm("Are you sure you want to delete this talent?")) {
      setTalents(talents.filter(t => t.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-display text-navy-900">Talents Management</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-lg text-sm font-semibold hover:bg-gold-400 transition btn-scale"
        >
          <Plus className="w-4 h-4" />
          Add Talent
        </button>
      </div>

      {talents.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <EmptyState
            icon={Plus}
            title="Belum ada talent"
            description="Mulai tambahkan keynote speakers, moderator, atau MC untuk event OPEN MIND."
            action={
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400 btn-scale touch-target"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Tambah Talent Pertama</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Talent</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Position</th>
                  <th scope="col" className="px-6 py-3">Order</th>
                  <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {talents.sort((a,b) => a.order - b.order).map((talent) => (
                  <tr key={talent.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Image
                          src={talent.image}
                          alt={`${talent.name}, ${talent.roleLabel}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-900">{talent.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        talent.role === 'speaker' ? 'bg-blue-100 text-blue-800' :
                        talent.role === 'moderator' ? 'bg-purple-100 text-purple-800' :
                        'bg-pink-100 text-pink-800'
                      }`}>{talent.roleLabel}</span>
                    </td>
                    <td className="px-6 py-4">{talent.position} at {talent.business}</td>
                    <td className="px-6 py-4">{talent.order}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(talent.id)} className="p-2 text-gray-500 hover:text-blue-600 touch-target" aria-label={`Edit ${talent.name}`}><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(talent.id)} className="p-2 text-gray-500 hover:text-red-600 touch-target" aria-label={`Hapus ${talent.name}`}><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
