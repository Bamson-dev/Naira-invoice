function resolveTheme(invoice, profile) {
  const t = String(invoice.invoice_template || 'modern_fintech').toLowerCase();
  const normalized =
    t === 'modern'
      ? 'modern_fintech'
      : t === 'classic'
        ? 'executive_black'
        : t === 'minimalist'
          ? 'creative_studio'
          : t;
  const accent = profile?.brand_accent_color;

  const base = {
    id: 'modern_fintech',
    name: 'Modern Fintech',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceAlt: '#F1F5F9',
    text: '#0F172A',
    muted: '#64748B',
    line: '#E2E8F0',
    accent: accent || '#635BFF',
    accentSoft: '#EEF2FF',
    statusPaid: '#059669',
    statusOverdue: '#DC2626',
    statusSent: '#D97706',
    statusPending: '#6366F1'
  };

  const themes = {
    executive_black: {
      ...base,
      id: 'executive_black',
      name: 'Executive Black',
      background: '#0B0B0C',
      surface: '#111215',
      surfaceAlt: '#17191E',
      text: '#F8FAFC',
      muted: '#94A3B8',
      line: '#2A2D33',
      accent: accent || '#D4AF37',
      accentSoft: '#1A1C22'
    },
    creative_studio: {
      ...base,
      id: 'creative_studio',
      name: 'Creative Studio',
      accent: accent || '#7C3AED',
      accentSoft: '#F5F3FF',
      accent2: '#EC4899'
    },
    ivory_luxe: {
      ...base,
      id: 'ivory_luxe',
      name: 'Ivory Luxe',
      background: '#FFFEFA',
      surface: '#F7F0E8',
      surfaceAlt: '#F3EBE0',
      accent: accent || '#9A6C2F',
      line: '#E7DED2'
    },
    midnight_editorial: {
      ...base,
      id: 'midnight_editorial',
      name: 'Midnight Editorial',
      background: '#111827',
      surface: '#1F2937',
      surfaceAlt: '#374151',
      text: '#F9FAFB',
      muted: '#CBD5E1',
      line: '#334155',
      accent: accent || '#22D3EE',
      accentSoft: '#1E293B'
    }
  };

  return themes[normalized] || base;
}

module.exports = { resolveTheme };
