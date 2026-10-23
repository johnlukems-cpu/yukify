// Software en tools waarmee Yukify ervaring heeft (bevestigd door de eigenaar).
// Alleen naam, categorie en een feitelijke omschrijving: geen officiële logo's,
// geen certificeringen of partnerschappen. Toevoegen of verwijderen gebeurt alleen in deze lijst.
export const softwareGroups = [
  {
    id: 'software-financieel',
    title: 'Financiële administratie en boekhouden',
    items: [
      { name: 'AFAS Profit', category: 'Bedrijfssoftware', iconName: 'layers', text: 'Bedrijfssoftware met onder meer financiële administratie.' },
      { name: 'AFAS SB', category: 'Online boekhouden', iconName: 'calculator', text: 'Online boekhoudsoftware voor ondernemers en accountants.' },
      { name: 'Exact Online', category: 'Boekhouden', iconName: 'barChart', text: 'Online software voor financiële administratie en boekhouden.' },
      { name: 'e-Boekhouden.nl', category: 'Online boekhouden', iconName: 'percent', text: 'Online boekhoudprogramma voor ondernemers en administratiekantoren.' },
      { name: 'Moneybird', category: 'Boekhouden en facturatie', iconName: 'trendingUp', text: 'Online boekhoud- en facturatiesoftware voor ondernemers.' },
      { name: 'Online Boekhouden', category: 'Online boekhouden', iconName: 'globe', text: 'Online boekhoudprogramma voor ondernemers en boekhouders.' },
      { name: 'Yuki', category: 'Online boekhouden', iconName: 'refresh', text: 'Online boekhoudsoftware met geautomatiseerde verwerking van administratieve documenten.' },
      { name: 'Zenvoices', category: 'Factuurverwerking', iconName: 'inbox', text: 'Automatische verwerking van inkoopfacturen.' },
      { name: 'Basecone', category: 'Documentbeheer', iconName: 'fileText', text: 'Digitaal documentbeheer en ondersteuning bij factuurverwerking.' },
    ],
  },
  {
    id: 'software-werkprocessen',
    title: 'Werkprocessen, samenwerking en AI',
    note: 'Het gebruik van AI-tools stemmen we vooraf met je af. Vertrouwelijke klantgegevens verwerken we alleen volgens de afspraken met jouw kantoor.',
    items: [
      { name: 'AFAS InSite', category: 'Portaal en selfservice', iconName: 'users', text: 'Online portaal en selfservice-omgeving binnen AFAS.' },
      { name: 'monday.com', category: 'Projectmanagement', iconName: 'calendar', text: 'Platform voor projectmanagement en het plannen en opvolgen van werkzaamheden.' },
      { name: 'ChatGPT', category: 'AI-assistent', iconName: 'chat', text: 'AI-assistent van OpenAI voor tekst, analyse en ondersteuning bij werkzaamheden.' },
      { name: 'Claude', category: 'AI-assistent', iconName: 'messageCheck', text: 'AI-assistent van Anthropic voor schrijven, samenvatten en analyseren.' },
      { name: 'Gemini', category: 'AI-assistent', iconName: 'search', text: 'AI-assistent van Google, ook beschikbaar binnen Google Workspace.' },
    ],
  },
];

export const software = softwareGroups.flatMap((g) => g.items);
