// Ícones de linha trazidos do protótipo (demo/shared.jsx).
const P: Record<string, React.ReactNode> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c1-3.5 4-5 7-5s6 1.5 7 5" /><circle cx="17" cy="9" r="3" /><path d="M22 19c-.5-2.5-2.5-4-5-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20v-4" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  check: <><path d="M4 12l5 5L20 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chev_right: <><path d="M9 6l6 6-6 6" /></>,
  chev_left: <><path d="M15 6l-6 6 6 6" /></>,
  phone: <><path d="M5 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z" /></>,
  map: <><path d="M12 21s-7-7-7-12a7 7 0 1114 0c0 5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  leaf: <><path d="M3 21c0-8 6-15 18-15-1 9-7 15-15 15-1.5 0-3-1-3-3z" /><path d="M3 21c4-4 8-7 14-9" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></>,
  file: <><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /></>,
  arrow_right: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  logout: <><path d="M16 17l5-5-5-5M21 12H9" /><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /></>,
  whatsapp: <><path d="M3 21l1.7-5.3A9 9 0 1112 21H3z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.5" /></>,
  hand_off: <><path d="M8 11V6.5a1.5 1.5 0 013 0V11" /><path d="M11 11V5a1.5 1.5 0 013 0v6" /><path d="M14 11V6a1.5 1.5 0 013 0v8a6 6 0 01-12 0v-2l-2-2a1.5 1.5 0 012-2l2 2" /></>,
  refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 01-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
  upload: <><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 2h6l1-2h5" /></>,
  badge: <><circle cx="12" cy="9" r="5" /><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5" /></>,
};

export function Icone({ nome, tam = 18, traco = 1.6, cor = "currentColor" }: { nome: keyof typeof P | string; tam?: number; traco?: number; cor?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={traco}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {P[nome] ?? null}
    </svg>
  );
}
