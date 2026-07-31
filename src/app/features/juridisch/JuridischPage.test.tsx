// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PrivacyPage } from "./PrivacyPage";
import { VoorwaardenPage } from "./VoorwaardenPage";
import { PRIVACY, VOORWAARDEN, CONTACT_EMAIL, LAATST_BIJGEWERKT } from "./juridischContent";

/**
 * Smoketests voor de juridische pagina's. Geen store, geen auth: dat is precies
 * het punt — deze pagina's moeten zonder account renderen (ze staan buiten de
 * Gate in App.tsx). Ze bewaken verder dat elke sectie uit het contentmodel ook
 * echt als kop op het scherm belandt, zodat een uitgebreide tekst niet stil
 * half wegvalt.
 */

describe("PrivacyPage", () => {
  it("rendert elke sectie als kop, plus de datum en het contactkanaal", () => {
    render(<MemoryRouter initialEntries={["/privacy"]}><PrivacyPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: PRIVACY.titel })).toBeInTheDocument();
    for (const sectie of PRIVACY.secties) {
      expect(screen.getByRole("heading", { level: 2, name: sectie.titel })).toBeInTheDocument();
    }
    // Staat er twee keer: in de kop en in de "Wijzigingen"-sectie.
    expect(screen.getAllByText(new RegExp(LAATST_BIJGEWERKT)).length).toBeGreaterThan(0);
    // Het AVG-verzoekkanaal moet vindbaar zijn, niet alleen in de broncode staan.
    expect(screen.getAllByText(new RegExp(CONTACT_EMAIL)).length).toBeGreaterThan(0);
  });

  it("verwijst door naar de voorwaarden", () => {
    render(<MemoryRouter initialEntries={["/privacy"]}><PrivacyPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /voorwaarden/i })).toBeInTheDocument();
  });
});

describe("VoorwaardenPage", () => {
  it("rendert elke sectie als kop", () => {
    render(<MemoryRouter initialEntries={["/voorwaarden"]}><VoorwaardenPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: VOORWAARDEN.titel })).toBeInTheDocument();
    for (const sectie of VOORWAARDEN.secties) {
      expect(screen.getByRole("heading", { level: 2, name: sectie.titel })).toBeInTheDocument();
    }
  });
});
