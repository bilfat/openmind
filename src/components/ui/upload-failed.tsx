import { AlertTriangle, RotateCcw } from "lucide-react";

interface UploadFailedProps {
  message?: string;
  onRetry?: () => void;
}

export function UploadFailed({ message, onRetry }: UploadFailedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-burgundy-600/10">
        <AlertTriangle className="h-8 w-8 text-burgundy-600" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-navy-900">
        Upload Gagal
      </h3>
      <p className="mt-2 max-w-sm text-sm text-navy-900/60">
        {message || "Bukti transfer gagal diunggah. Pastikan ukuran file tidak melebihi 5MB dan format file JPG atau PNG."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400 btn-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Coba Lagi</span>
        </button>
      )}
    </div>
  );
}
