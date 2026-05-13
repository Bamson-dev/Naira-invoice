type DocVariant = 'classic' | 'minimal' | 'receipt'

const rows = [
  { desc: 'Brand & web design', qty: '1', amt: '₦450,000' },
  { desc: 'Monthly retainer', qty: '1', amt: '₦120,000' },
]

export function InvoiceDocumentPreview({
  variant,
  compact = false,
}: {
  variant: DocVariant
  compact?: boolean
}) {
  const isReceipt = variant === 'receipt'
  const isMinimal = variant === 'minimal'

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl bg-white text-left text-ink',
        compact ? 'text-[10px] leading-snug' : 'text-[11px] leading-snug',
        isMinimal
          ? 'ring-1 ring-stone-200/80'
          : 'shadow-[0_1px_0_rgb(12_10_18/0.04),0_18px_40px_-20px_rgb(58_36_96/0.2)]',
      ].join(' ')}
    >
      {!isMinimal && (
        <div
          className={[
            'h-1.5 w-full',
            isReceipt
              ? 'bg-linear-to-r from-emerald-500 to-teal-500'
              : 'bg-linear-to-r from-[#5b3d8a] via-[#7c5cbf] to-[#4a2d7a]',
          ].join(' ')}
        />
      )}

      <div className={compact ? 'p-3 pt-3' : 'p-4 pt-4'}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={[
                'grid shrink-0 place-items-center rounded-lg font-bold text-white',
                compact ? 'size-7 text-[10px]' : 'size-8 text-xs',
                isReceipt ? 'bg-emerald-600' : 'bg-[#3a2460]',
              ].join(' ')}
              aria-hidden
            >
              AF
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">Amina Freelance</p>
              <p className="truncate text-[0.85em] font-normal text-muted">
                Lagos, Nigeria
              </p>
            </div>
          </div>
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-[0.75em] font-semibold',
              isReceipt
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-lavender-soft text-[#4a2d7a]',
            ].join(' ')}
          >
            {isReceipt ? 'Paid' : 'Awaiting payment'}
          </span>
        </div>

        <div
          className={`mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-stone-100 pt-3 ${isMinimal ? 'border-dashed' : ''}`}
        >
          <div>
            <p className="text-[0.75em] font-normal uppercase tracking-wide text-muted">
              {isReceipt ? 'Receipt' : 'Invoice'}
            </p>
            <p className="font-bold text-ink">
              {isReceipt ? 'RCP-0092' : 'INV-2048'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.75em] font-normal text-muted">Issued</p>
            <p className="font-semibold text-ink">12 May 2026</p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl bg-stone-50/90">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[0.7em] font-semibold uppercase tracking-wide text-muted">
                <th className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} font-semibold`}>
                  Item
                </th>
                <th className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} w-10 text-center font-semibold`}>
                  Qty
                </th>
                <th
                  className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} text-right font-semibold`}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {rows.map((r) => (
                <tr key={r.desc} className="text-ink">
                  <td className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} font-medium`}>
                    {r.desc}
                  </td>
                  <td
                    className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} text-center font-normal text-muted`}
                  >
                    {r.qty}
                  </td>
                  <td
                    className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} text-right font-semibold tabular-nums`}
                  >
                    {r.amt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-linear-to-r from-[#f8f6ff] to-white px-3 py-2">
          <span className="text-[0.8em] font-semibold text-muted">Total due</span>
          <span className="text-sm font-bold tabular-nums text-ink">₦570,000</span>
        </div>

        {!compact && (
          <p className="mt-2 text-center text-[0.7em] font-normal text-muted">
            Bank transfer · Paystack · Cash
          </p>
        )}
      </div>
    </div>
  )
}
