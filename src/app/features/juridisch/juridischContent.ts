/**
 * PRIVACYVERKLARING & GEBRUIKSVOORWAARDEN — de tekst zelf, als data.
 *
 * Bewust content-als-data in plaats van JSX: JuridischPage rendert deze
 * structuur (koppen in volgorde, `<ul>` voor lijsten, `<dl>` voor definities),
 * zodat de tekst bijwerken nooit een layout- of a11y-regressie kan zijn.
 *
 * Deze twee documenten zijn de ENIGE bron van waarheid voor de juridische
 * tekst — er staat geen tweede kopie in `docs/` of op een marketingpagina.
 * Beide routes (`/privacy`, `/voorwaarden`) staan bewust BUITEN de auth-gate
 * (zie App.tsx), zodat ze ook zonder account een werkende publieke URL zijn.
 *
 * ⚠️ VUL AAN VOOR PRODUCTIE: `VERANTWOORDELIJKE` en `CONTACT_EMAIL` hieronder.
 * Zolang Cura geen rechtspersoon/adres heeft is de verantwoordelijke alleen bij
 * naam genoemd; de AVG vraagt om herleidbare contactgegevens, dus vul hier het
 * postadres/KvK-nummer aan zodra die er zijn. Werk bij elke inhoudelijke
 * wijziging ook `LAATST_BIJGEWERKT` bij — daar verwijst de tekst zelf naar.
 */

/**
 * Naam van de verwerkingsverantwoordelijke (AVG art. 13 lid 1 sub a). Cura
 * wordt door één persoon gemaakt en beheerd; komt er later een rechtspersoon,
 * dan hoort hier die naam te staan (de teksten lezen met beide).
 */
export const VERANTWOORDELIJKE = "Bram Jansen";

/** Kanaal voor privacyvragen én AVG-verzoeken (inzage, verwijdering, …). */
export const CONTACT_EMAIL = "bramjansen3@gmail.com";

/** Datum van de laatste inhoudelijke wijziging aan de teksten hieronder. */
export const LAATST_BIJGEWERKT = "31 juli 2026";

// ─── Contentmodel ────────────────────────────────────────────────────────────

export type JuridischBlok =
  | { type: "alinea"; text: string }
  | { type: "lijst"; items: string[] }
  /** Term + uitleg — rendert als `<dl>`, niet als een nagebootste tabel. */
  | { type: "definities"; items: { term: string; text: string }[] };

export interface JuridischSectie {
  /** Wordt een `<h2>`; houd 'm kort, dit is ook de scanbare inhoudsopgave. */
  titel: string;
  blokken: JuridischBlok[];
}

export interface JuridischDocument {
  titel: string;
  ondertitel: string;
  /** Eén rustige regel boven de secties, in de toon van de app. */
  intro: string;
  secties: JuridischSectie[];
}

// ─── Privacyverklaring ───────────────────────────────────────────────────────

export const PRIVACY: JuridischDocument = {
  titel: "Privacy",
  ondertitel: "Wat Cura van je bewaart, en waarom.",
  intro:
    "Cura is een planner voor je huishouden, geen advertentiebedrijf. We bewaren alleen wat de app nodig heeft om te werken, we verkopen niets door en er zit geen tracking in.",
  secties: [
    {
      titel: "Kort samengevat",
      blokken: [
        {
          type: "lijst",
          items: [
            "Geen advertenties, geen trackers, geen analytics-scripts.",
            "We verkopen of verhuren je gegevens nooit aan derden.",
            "Wat je in Cura zet, is zichtbaar voor de leden van jouw huishouden — en voor niemand anders.",
            "Meldingen zijn optioneel en zetten we alleen aan als je er zelf om vraagt.",
            "Je kunt je gegevens altijd opvragen of laten verwijderen.",
          ],
        },
      ],
    },
    {
      titel: "Wie is verantwoordelijk",
      blokken: [
        {
          type: "alinea",
          text: `Cura wordt gemaakt en beheerd door ${VERANTWOORDELIJKE}, tevens de verwerkingsverantwoordelijke in de zin van de Algemene verordening gegevensbescherming (AVG). Cura is een persoonlijk project, geen bedrijf — "we" in deze verklaring is dus één maker.`,
        },
        {
          type: "alinea",
          text: `Vragen over privacy, of een verzoek over je gegevens? Mail ${CONTACT_EMAIL}. We reageren binnen vier weken.`,
        },
      ],
    },
    {
      titel: "Welke gegevens we bewaren",
      blokken: [
        {
          type: "definities",
          items: [
            {
              term: "Je account",
              text: "Je e-mailadres en — als je met een wachtwoord inlogt — een versleutelde weergave van dat wachtwoord. We zien je wachtwoord zelf nooit. Log je in met een inloglink, dan is er helemaal geen wachtwoord.",
            },
            {
              term: "Je naam in huis",
              text: "De weergavenaam die je huisgenoot ziet (\"Bram\", \"Stéphanie\"). Een voornaam of bijnaam is genoeg; er is geen echte-naam-verplichting.",
            },
            {
              term: "Je huishouden",
              text: "De naam van je huishouden, de tijdzone (zodat een wekker op het juiste moment afgaat), wie er lid van zijn, en de uitnodigingslinks die je aanmaakt.",
            },
            {
              term: "Wat je in de app zet",
              text: "Kamers, taken met hun beschrijving, checklists, routines, boodschappen, wekkers en duur. Dit is de inhoud van je huishouden — wij lezen die niet mee voor andere doeleinden.",
            },
            {
              term: "Wat je afvinkt",
              text: "Elke keer dat een taak wordt afgevinkt bewaren we wie dat deed en wanneer. Dat is wat de Samen-pagina en het ritme van je routines mogelijk maakt.",
            },
            {
              term: "Meldingsvoorkeuren",
              text: "Of meldingen aan staan, je stille uren, en — als je meldingen aanzet — een technisch adres van je browser waarmee je toestel een melding kan ontvangen. Daar staat geen inhoud in.",
            },
            {
              term: "Verzonden meldingen",
              text: "Per wekker houden we bij dat die is verstuurd, zodat je niet twee keer dezelfde melding krijgt.",
            },
          ],
        },
        {
          type: "alinea",
          text: "Wat we níet bewaren: geen locatiegegevens, geen contacten, geen agenda, geen foto's, geen advertentie-identificatoren en geen profiel van je gedrag buiten de app.",
        },
      ],
    },
    {
      titel: "Waarvoor, en op welke grondslag",
      blokken: [
        {
          type: "definities",
          items: [
            {
              term: "Om de app te laten werken",
              text: "Je account, je huishouden en de inhoud die je erin zet hebben we nodig om Cura te kunnen leveren. Grondslag: uitvoering van de overeenkomst met jou (AVG art. 6 lid 1 sub b).",
            },
            {
              term: "Om je aan een taak te herinneren",
              text: "Meldingen sturen we alleen als je ze zelf hebt aangezet. Grondslag: jouw toestemming (art. 6 lid 1 sub a). Je kunt die op elk moment intrekken door meldingen weer uit te zetten.",
            },
            {
              term: "Om de app veilig en werkend te houden",
              text: "Onze hosting- en databasepartij houdt technische logs bij om storingen en misbruik te kunnen onderzoeken. Grondslag: gerechtvaardigd belang (art. 6 lid 1 sub f) bij een veilige, beschikbare dienst.",
            },
          ],
        },
        {
          type: "alinea",
          text: "We nemen geen geautomatiseerde besluiten over je en we maken geen profielen om je gedrag te voorspellen. De suggesties op Vandaag komen uit vaste, uitlegbare regels over je eigen taken — geen scores, geen ranglijst tussen huisgenoten.",
        },
      ],
    },
    {
      titel: "Wat je huisgenoot ziet",
      blokken: [
        {
          type: "alinea",
          text: "Cura is met opzet een gedeelde ruimte. Alles wat in een huishouden staat — taken, beschrijvingen, checklists, routines, boodschappen én wie wat wanneer heeft afgevinkt — is zichtbaar voor iedereen in datzelfde huishouden. Zet er dus niets in wat je niet met je huisgenoot wilt delen.",
        },
        {
          type: "alinea",
          text: "Wat een huisgenoot níet ziet: je e-mailadres en je wachtwoord. Die staan bij je account, niet bij je huishouden. Je stille uren en of je meldingen aan hebt staan, laten we nergens in de app aan je huisgenoot zien — maar ze worden wél bij je huishouden bewaard, dus technisch gesproken zou een huisgenoot die zelf de database uitleest ze kunnen zien. We zeggen dat liever eerlijk dan dat we een garantie beloven die we vandaag nog niet waterdicht hebben.",
        },
        {
          type: "alinea",
          text: "Wie je uitnodigt met een link, kan met die link lid worden van je huishouden en de inhoud ervan zien. De link vervalt na zeven dagen, is één keer te gebruiken en je kunt hem eerder intrekken bij Huishouden beheren.",
        },
      ],
    },
    {
      titel: "Wie we inschakelen",
      blokken: [
        {
          type: "alinea",
          text: "We besteden een paar technische onderdelen uit. Deze partijen mogen je gegevens alleen gebruiken om die dienst voor ons uit te voeren:",
        },
        {
          type: "definities",
          items: [
            {
              term: "Supabase",
              text: "Database, inloggen en het versturen van e-mails zoals een inloglink of wachtwoordherstel. Hier staan je account en de inhoud van je huishouden.",
            },
            {
              term: "Vercel",
              text: "Hosting van de app zelf. Ontvangt bij het opvragen van de app technische gegevens zoals je IP-adres en browsertype.",
            },
            {
              term: "Google Fonts",
              text: "De lettertypen van de app worden bij het openen van Google's servers geladen, die daarbij je IP-adres zien. Er zitten geen cookies of tracking aan vast.",
            },
            {
              term: "De pushdienst van je browser",
              text: "Zet je meldingen aan, dan loopt de melding via de pushdienst van je browser of besturingssysteem (bijvoorbeeld Apple, Google of Mozilla). De inhoud is onderweg versleuteld.",
            },
          ],
        },
        {
          type: "alinea",
          text: "Sommige van deze partijen zijn Amerikaans en kunnen gegevens buiten de Europese Economische Ruimte verwerken. Dat gebeurt op basis van de standaardcontractbepalingen van de Europese Commissie of een geldig adequaatheidsbesluit.",
        },
      ],
    },
    {
      titel: "Cookies en lokale opslag",
      blokken: [
        {
          type: "alinea",
          text: "Cura gebruikt geen tracking- of advertentiecookies. We bewaren wel een paar dingen in de lokale opslag van je browser, omdat de app anders niet kan werken:",
        },
        {
          type: "lijst",
          items: [
            "Je inlogsessie, zodat je niet bij elke keer opnieuw hoeft in te loggen.",
            "Kleine voorkeuren van dit toestel: of meldingen aan staan, een lopende focustimer, en of je de intro en de veeg-uitleg al hebt gezien.",
            "Wat je vandaag hebt weggetikt met \"niet vandaag\" — dat vervalt automatisch aan het eind van de dag.",
          ],
        },
        {
          type: "alinea",
          text: "Deze gegevens blijven op je eigen toestel staan en worden niet naar ons verstuurd. Wis je de opslag van je browser, dan verdwijnen ze — je huishouden zelf blijft gewoon bestaan.",
        },
      ],
    },
    {
      titel: "Hoe lang we het bewaren",
      blokken: [
        {
          type: "lijst",
          items: [
            "Je account en de inhoud van je huishouden bewaren we zolang je Cura gebruikt.",
            "Verwijder je een taak, kamer of boodschap, dan is die uit de app weg. Back-ups van onze databasepartij kunnen zo'n item nog korte tijd bevatten voordat ze verlopen.",
            "Uitnodigingslinks vervallen na zeven dagen.",
            "Vraag je om verwijdering van je account, dan verwijderen we je gegevens binnen 30 dagen.",
          ],
        },
        {
          type: "alinea",
          text: "Ben je de laatste in een huishouden en laat je je account verwijderen, dan verdwijnt dat huishouden met alle inhoud mee. Zijn er nog andere leden, dan blijft het huishouden bestaan; jouw naam wordt dan losgemaakt van de taken die je hebt afgevinkt.",
        },
      ],
    },
    {
      titel: "Hoe we het beveiligen",
      blokken: [
        {
          type: "lijst",
          items: [
            "Al het verkeer tussen je toestel en onze servers gaat over een versleutelde verbinding (HTTPS).",
            "Wachtwoorden worden versleuteld opgeslagen door onze inlogdienst; wij kunnen ze niet uitlezen.",
            "De database dwingt per regel af dat je alleen bij je eigen huishouden kunt. Iemand anders' huishouden opvragen kan niet, ook niet met een aangepaste app.",
            "Meldingen worden versleuteld verstuurd en gaan alleen naar toestellen die zelf om meldingen hebben gevraagd.",
          ],
        },
        {
          type: "alinea",
          text: "Volledige veiligheid kan niemand garanderen. Merk je iets vreemds, of denk je een kwetsbaarheid te hebben gevonden? Mail ons — we nemen het serieus en gaan er zorgvuldig mee om.",
        },
      ],
    },
    {
      titel: "Jouw rechten",
      blokken: [
        {
          type: "alinea",
          text: "Je hebt op grond van de AVG het recht om:",
        },
        {
          type: "lijst",
          items: [
            "je gegevens in te zien en een kopie te ontvangen;",
            "onjuiste gegevens te laten corrigeren — je naam kun je zelf aanpassen bij Account beheren;",
            "je gegevens te laten verwijderen;",
            "de verwerking te laten beperken of daartegen bezwaar te maken;",
            "je gegevens in een gangbaar bestandsformaat mee te nemen;",
            "je toestemming voor meldingen op elk moment in te trekken.",
          ],
        },
        {
          type: "alinea",
          text: `Stuur je verzoek naar ${CONTACT_EMAIL} vanaf het e-mailadres van je account. Ben je niet tevreden over hoe we het oppakken, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.`,
        },
      ],
    },
    {
      titel: "Kinderen",
      blokken: [
        {
          type: "alinea",
          text: "Cura is bedoeld voor mensen van 16 jaar en ouder. We vragen niet naar leeftijd en richten ons niet op kinderen. Denk je dat een kind zonder toestemming een account heeft gemaakt? Laat het ons weten, dan verwijderen we het.",
        },
      ],
    },
    {
      titel: "Als je Cura lokaal gebruikt",
      blokken: [
        {
          type: "alinea",
          text: "Cura kan ook in een lokale modus draaien, zonder account. Dan staat alles alleen in de opslag van je eigen browser: er is geen server, er wordt niets verstuurd en er valt voor ons niets in te zien. Er zijn dan ook geen huisgenoten en geen meldingen als de app dicht is.",
        },
      ],
    },
    {
      titel: "Wijzigingen",
      blokken: [
        {
          type: "alinea",
          text: `Verandert er iets aan de app waardoor deze verklaring niet meer klopt, dan werken we de tekst bij. De datum bovenaan laat zien wanneer dat voor het laatst gebeurde; bij een belangrijke wijziging laten we het in de app weten. Deze versie is van ${LAATST_BIJGEWERKT}.`,
        },
      ],
    },
  ],
};

// ─── Gebruiksvoorwaarden ─────────────────────────────────────────────────────

export const VOORWAARDEN: JuridischDocument = {
  titel: "Voorwaarden",
  ondertitel: "De afspraken tussen jou en Cura.",
  intro:
    "Geen kleine lettertjes waar je een advocaat bij nodig hebt. Dit is wat je van Cura mag verwachten, en wat wij van jou verwachten.",
  secties: [
    {
      titel: "Waar dit over gaat",
      blokken: [
        {
          type: "alinea",
          text: `Deze voorwaarden gelden als je Cura gebruikt. Cura wordt aangeboden door ${VERANTWOORDELIJKE} (hierna "we" of "wij"), als persoonlijk project. Ben je het er niet mee eens, gebruik de app dan niet.`,
        },
        {
          type: "alinea",
          text: "Hoe we met je gegevens omgaan staat niet hier, maar in de privacyverklaring.",
        },
      ],
    },
    {
      titel: "Wat Cura is",
      blokken: [
        {
          type: "alinea",
          text: "Cura is een rustige, gedeelde huishoudplanner voor mensen die samen wonen. Het is een hulpmiddel om de vraag \"wie doet wat en wanneer\" uit je hoofd te halen.",
        },
        {
          type: "alinea",
          text: "Cura is met opzet géén scorebord: er zijn geen ranglijsten tussen huisgenoten en geen cijfer over je huishouden. Er is ook geen toezicht op wie z'n afspraken nakomt — dat blijft tussen jullie.",
        },
      ],
    },
    {
      titel: "Je account",
      blokken: [
        {
          type: "lijst",
          items: [
            "Je moet 16 jaar of ouder zijn om een account aan te maken.",
            "Gebruik een e-mailadres waar je zelf bij kunt; inloglinks en wachtwoordherstel gaan daarnaartoe.",
            "Houd je wachtwoord voor jezelf. Wie toegang heeft tot je e-mail of wachtwoord, kan bij je huishouden.",
            "Eén account hoort bij één huishouden. Er zit nog geen knop in de app om zelf een huishouden te verlaten of naar een ander over te stappen — mail ons en we regelen het met de hand.",
          ],
        },
      ],
    },
    {
      titel: "Wat je samen deelt",
      blokken: [
        {
          type: "alinea",
          text: "Alles wat je in een huishouden zet, is zichtbaar voor de andere leden — inclusief wie wat wanneer heeft afgevinkt. Zet er niets in wat je niet wilt delen.",
        },
        {
          type: "alinea",
          text: "Nodig alleen mensen uit die je vertrouwt. Een uitnodigingslink geeft toegang tot je hele huishouden. De link vervalt na zeven dagen, is één keer te gebruiken en je kunt hem intrekken.",
        },
        {
          type: "alinea",
          text: "Elk lid kan taken, kamers en routines aanpassen of verwijderen. Er is geen beheerder met meer rechten en geen prullenbak: verwijderen is definitief.",
        },
      ],
    },
    {
      titel: "Wat we van je verwachten",
      blokken: [
        {
          type: "lijst",
          items: [
            "Gebruik Cura niet om iemand lastig te vallen, te bedreigen of in de gaten te houden.",
            "Zet er geen inhoud in die onrechtmatig is of niet van jou is om te delen.",
            "Probeer de app of onze servers niet te overbelasten, te omzeilen of binnen te dringen.",
            "Gebruik de app niet om gegevens van andere huishoudens te verzamelen.",
          ],
        },
        {
          type: "alinea",
          text: "Gaat iemand hier flink over de streep, dan kunnen we een account of huishouden blokkeren. Bij twijfel nemen we eerst contact op.",
        },
      ],
    },
    {
      titel: "Wekkers en meldingen",
      blokken: [
        {
          type: "alinea",
          text: "Een wekker in Cura is een zacht duwtje, geen garantie. Of een melding aankomt hangt af van je toestel, je browser, je instellingen en je internetverbinding — dingen waar wij niet over gaan.",
        },
        {
          type: "alinea",
          text: "Vertrouw dus niet op Cura voor iets waarbij een gemiste melding echt schade doet, zoals medicatie of een afspraak die je niet kunt missen. Gebruik daar de wekker van je telefoon voor.",
        },
      ],
    },
    {
      titel: "Beschikbaarheid",
      blokken: [
        {
          type: "alinea",
          text: "We doen ons best om Cura werkend en veilig te houden, maar we beloven geen ononderbroken beschikbaarheid. Onderhoud, storingen bij onze leveranciers of een fout in een nieuwe versie kunnen de app tijdelijk onbruikbaar maken.",
        },
        {
          type: "alinea",
          text: "Cura is nog in ontwikkeling. Functies kunnen veranderen of verdwijnen. Bewaar zelf een kopie van iets waar je echt niet zonder kunt.",
        },
      ],
    },
    {
      titel: "Aansprakelijkheid",
      blokken: [
        {
          type: "alinea",
          text: "Cura wordt aangeboden zoals het is, zonder garanties over geschiktheid voor een bepaald doel. Voor zover de wet dat toestaat, zijn wij niet aansprakelijk voor indirecte schade, gemiste afspraken, verloren gegevens of gevolgen van een melding die niet aankwam.",
        },
        {
          type: "alinea",
          text: "Deze beperking geldt niet bij opzet of bewuste roekeloosheid van onze kant, en niet voor aansprakelijkheid die je volgens de wet niet kunt uitsluiten. Gebruik je Cura als consument, dan blijven je wettelijke rechten volledig gelden.",
        },
      ],
    },
    {
      titel: "Stoppen",
      blokken: [
        {
          type: "alinea",
          text: `Je kunt op elk moment stoppen. Uitloggen kan in de app; wil je je account en gegevens laten verwijderen, mail dan ${CONTACT_EMAIL}. Wat er daarna met je gegevens gebeurt, staat in de privacyverklaring.`,
        },
        {
          type: "alinea",
          text: "Wij kunnen het aanbieden van Cura beëindigen. Gebeurt dat, dan laten we het op tijd weten zodat je je gegevens kunt meenemen.",
        },
      ],
    },
    {
      titel: "Wijzigingen en toepasselijk recht",
      blokken: [
        {
          type: "alinea",
          text: `Deze voorwaarden kunnen veranderen. Bij een belangrijke wijziging laten we het in de app weten. Deze versie is van ${LAATST_BIJGEWERKT}.`,
        },
        {
          type: "alinea",
          text: "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen leggen we voor aan de bevoegde Nederlandse rechter, tenzij de wet een andere rechter voorschrijft.",
        },
      ],
    },
  ],
};
