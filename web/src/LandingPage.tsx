import type { ReactNode } from 'react'
import { LogoMark } from './components/landing/LogoMark'
import { HeroFloatingVisual } from './components/landing/HeroFloatingVisual'
import { InvoiceDocumentPreview } from './components/landing/InvoiceDocumentPreview'

const features = [
  {
    title: 'WhatsApp ready',
    body: 'Send invoices straight to clients on WhatsApp in one tap.',
    icon: (
      <path d="M12 2C6.48 2 2 6.15 2 11.3c0 1.89.55 3.65 1.5 5.15L2.2 22l5.75-1.25A9.4 9.4 0 0 0 12 20.6C17.52 20.6 22 16.45 22 11.3 22 6.15 17.52 2 12 2Zm0 17.2c-1.58 0-3.08-.42-4.38-1.18l-.31-.18-3.05.66.65-2.97-.2-.33A7.15 7.15 0 0 1 4.8 11.3C4.8 7.5 8.06 4.4 12 4.4s7.2 3.1 7.2 6.9-3.26 6.9-7.2 6.9Zm4.05-8.35c-.22-.12-1.3-.64-1.5-.71-.2-.08-.35-.12-.5.12-.15.22-.58.71-.71.86-.13.15-.26.17-.48.06-.22-.12-.93-.34-1.77-1.08-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.01-.39-.06-.11-.5-1.2-.69-1.64-.18-.42-.37-.36-.5-.37l-.43-.01c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.57 2.4 3.8 3.36 1.06.46 1.5.5 2.02.42.33-.05 1.3-.53 1.48-1.05.18-.51.18-.95.13-1.05-.05-.1-.2-.16-.42-.28Z" />
    ),
  },
  {
    title: 'Looks professional',
    body: 'Templates that feel trustworthy — not like a random PDF.',
    icon: (
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1.5 7h7v1.5h-7V10Zm0 3h7v1.5h-7V13Zm0 3h4.5v1.5H8.5V16Z" />
    ),
  },
  {
    title: 'Works on mobile',
    body: 'Built for founders who run their business from one phone.',
    icon: (
      <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    ),
  },
  {
    title: 'Track payments',
    body: 'See who has paid and who still owes you — at a glance.',
    icon: (
      <path d="M3 17h2v2H3v-2Zm4 0h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2ZM3 13h2v2H3v-2Zm4 0h10v2H7v-2Zm12 0h2v2h-2v-2ZM3 9h2v2H3V9Zm4 0h2v2H7V9Zm4 0h2v2h-2V9Zm4 0h2v2h-2V9Zm4 0h2v2h-2V9ZM3 5h2v2H3V5Zm4 0h14v2H7V5Z" />
    ),
  },
] as const

const steps = [
  { n: '1', title: 'Create invoice', body: 'Add line items, totals, and your brand in seconds.' },
  { n: '2', title: 'Send to client', body: 'Share by link, PDF, or WhatsApp — however they pay.' },
  { n: '3', title: 'Get paid', body: 'Follow up with clarity and close the loop professionally.' },
] as const

const previews = [
  { key: 'classic', label: 'Invoice · Bold', variant: 'classic' as const },
  { key: 'minimal', label: 'Invoice · Calm', variant: 'minimal' as const },
  { key: 'receipt', label: 'Receipt · Paid', variant: 'receipt' as const },
] as const

const testimonials = [
  {
    quote: 'Clients take me more seriously now. The invoice looks like a real company sent it.',
    name: 'Tunde O.',
    role: 'Product designer · Abuja',
  },
  {
    quote: 'I stopped chasing people with screenshots. One link, one invoice, done.',
    name: 'Chioma N.',
    role: 'Social media manager · Port Harcourt',
  },
] as const

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lavender-soft text-[#4a2d7a] shadow-[inset_0_1px_0_rgb(255_255_255/0.65)] ring-1 ring-[#e8e0ff]">
      <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </span>
  )
}

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-x-hidden bg-canvas text-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_60%_at_50%_-10%,#ede9fe_0%,transparent_55%),radial-gradient(80%_50%_at_100%_0%,#f3efff_0%,transparent_45%)]"
      />

      <div className="mx-auto w-full max-w-md px-4 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 py-3">
          <LogoMark />
          <a
            href="/login.html"
            className="rounded-full border border-stone-200/90 bg-white/80 px-4 py-2 text-sm font-semibold text-ink shadow-[0_1px_0_rgb(12_10_18/0.04)] backdrop-blur-sm transition hover:border-stone-300 hover:bg-white"
          >
            Login
          </a>
        </header>

        {/* Hero */}
        <section className="pt-2 text-center">
          <p className="mx-auto inline-flex rounded-full bg-lavender-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-[#4a2d7a] ring-1 ring-[#e4daf7]">
            Built for Nigerian businesses
          </p>

          <h1 className="mx-auto mt-4 max-w-[14rem] text-balance text-[1.625rem] font-bold leading-[1.15] tracking-tight text-ink sm:max-w-[16rem] sm:text-[1.75rem]">
            Send invoices.
            <br />
            Get paid faster.
          </h1>

          <p className="mx-auto mt-3 max-w-[20rem] text-pretty text-sm font-medium leading-relaxed text-muted">
            Create beautiful invoices and receipts in under 60 seconds.
          </p>

          <div className="mt-6">
            <a
              href="/signup.html"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-linear-to-r from-[#5b3d8a] via-[#4a2d7a] to-[#3a2460] text-[15px] font-bold text-white shadow-[var(--shadow-cta)] ring-1 ring-white/10 transition active:scale-[0.99] hover:brightness-[1.03]"
            >
              Create free invoice
            </a>
            <p className="mt-3 text-center text-xs font-normal text-muted">No card required</p>
          </div>

          <HeroFloatingVisual />
        </section>

        {/* Social proof */}
        <section className="mt-8">
          <div className="grid gap-3">
            {[
              'Used by Nigerian freelancers',
              'Invoices sent in seconds',
              'Built for mobile-first businesses',
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-ink shadow-[var(--shadow-soft)] ring-1 ring-stone-200/60 backdrop-blur-sm"
              >
                <span className="grid size-2 place-items-center">
                  <span className="size-1.5 rounded-full bg-[#5b3d8a]" />
                </span>
                {t}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-10">
          <h2 className="text-center text-lg font-bold tracking-tight text-ink">
            Why people love it
          </h2>
          <p className="mx-auto mt-2 max-w-[18rem] text-center text-sm font-medium text-muted">
            Less admin. More money in your account.
          </p>

          <ul className="mt-6 flex flex-col gap-4">
            {features.map((f) => (
              <li
                key={f.title}
                className="flex gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-stone-200/50"
              >
                <IconFrame>{f.icon}</IconFrame>
                <div className="min-w-0 text-left">
                  <h3 className="text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-muted">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="mt-10">
          <h2 className="text-center text-lg font-bold tracking-tight text-ink">How it works</h2>
          <p className="mx-auto mt-2 max-w-[16rem] text-center text-sm font-medium text-muted">
            Three simple steps. No training required.
          </p>

          <ol className="mx-auto mt-6 max-w-sm">
            {steps.map((s, i) => (
              <li key={s.n} className="flex gap-4">
                <div className="flex w-10 shrink-0 flex-col items-center">
                  <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-[#4a2d7a] shadow-[var(--shadow-soft)] ring-2 ring-lavender-soft">
                    {s.n}
                  </span>
                  {i < steps.length - 1 ? (
                    <div className="mx-auto mt-2 w-px flex-1 min-h-8 bg-linear-to-b from-[#d9cff5] to-[#c4b6e8]" />
                  ) : null}
                </div>
                <div className={`min-w-0 flex-1 text-left ${i < steps.length - 1 ? 'pb-8' : ''}`}>
                  <h3 className="text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Swipe previews */}
        <section className="mt-8">
          <h2 className="text-center text-lg font-bold tracking-tight text-ink">
            Invoice & receipt styles
          </h2>
          <p className="mx-auto mt-2 max-w-[18rem] text-center text-sm font-medium text-muted">
            Swipe to preview polished documents your clients will respect.
          </p>

          <div className="relative mt-6">
            <div
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pl-1 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="region"
              aria-label="Document style previews"
            >
              {previews.map((p) => (
                <article
                  key={p.key}
                  className="w-[min(100%,280px)] shrink-0 snap-center first:pl-0"
                >
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                    {p.label}
                  </p>
                  <InvoiceDocumentPreview variant={p.variant} />
                </article>
              ))}
            </div>
            <p className="text-center text-[11px] font-normal text-muted">Swipe for more</p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-10">
          <h2 className="text-center text-lg font-bold tracking-tight text-ink">
            From people like you
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-3xl bg-white p-5 text-left shadow-[var(--shadow-soft)] ring-1 ring-stone-200/50"
              >
                <blockquote className="text-sm font-medium leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 text-xs font-semibold text-muted">
                  <span className="text-ink">{t.name}</span>
                  <span className="mx-1 text-stone-300">·</span>
                  <span className="font-medium">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-10 overflow-hidden rounded-3xl bg-linear-to-b from-[#f4f0ff] to-white p-7 text-center shadow-[var(--shadow-soft)] ring-1 ring-[#e8e0ff]">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-ink">
            Start sending professional invoices today
          </h2>
          <a
            href="/signup.html"
            className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-linear-to-r from-[#5b3d8a] via-[#4a2d7a] to-[#3a2460] text-[15px] font-bold text-white shadow-[var(--shadow-cta)] ring-1 ring-white/10 transition active:scale-[0.99] hover:brightness-[1.03]"
          >
            Create free invoice
          </a>
        </section>
      </div>
    </div>
  )
}
