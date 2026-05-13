export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="grid size-8 place-items-center rounded-xl bg-linear-to-br from-[#5b3d8a] to-[#3a2460] text-xs font-bold text-white shadow-[var(--shadow-soft)]"
        aria-hidden
      >
        ₦
      </span>
      <span className="text-[0.9375rem] font-bold tracking-tight text-ink">
        Naira Invoice
      </span>
    </div>
  )
}
