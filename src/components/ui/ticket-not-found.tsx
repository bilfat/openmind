import { SearchX } from "lucide-react";

interface TicketNotFoundProps {
  orderId?: string;
}

export function TicketNotFound({ orderId }: TicketNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-900/5">
        <SearchX className="h-10 w-10 text-gold-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-navy-900">
        Tiket Tidak Ditemukan
      </h3>
      <p className="mt-2 max-w-sm text-sm text-navy-900/60">
        {orderId ? (
          <>
            Order ID <span className="font-semibold text-navy-900">{orderId}</span> tidak terdaftar di sistem kami.
          </>
        ) : (
          "Order ID atau email yang kamu masukkan tidak ditemukan."
        )}
      </p>
      <p className="mt-1 max-w-xs text-xs text-navy-900/40">
        Pastikan data yang dimasukkan sudah benar. Periksa kembali email konfirmasi kamu.
      </p>
    </div>
  );
}
