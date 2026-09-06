/**
 * Biblioteca de ícones embutidos (SVG, traço 1.75, grade 24×24) — usada pelo
 * componente <Icon> e pelo seletor de ícones do admin (/admin/icones).
 *
 * Cada valor é o miolo (<path>/<circle>) de um <svg>. Sem emoji, sem
 * dependência externa, sem requisição de rede.
 */
export const iconPaths: Record<string, string> = {
  // --- navegação / interface -------------------------------------------
  'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevrons-left': '<path d="m11 6-6 6 6 6"/><path d="m18 6-6 6 6 6"/>',
  'chevrons-right': '<path d="m13 6 6 6-6 6"/><path d="m6 6 6 6-6 6"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5"/><path d="M12 16h.01"/>',
  alert:
    '<path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  filter: '<path d="M3 5h18l-7 8v5l-4 2v-7Z"/>',
  'external-link':
    '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  'more-horizontal':
    '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  'log-out':
    '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M16 16l4-4-4-4"/><path d="M20 12H10"/>',
  'log-in':
    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':
    '<path d="M4 4l16 16"/><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4.1"/><path d="M6.3 8A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.8-.5"/><path d="M9.9 10.1a3 3 0 0 0 4 4"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M15 6l3 3"/>',
  trash:
    '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  save: '<path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v5h7"/><path d="M8 14h8v7H8Z"/>',
  upload:
    '<path d="M12 16V5"/><path d="m8 9 4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download:
    '<path d="M12 5v11"/><path d="m8 12 4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.6 6.7"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
  star: '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.7l5.4-.8Z"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h2.1A3.3 3.3 0 0 0 20 11.7 8.6 8.6 0 0 0 12 3Z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="11" cy="7.2" r="1.2"/><circle cx="15.2" cy="8.2" r="1.2"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  tag: '<path d="M4 12.6V5a1 1 0 0 1 1-1h7.6a2 2 0 0 1 1.4.6l6 6a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1-.6-1.4Z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  message:
    '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',

  // --- domínio saúde / negócio -----------------------------------------
  stethoscope:
    '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M6 3H4.5"/><path d="M14 3h1.5"/><path d="M10 12v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1.2"/><circle cx="19" cy="12" r="2"/>',
  heart:
    '<path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7 3c0 5-7 9.4-7 9.4Z"/>',
  'heart-pulse':
    '<path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7 3c0 5-7 9.4-7 9.4Z"/><path d="M4.5 13H8l1.5-2.5 2 4L13 12h5"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  bed: '<path d="M3 19V7"/><path d="M3 11h13a4 4 0 0 1 4 4v4"/><path d="M3 16h17"/><circle cx="7.5" cy="8.5" r="1.8"/>',
  hospital:
    '<path d="M4 21V8a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M12 10v5"/><path d="M9.5 12.5h5"/><path d="M3 21h18"/>',
  'building-bank':
    '<path d="M3 10 12 4l9 6"/><path d="M5 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M19 10v8"/><path d="M3 21h18"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8.5 7h1"/><path d="M14.5 7h1"/><path d="M8.5 11h1"/><path d="M14.5 11h1"/><path d="M10 21v-4h4v4"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M3 12h18"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17"/><path d="M3.5 15h17"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.4A6 6 0 0 1 21 20"/>',
  'user-check':
    '<circle cx="10" cy="8" r="3.5"/><path d="M4 20a6 6 0 0 1 12 0"/><path d="m16.5 12.5 1.8 1.8 3.2-3.4"/>',
  'user-cog':
    '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 10.5-4"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M17.5 13.8v1.2"/><path d="M17.5 20v1.2"/><path d="m20.7 15.6-1 .6"/><path d="m15.3 18.8-1 .6"/>',
  shield: '<path d="M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z"/>',
  'shield-check':
    '<path d="M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z"/><path d="m9 12 2 2 4-4.5"/>',
  clipboard:
    '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6"/><path d="M9 15h4"/>',
  'clipboard-check':
    '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9.5 13 2 2 3.5-4"/>',
  'file-check':
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 3.5-4"/>',
  'file-text':
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
  newspaper:
    '<path d="M4 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z"/><path d="M18 8h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2"/><path d="M8 8h6"/><path d="M8 12h6"/><path d="M8 16h4"/>',
  folder:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  image:
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 5-4.5 4 3.5 3-2.5 3.5 3"/>',
  inbox:
    '<path d="M3.5 13.5 6 5.5a2 2 0 0 1 2-1.5h8a2 2 0 0 1 2 1.5l2.5 8"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5V18a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z"/>',
  scale:
    '<path d="M12 4v16"/><path d="M7 20h10"/><path d="M5 8h14"/><path d="M5 8 2.5 14h5Z"/><path d="M19 8l-2.5 6h5Z"/>',
  handshake:
    '<path d="m11 8-2.2-1.5a2 2 0 0 0-2.3 0L3 9v6l3 2.5"/><path d="M13 8l2.2-1.5a2 2 0 0 1 2.3 0L21 9v6l-3 2.5"/><path d="m6 15.5 3 2.5 1.5-1.3L12 18l1.5-1.3L15 18l3-2.5"/><path d="M11 8h2"/>',
  route:
    '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a3.5 3.5 0 0 1 0 7h-4a3.5 3.5 0 0 0 0 5h5.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5Z"/>',
  target:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  refresh:
    '<path d="M20 11a8 8 0 0 0-13.7-5.2L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 13.7 5.2L20 16"/><path d="M20 20v-4h-4"/>',
  trending: '<path d="m4 16 5-5 3.5 3.5L20 7"/><path d="M15 7h5v5"/>',
  'trending-down': '<path d="m4 8 5 5 3.5-3.5L20 17"/><path d="M15 17h5v-5"/>',
  chart:
    '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3" height="5"/><rect x="12.5" y="8.5" width="3" height="8.5"/><rect x="17" y="10.5" width="3" height="6.5"/>',
  layers:
    '<path d="m12 3 8.5 4.5L12 12 3.5 7.5Z"/><path d="m3.5 12 8.5 4.5L20.5 12"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
  monitor:
    '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7"/><path d="M12 16.5v4"/>',
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  smartphone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  pointer: '<path d="m5.5 3.5 5 15.5 2.6-6.4L19.5 10Z"/><path d="m13.5 13.5 5 5"/>',
  network:
    '<rect x="9" y="3" width="6" height="5" rx="1.5"/><rect x="2.5" y="16" width="6" height="5" rx="1.5"/><rect x="15.5" y="16" width="6" height="5" rx="1.5"/><path d="M12 8v4"/><path d="M5.5 16v-2a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2"/>',
  workflow:
    '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M6.5 10v4a3 3 0 0 0 3 3H14"/>',
  'git-branch':
    '<circle cx="7" cy="6" r="2.2"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="9" r="2.2"/><path d="M7 8.2v7.6"/><path d="M17 11.2c0 3-2.5 4.3-5.5 4.6"/>',
  home: '<path d="m3.5 11 8.5-7 8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  phone:
    '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  'map-pin':
    '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  whatsapp:
    '<path d="M3.5 20.5 5 16.4A8.2 8.2 0 1 1 8 19.3l-4.5 1.2Z"/><path d="M9 9.2c.3 2.5 3.3 5.4 5.8 5.7.6.1 1.2-.4 1.4-1l.1-.6-2.1-1-.8 1a6.6 6.6 0 0 1-2.7-2.7l1-.8-1-2.1-.6.1c-.6.2-1.2.8-1.1 1.4Z"/>',
  linkedin:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 10.5V17"/><path d="M8 7.5h.01"/><path d="M12 17v-3.6a2.4 2.4 0 0 1 4.8 0V17"/><path d="M12 10.5V17"/>',
  instagram:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
  history:
    '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8"/><path d="M12 8v4.5l3 1.8"/>',
  logo: '<path d="M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z"/><path d="M12 8.5v6"/><path d="M9 11.5h6"/>',

  // --- saúde (biblioteca ampliada) --------------------------------------
  pill: '<rect x="3" y="3" width="18" height="18" rx="9" transform="rotate(45 12 12)"/><path d="M8 12h8" transform="rotate(45 12 12)"/>',
  syringe:
    '<path d="m18 3 3 3"/><path d="m17 4-3 3 3 3-8 8-4 1 1-4 8-8 3 3 3-3-3-3Z"/><path d="m9 15 3 3"/>',
  'first-aid':
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M12 11v5"/><path d="M9.5 13.5h5"/>',
  thermometer: '<path d="M12 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z"/><path d="M12 9h2"/>',
  microscope:
    '<path d="M9 20h8"/><path d="M11 20v-3.5a4.5 4.5 0 1 1 4-4.47"/><path d="M9 12.5h4"/><path d="M10 8.5 8.5 4h3L13 8.5"/>',
  dna: '<path d="M6 3c0 4 12 4 12 8s-12 4-12 8"/><path d="M18 3c0 4-12 4-12 8s12 4 12 8"/><path d="M7.5 7h9"/><path d="M7.5 17h9"/>',
  ambulance:
    '<rect x="2.5" y="9" width="14" height="8" rx="1.5"/><path d="M16.5 12h3.3L21.5 15v2h-5"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/><path d="M7 11v3"/><path d="M5.5 12.5h3"/>',
};
