// Illustratieve composities (inline SVG, geen stockfoto's). Teksten zijn voorbeeldlabels, geen klantgegevens.

const row = (y, label, status, statusFill, statusText, progress) => `
  <g transform="translate(40 ${y})">
    <rect width="360" height="58" rx="12" fill="#F7F3E8"/>
    <rect x="14" y="15" width="28" height="28" rx="8" fill="#FFFFFF" stroke="#E2DCCB"/>
    <path d="M22 24h12M22 29h12M22 34h7" stroke="#183F35" stroke-width="1.8" stroke-linecap="round"/>
    <text x="56" y="27" font-family="Manrope, sans-serif" font-weight="700" font-size="13.5" fill="#183F35">${label}</text>
    <rect x="56" y="36" width="150" height="5" rx="2.5" fill="#E8E1CF"/>
    <rect x="56" y="36" width="${150 * progress}" height="5" rx="2.5" fill="${progress === 1 ? '#183F35' : '#C69A5B'}"/>
    <rect x="${346 - status.length * 6.6 - 18}" y="18" width="${status.length * 6.6 + 18}" height="22" rx="11" fill="${statusFill}"/>
    <text x="${346 - (status.length * 6.6 + 18) / 2}" y="33" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="11" fill="${statusText}">${status}</text>
  </g>`;

export function heroVisual() {
  return `<svg viewBox="0 0 520 500" role="img" aria-labelledby="hero-visual-title hero-visual-desc">
  <title id="hero-visual-title">Illustratie van een gestructureerde werkvoorraad</title>
  <desc id="hero-visual-desc">Een overzicht van administratieve werkzaamheden, zoals inkoopfacturen, bankmutaties en een btw-overzicht dat klaarstaat voor beoordeling door het kantoor, met daarnaast een kaartje over veilige gegevensoverdracht.</desc>
  <circle cx="440" cy="70" r="70" fill="none" stroke="#C69A5B" stroke-opacity=".35"/>
  <circle cx="440" cy="70" r="40" fill="none" stroke="#C69A5B" stroke-opacity=".25"/>
  <rect x="20" y="40" width="400" height="360" rx="22" fill="#FFFFFF" stroke="#E2DCCB"/>
  <g transform="translate(40 66)">
    <text font-family="Inter, sans-serif" font-size="11" font-weight="600" letter-spacing="1.3" fill="#7A5A2B">WERKVOORRAAD</text>
    <text y="26" font-family="Manrope, sans-serif" font-weight="800" font-size="20" fill="#183F35">Administraties deze week</text>
  </g>
  <line x1="40" y1="112" x2="400" y2="112" stroke="#EFE8D6"/>
  ${row(128, 'Inkoopfacturen', 'Verwerkt', '#E3EBE7', '#183F35', 1)}
  ${row(196, 'Bankmutaties', 'Verwerkt', '#E3EBE7', '#183F35', 1)}
  ${row(264, 'Btw-overzicht', 'Klaar voor review', '#F3E6D2', '#5C3D0C', 0.85)}
  ${row(332, 'Ontbrekende stukken', 'Teruggekoppeld', '#183F35', '#F7F3E8', 0.6)}
  <g transform="translate(300 400)">
    <rect width="200" height="92" rx="16" fill="#183F35"/>
    <rect x="16" y="18" width="36" height="36" rx="10" fill="#C69A5B" fill-opacity=".18"/>
    <rect x="26" y="34" width="16" height="12" rx="2.5" fill="none" stroke="#C69A5B" stroke-width="1.8"/>
    <path d="M29 34v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#C69A5B" stroke-width="1.8"/>
    <text x="64" y="33" font-family="Manrope, sans-serif" font-weight="700" font-size="13" fill="#FFFFFF">Veilige overdracht</text>
    <text x="64" y="51" font-family="Inter, sans-serif" font-size="11" fill="#F7F3E8" fill-opacity=".8">Toegang op maat</text>
    <text x="64" y="66" font-family="Inter, sans-serif" font-size="11" fill="#F7F3E8" fill-opacity=".8">per werkzaamheid</text>
  </g>
  <g transform="translate(0 0)">
    <rect x="300" y="6" width="150" height="46" rx="23" fill="#FFFFFF" stroke="#E2DCCB"/>
    <circle cx="324" cy="29" r="11" fill="#C69A5B"/>
    <path d="m319 29 3.5 3.5 6.5-7" fill="none" stroke="#102C25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="343" y="34" font-family="Manrope, sans-serif" font-weight="700" font-size="13" fill="#183F35">Op schema</text>
  </g>
</svg>`;
}

// Compacte illustratie voor de mkb-pagina: geordende map met documenten.
export function mkbVisual() {
  return `<svg viewBox="0 0 420 340" role="img" aria-labelledby="mkb-visual-title">
  <title id="mkb-visual-title">Illustratie van een geordende administratie met bijgewerkte categorieën</title>
  <rect x="10" y="20" width="400" height="300" rx="22" fill="#FFFFFF" stroke="#E2DCCB"/>
  <text x="36" y="62" font-family="Inter, sans-serif" font-size="11" font-weight="600" letter-spacing="1.3" fill="#7A5A2B">JOUW ADMINISTRATIE</text>
  <text x="36" y="88" font-family="Manrope, sans-serif" font-weight="800" font-size="19" fill="#183F35">Overzichtelijk en bijgewerkt</text>
  ${['Verkoopfacturen', 'Inkoopfacturen', 'Bank', 'Overige documenten']
    .map(
      (l, i) => `<g transform="translate(36 ${112 + i * 48})">
      <rect width="348" height="38" rx="10" fill="#F7F3E8"/>
      <rect x="12" y="11" width="20" height="16" rx="3" fill="none" stroke="#183F35" stroke-width="1.6"/>
      <path d="M12 16h20" stroke="#183F35" stroke-width="1.6"/>
      <text x="44" y="24" font-family="Manrope, sans-serif" font-weight="700" font-size="13" fill="#183F35">${l}</text>
      <circle cx="324" cy="19" r="10" fill="${i < 3 ? '#183F35' : '#C69A5B'}"/>
      <path d="m319.5 19 3 3 5.5-6" fill="none" stroke="${i < 3 ? '#F7F3E8' : '#102C25'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`,
    )
    .join('')}
</svg>`;
}
