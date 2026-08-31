export default function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 ${className}`}
    />
  );
}
