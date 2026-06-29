# Cura — Wireframe-brief voor Claude Design

> Een kalme, gedeelde huishoud-planner voor twee mensen. Deze brief beschrijft wát te ontwerpen, in welke toon, en — net zo belangrijk — wat juist níét. Lees de filosofie en de "Ontwerp dit niet"-sectie voordat je schermen tekent; ze sturen elke keuze.

---

## 1. Wat Cura is

Cura helpt een huishouden van twee mensen (uitbreidbaar naar meer) om het huishouden gedaan te krijgen, routines op te bouwen, en van elkaar te weten wat er al gedaan is. Het is geen schoonmaak-tracker en geen productiviteits-app met scoreborden. Het is een rustige plek die de mentale last van "wie doet wat en wanneer" wegneemt.

**Drie pijlers, elk een andere tijdshorizon:**

1. **Planner — vandaag.** "Wat ga ik nu doen." Kort, actiegericht. Dit is de thuisbasis.
2. **Routines — de terugkerende structuur.** Taken met een ritme, en bundels van taken ("ochtendroutine"). Hier leeft de gewoontevorming.
3. **Zichtbaarheid — de ander.** Een afgevinkte taak is een *bericht*, geen logboek: "ik heb de keuken al gedaan, jij hoeft niet te kijken." Dit is het bestaansrecht van de gedeelde versie.

**Toon:** kalm, warm, vergevingsgezind. De app moet aanvoelen als ademruimte, niet als een takenlijst die je toeschreeuwt. Empathisch zonder zweverig te zijn.

---

## 2. Ontwerpprincipes (deze sturen elke wireframe)

- **Eén tik om af te vinken.** De kern-interactie is een taak afvinken. Dat moet de lichtste, meest bevredigende handeling in de hele app zijn. Geen modals, geen bevestigingen, geen verplichte velden achteraf.
- **Eerlijkheid boven precisie.** Geen enkel cijfer dat een nauwkeurigheid claimt die de data niet waarmaakt. Liever "badkamer is waarschijnlijk weer toe aan een beurt" dan "73% schoon".
- **Degradeert netjes met halve data.** De app werkt óók als je een paar dagen niets invoert. Niets gaat "kapot" of "op nul" door een gemiste dag.
- **Geen competitie tussen huisgenoten.** Nul wie-doet-meer-metrics. De gedeelde taak is van het huishouden, niet van een persoon-met-een-score.
- **Ademende lay-out.** Veel witruimte, zachte kaarten, ronde hoeken, rustige typografie. Inhoud krijgt lucht.

**Visuele richting** (low-to-mid fidelity wireframes; structuur eerst, maar in deze sfeer):
- Warm off-white / cream achtergrond.
- Eén zacht accent: sage / olijfgroen. Spaarzaam ingezet (actieve nav, primaire actie, afgevinkt-status).
- Zachte schaduwen, afgeronde kaarten, generieuze padding.
- Rustige iconografie met dunne lijnen.
- Kamers mogen een sfeerfoto dragen (zoals in de referentie), de rest blijft tekstueel en kalm.
- Typografie: een vriendelijke, leesbare set. Koppen warm en menselijk ("Goedemorgen"), geen schreeuwerige hoofdletters.

---

## 3. Informatie-architectuur & navigatie

Bottom-nav met de drie pijlers plus het huis-overzicht. Een drijvende **+**-knop (FAB) centraal voor snel toevoegen.

| Tab | Naam | Doel |
|-----|------|------|
| 1 | **Vandaag** | Planner-thuisbasis: jouw dag, gepland. Zichtbaarheid licht ingebed. |
| 2 | **Huis** | De gedeelde pool, georganiseerd per kamer. Alle openstaande taken + intervallen. |
| 3 | **Routines** | Terugkerende structuur + bundels + zachte dichtheid-feedback. |
| 4 | **Samen** | Zichtbaarheids-hub: wat is er gedaan, door wie. De gedeelde-waarde-view. |
| (+) | **Toevoegen** | Snel een taak toevoegen; later ook AI-invoer (natuurlijke taal). |

> **Insights/AI** is geen eigen tab in de eerste versies — AI komt later, primair als invoer-hulp (zie §4.7), niet als een aparte suggesties-feed.

---

## 4. Schermen

Voor elk scherm: het doel, de belangrijkste elementen (van boven naar onder), en relevante states. De fase-tag geeft aan wanneer het scherm nodig is (zie §7).

### 4.1 Vandaag — planner-thuisbasis · `Fase 1`

Het eerste wat je ziet. Antwoordt op: "wat ga ik nu doen?"

- **Header:** warme begroeting met dagdeel ("Goedemorgen") + een korte, zachte ondertitel die wisselt ("Rustig aan, stap voor stap"). Géén cijfers in de header.
- **Mijn dag:** de geplande taken voor vandaag, als afvinkbare regels. Elke regel: titel, kamer-label, geschatte duur, ronde checkbox. Eén tik vinkt af; afgevinkt = zachte doorhaling + groen vinkje, blijft zichtbaar (niet weggemoffeld).
- **Routines van vandaag:** de routines die vandaag aan de beurt zijn, compact (zie §4.3 voor hun gedrag). Zacht, geen harde "voltooid/mislukt".
- **Wat de ander deed (zichtbaarheid, ingebed):** een rustig strookje — "Sanne heeft de planten water gegeven" — zodat je niet dubbel werk doet. Klein, niet dominant.
- **Empty state:** als er niets gepland is → uitnodigende, rustige leegte. "Niets op de planning. Geniet ervan, of voeg iets toe." Niet alarmerend.

### 4.2 Huis — de pool per kamer · `Fase 1`

De gedeelde voorraad aan taken, geordend per kamer. Antwoordt op: "wat moet er in huis gebeuren, en wat is weer toe?"

- **Header:** "Huis" + zachte ondertitel.
- **Kamer-kaarten** (Keuken, Badkamer, Woonkamer, Slaapkamer, …): elke kaart toont
  - kamernaam + (optioneel) sfeerfoto,
  - aantal openstaande taken,
  - een **zachte interval-hint** in plaats van een hard tijdstempel: "waarschijnlijk weer toe" / "nog even goed" — afgeleid van het interval-model, niet van een exacte "laatst gedaan om 8:30"-claim.
- **Kamer-detail (sub-scherm):** taken binnen die kamer als pool-lijst. Per taak: titel, duur, ritme-indicatie (indien aanwezig), en de **claim-actie** ("Ik pak dit"). Geclaimde taken tonen subtiel wie ze pakte.
- **Verdeling per gebied (zacht):** kamers mogen een losse voorkeurs-eigenaar dragen ("Badkamer — meestal Bram") als conventie, nooit als harde toewijzing of slot. Het blijft een pool; iedereen mag alles pakken.
- **Empty state per kamer:** "Hier is alles bij. Niks te doen."

### 4.3 Routines — ritme & bundels · `Fase 2`

Terugkerende structuur + de gewoonte-laag. Twee onafhankelijke concepten, bewust uit elkaar gehouden:

- **Ritme** = een taak die terugkomt ("elke 3 dagen", "elke maandag", "elke avond").
- **Bundel** = meerdere taken die als één moment samenkomen ("Ochtend: bed opmaken + planten water + keuken resetten").

Schermopbouw:
- **Routine-lijst:** elke routine (= bundel) als kaart met naam, trigger-moment ("'s ochtends"), en de onderliggende taken.
- **Dichtheid-feedback (zacht!):** toon een **ratio over een voortschrijdend venster** — "11 van de afgelopen 14 ochtenden" — eventueel met één zachte kwalitatieve zin ("zit lekker in je ritme" / "het glipt er de laatste tijd uit"). 
  - **Geen** oplopend keten-getal. **Geen** "huidige streak: 0". **Geen** percentage-badge.
  - Gedeeltelijke voortgang telt: 2 van de 3 taken gedaan = gedeeltelijk gevuld, geen "gebroken".
- **Routine-detail:** de taken in de bundel, elk los afvinkbaar. "Routine af" is *afgeleid* (alle taken gevinkt), wordt nergens als aparte status opgeslagen — toon het als een rustige vervulling, niet als een trofee.

### 4.4 Samen — zichtbaarheids-hub · `Fase 3`

De view die de gedeelde versie bestaansrecht geeft. Antwoordt op: "wat is er vandaag in huis gedaan, en door wie?"

- **Vandaag in huis:** een rustige, chronologische lijst van afgevinkte taken met wie + wanneer. Feitelijk, niet competitief — een verslag, geen ranglijst.
- **Bewust géén** totalen-per-persoon, géén "jij 7 / Sanne 4", géén balk-vergelijking. (Zie §6.)
- **Huishouden-instellingen-ingang:** leden, de invite-flow (§4.6), en de naam van het huishouden.
- **Empty state:** "Nog niks gedaan vandaag. De dag is jong."

### 4.5 Taak toevoegen (FAB) · `Fase 1`

Snel en wrijvingsarm. Opent als een licht vel (bottom sheet), niet een volledig formulier-scherm.

- Eén prominent invoerveld: taaknaam.
- Optioneel en inklapbaar: kamer, geschatte duur, ritme (eenmalig vs. terugkerend), bundel.
- Standaard belandt de taak in de **gedeelde pool** (niet toegewezen).
- Toevoegen = één tik klaar; de optionele velden mogen leeg blijven.

### 4.6 Onboarding & invite-flow · `Fase 3`

Bewust simpel — dit gebruik je letterlijk één keer.

- **Onboarding (eerste keer):** korte, warme intro van de drie pijlers (max 2-3 schermen), dan huishouden aanmaken (naam + eventueel een paar kamers).
- **Uitnodigen:** genereer een deelbare link/code → deel via WhatsApp/bericht (géén e-mailverzending nodig). 
- **Accepteren:** de ander opent de link, ziet "Je bent uitgenodigd voor [huishouden]", tikt accepteren.
- **Cap op één huishouden:** als iemand al lid is, toon rustig "Je zit al in een huishouden" in plaats van een tweede toe te voegen. (Dit is een app-regel, niet een fout — toon het vriendelijk.)
- **Lokale modus (single-device):** invite-knop is uitgeschakeld/verborgen; er is impliciet één huishouden met jou erin. Toon dit niet als gebrek, gewoon als de solo-staat.

### 4.7 AI-invoer · `Fase 4`

AI zit aan de *invoer*-kant, niet als een aparte suggesties-feed. Het verlaagt invoer-wrijving in plaats van ruis toe te voegen.

- Bereikbaar vanuit de **+** (een "vertel het gewoon"-modus) of een apart invoerveld.
- Natuurlijke taal in → de app leidt af wat er gebeurd is en past data aan:
  - *"Ik heb het hele weekend opgeruimd, ben kapot"* → relevante taken op gedaan zetten, intervallen bijwerken, planning verzachten.
  - *"Verplaats stofzuigen naar morgenochtend"* → herplannen.
- Toon altijd wat de AI gaat doen vóór het toepassen (een rustige bevestiging), zodat het nooit ongevraagd je huishouden herschrijft.
- Plus: de zachte kwalitatieve zinnetjes elders in de app (§4.3) mogen hier vandaan komen.

> Ontwerp voor Fase 4 alleen het *invoer-moment* en de *bevestiging* — geen dashboard vol AI-kaarten zoals in de oorspronkelijke referentie.

---

## 5. Kern-flows om uit te werken

Wireframe deze flows als korte sequenties, niet alleen losse schermen:

1. **Afvinken** (de hartslag): tik op taak in Vandaag → zachte vinkje-animatie → verschijnt direct in Samen voor de ander. Geen tussenstappen.
2. **Claimen:** open kamer in Huis → "Ik pak dit" op een pool-taak → taak toont subtiel jouw naam → reminder/aandacht gaat naar jou.
3. **Taak toevoegen:** FAB → naam intikken → klaar (optionele velden overslaan).
4. **Routine opbouwen:** Routines → nieuwe routine → naam + trigger-moment → taken toevoegen aan de bundel.
5. **Onboarding + uitnodigen:** intro → huishouden maken → link delen → ander accepteert.
6. **AI-invoer:** + → natuurlijke zin → app toont voorgestelde wijzigingen → bevestigen.

---

## 6. Ontwerp dit NIET (anti-patronen — belangrijk)

Deze kwamen expliciet uit het concept-gesprek. Ze ondermijnen de toon of de relatie als ze terugsluipen:

- ❌ **Geen "Home peace 78%"** of welk vaag samenvattend percentage dan ook. Valse precisie.
- ❌ **Geen harde streaks** ("12 dagen op rij!", "streak verbroken"). Gebruik ratio-over-venster.
- ❌ **Geen wie-doet-meer-scoreborden, bijdrage-percentages of persoon-vs-persoon-balken.** Relatie-gif.
- ❌ **Geen exacte "laatst schoongemaakt om 8:30"-claims** als ruggengraat. Gebruik zachte interval-hints; een exact tijdstip mag hooguit secundair en optioneel zijn.
- ❌ **Geen verplichte toewijzing** van taken aan personen. Pool eerst, claim is optioneel.
- ❌ **Geen administratie-achteraf** als hoofdmechaniek ("registreer wat je deed"). Afvinken vloeit uit het plannen.
- ❌ **Geen feed vol AI-suggestiekaarten** met Accept/Adjust/Ignore-knoppen als centrale feature (zoals de oorspronkelijke referentie). AI is invoer-hulp, geen suggestie-spam.
- ❌ **Geen alarmerende lege staten of rode "achterstallig"-waarschuwingen.** Kalm blijven, ook als er veel openstaat.

---

## 7. Fasering — in deze volgorde wireframen

Elke fase test één ding. Wireframe gefaseerd zodat je niet alles tegelijk hoeft uit te denken.

| Fase | Schermen | Wat het test |
|------|----------|--------------|
| **1 — Planner (solo, lokaal)** | Vandaag (4.1), Huis (4.2), Taak toevoegen (4.5) | Plakt het plan-en-afvink-ritme voor één persoon? |
| **2 — Routines & dichtheid** | Routines (4.3) | Motiveert de zachte gewoonte-feedback zonder administratie te worden? |
| **3 — Zichtbaarheid & samen** | Samen (4.4), Onboarding & invite (4.6), claim-flow | Werkt de gedeelde dynamiek + coördinatie? |
| **4 — AI als invoer** | AI-invoer (4.7) | Verlaagt natuurlijke-taal-invoer de wrijving echt? |

> **Let op bij het wireframen:** houd Fase 1–2 bewust kort en ruw — niet polijsten. De gedeelde dynamiek (Fase 3) is het bestaansrecht; daar mag de meeste ontwerp-zorg heen.

---

## 8. Microcopy-toon (voorbeelden om de stem te ijken)

- Begroeting: "Goedemorgen" / "Rustig aan vandaag."
- Lege dag: "Niets op de planning. Geniet ervan."
- Interval-hint: "Badkamer is waarschijnlijk weer toe." (niet: "5 dagen geleden")
- Routine-dichtheid: "Zit lekker in je ritme — 11 van de 14 ochtenden." (niet: "streak: 11")
- Al-lid: "Je zit al in een huishouden." (vriendelijk, niet als fout)
- Zichtbaarheid: "Sanne heeft de keuken gedaan." (feitelijk, geen score)

UI-taal: **Nederlands** (de app is voor jullie tweeën). Makkelijk te vertalen als je later wisselt.

---

*Vat dit op als richting, niet als wet. De principes (§2) en de anti-patronen (§6) zijn het hardst; de exacte schermindeling mag je vrij interpreteren zolang de toon en de drie pijlers overeind blijven.*