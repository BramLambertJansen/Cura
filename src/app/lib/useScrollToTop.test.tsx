// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router";
import { useScrollToTop } from "./useScrollToTop";

/**
 * The ref target is a stub, not a real element: jsdom has no layout, so an
 * element's `scrollTop` setter is a no-op there and the reset would be
 * unobservable. The hook's whole contract is "assign 0 to ref.current.scrollTop
 * when the path changes", which a plain object captures exactly.
 */
type ElRef = { current: HTMLElement | null };

function makeRef(scrollTop: number): ElRef {
  return { current: { scrollTop } as unknown as HTMLElement };
}

function Harness({ elRef }: { elRef: ElRef }) {
  useScrollToTop(elRef);
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/huis/keuken")}>naar kamer</button>
      <button onClick={() => navigate("/huis?taak=abc")}>alleen query</button>
    </>
  );
}

function setup(scrollTop: number) {
  const ref = makeRef(scrollTop);
  render(
    <MemoryRouter initialEntries={["/huis"]}>
      <Harness elRef={ref} />
    </MemoryRouter>,
  );
  return ref;
}

describe("useScrollToTop", () => {
  it("stuurt een nieuwe pagina terug naar boven", async () => {
    const ref = setup(480);
    // Mount itself resets, so prove the *navigation* does it too.
    ref.current!.scrollTop = 480;

    await userEvent.click(screen.getByRole("button", { name: "naar kamer" }));

    expect(ref.current!.scrollTop).toBe(0);
  });

  it("laat de scrollpositie staan als alleen de query verandert", async () => {
    const ref = setup(0);
    // What useTaskDeepLink does: strip ?taak= while the edit sheet is open. The
    // path is unchanged, so the page must not jump out from under the sheet.
    ref.current!.scrollTop = 320;

    await userEvent.click(screen.getByRole("button", { name: "alleen query" }));

    expect(ref.current!.scrollTop).toBe(320);
  });

  it("valt niet om als de container nog niet gemount is", async () => {
    const ref: ElRef = { current: null };
    render(
      <MemoryRouter initialEntries={["/huis"]}>
        <Harness elRef={ref} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "naar kamer" }));

    expect(ref.current).toBeNull();
  });
});
