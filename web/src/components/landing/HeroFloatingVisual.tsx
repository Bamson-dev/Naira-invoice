import { InvoiceDocumentPreview } from './InvoiceDocumentPreview'

export function HeroFloatingVisual() {
  return (
    <div className="relative mx-auto mt-8 max-w-[280px] px-1">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-linear-to-b from-[#ede9fe]/90 via-white/40 to-transparent blur-2xl"
      />
      <div
        className="animate-[float_5s_ease-in-out_infinite] rounded-[1.75rem] bg-linear-to-b from-white via-[#faf9ff] to-[#f3efff] p-[10px] shadow-[var(--shadow-float)] ring-1 ring-stone-200/60"
      >
        <div className="relative overflow-hidden rounded-[1.35rem] bg-stone-100/80 ring-1 ring-black/5">
          <div className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-black/5 to-transparent" />
          <div className="relative mx-auto max-w-[220px] px-2 pb-3 pt-2">
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-stone-300/90" />
            <InvoiceDocumentPreview variant="classic" compact />
          </div>
        </div>
      </div>
    </div>
  )
}
