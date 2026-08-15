"use client";
import Image from "next/image";
import { TalentItem } from "@/data/talents";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface TalentCardProps {
  talent: TalentItem;
  onSelect: () => void;
}

export function TalentCard({ talent, onSelect }: TalentCardProps) {
  return (
    <div 
      className="group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer shadow-lg talent-hover"
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Lihat bio ${talent.name}, ${talent.roleLabel}`}
    >
      <div className="relative w-full aspect-[4/5]">
        <Image
          src={talent.image}
          alt={talent.name}
          layout="fill"
          objectFit="cover"
          className="grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <span className="text-xs font-bold uppercase tracking-widest text-gold-400">{talent.roleLabel}</span>
        <h3 className="mt-1 text-2xl font-bold font-display">{talent.name}</h3>
        <p className="mt-1 text-sm opacity-80">{talent.position}</p>
        <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-semibold flex items-center gap-2">
                Lihat Bio <ArrowRight className="w-4 h-4"/>
            </span>
            <div className="flex items-center gap-3">
                {talent.instagram && (
                  <Link href={talent.instagram} target="_blank" onClick={(e) => e.stopPropagation()} className="hover:text-gold-400" title="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </Link>
                )}
                {talent.linkedin && (
                  <Link href={talent.linkedin} target="_blank" onClick={(e) => e.stopPropagation()} className="hover:text-gold-400" title="LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </Link>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
