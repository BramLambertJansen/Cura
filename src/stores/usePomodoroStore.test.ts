import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// De store roept bij afronden een toast aan en (voor "afvinken") de Cura-store;
// die zijn hier niet relevant, dus we isoleren de tijd-logica.
vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("./useCuraStore", () => ({ useCuraStore: { getState: () => ({ toggleTask: vi.fn() }) } }));

// De testomgeving is `node` (geen DOM). De store leest localStorage al bij import
// (loadInitial), dus installeer een in-memory shim vóór de import — vi.hoisted
// draait vóór alle imports.
vi.hoisted(() => {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  } as Storage;
});

import { usePomodoroStore } from "./usePomodoroStore";

const get = () => usePomodoroStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  localStorage.clear();
  get().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePomodoroStore", () => {
  it("start zet een lopende timer met volledige resterende tijd en een eind-timestamp", () => {
    get().start({ totalSec: 300 });
    const s = get();
    expect(s.status).toBe("running");
    expect(s.phase).toBe("focus");
    expect(s.remainingSec).toBe(300);
    expect(s.totalSec).toBe(300);
    expect(s.endsAt).toBe(300_000);
  });

  it("tick leidt de resterende tijd af van endsAt", () => {
    get().start({ totalSec: 300 });
    vi.setSystemTime(10_000);
    get().tick();
    expect(get().remainingSec).toBe(290);
  });

  it("pause behoudt de resterende tijd; resume telt vanaf nu verder", () => {
    get().start({ totalSec: 300 });
    vi.setSystemTime(60_000);
    get().pause();
    expect(get().status).toBe("paused");
    expect(get().endsAt).toBeNull();
    expect(get().remainingSec).toBe(240);

    // Tijd verstrijkt terwijl gepauzeerd — mag niet meetellen.
    vi.setSystemTime(120_000);
    get().resume();
    expect(get().status).toBe("running");
    expect(get().endsAt).toBe(120_000 + 240_000);
  });

  it("addTime verlengt zowel resterend als totaal", () => {
    get().start({ totalSec: 300 });
    get().addTime(300);
    expect(get().remainingSec).toBe(600);
    expect(get().totalSec).toBe(600);
    expect(get().endsAt).toBe(600_000);
  });

  it("valt naar idle terug wanneer de tijd verstreken is", () => {
    get().start({ totalSec: 5 });
    vi.setSystemTime(6_000);
    get().tick();
    expect(get().status).toBe("idle");
    expect(get().remainingSec).toBe(0);
  });

  it("herstelt een lopende timer uit localStorage met herberekende tijd", () => {
    get().start({ totalSec: 300 });
    // Bewaarde staat: endsAt = 300_000. Herlaad 'na' 30s.
    vi.setSystemTime(30_000);
    // De persistente laag is al geschreven; boots een reload na door een verse
    // instantie te lezen zoals loadInitial dat doet.
    const raw = localStorage.getItem("cura:focus-timer");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.status).toBe("running");
    expect(parsed.endsAt).toBe(300_000);
  });
});
