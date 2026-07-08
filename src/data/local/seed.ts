import type { Database } from "../types";

/**
 * First-run seed for `local` mode — mirrors the Figma Make export's
 * INITIAL_ROOMS / INITIAL_TASKS / INITIAL_ROUTINES so the migrated app looks
 * the same on first load. No fabricated completion history is seeded for
 * bundles: density starts honestly at "Pas begonnen" rather than faking a
 * track record that never happened (CLAUDE.md §2, honesty over precision).
 */

const HOUSEHOLD_ID = "household-thuis";
export const LOCAL_USER_ID = "member-bram";
const STEPHANIE_ID = "member-stephanie";

const todayAt = (hours: number, minutes: number): string => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export function seedDatabase(): Database {
  return {
    households: [{ id: HOUSEHOLD_ID, name: "Thuis", timeZone: "Europe/Amsterdam" }],
    members: [
      { id: LOCAL_USER_ID, householdId: HOUSEHOLD_ID, displayName: "Bram", userId: LOCAL_USER_ID },
      { id: STEPHANIE_ID, householdId: HOUSEHOLD_ID, displayName: "Stéphanie" },
    ],
    householdMembers: [
      { userId: LOCAL_USER_ID, householdId: HOUSEHOLD_ID },
    ],
    invites: [],
    rooms: [
      { id: "room-keuken", householdId: HOUSEHOLD_ID, name: "Keuken", iconKey: "utensils", color: "#B8924A" },
      { id: "room-badkamer", householdId: HOUSEHOLD_ID, name: "Badkamer", iconKey: "droplets", color: "#5A8FA8", ownerId: LOCAL_USER_ID },
      { id: "room-woonkamer", householdId: HOUSEHOLD_ID, name: "Woonkamer", iconKey: "sofa", color: "#8B6EA8" },
      { id: "room-slaapkamer", householdId: HOUSEHOLD_ID, name: "Slaapkamer", iconKey: "bed", color: "#496E46" },
    ],
    tasks: [
      { id: "task-1", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Afwas doen", durationMin: 10, planned: true },
      { id: "task-2", householdId: HOUSEHOLD_ID, roomId: "room-woonkamer", title: "Stofzuigen", durationMin: 20, planned: true },
      { id: "task-3", householdId: HOUSEHOLD_ID, roomId: "room-badkamer", title: "Wasmachine aanzetten", durationMin: 5, planned: true },
      { id: "task-4", householdId: HOUSEHOLD_ID, roomId: "room-woonkamer", title: "Planten water geven", durationMin: 5, planned: true },
      { id: "task-5", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Aanrecht afnemen", durationMin: 5, planned: false },
      { id: "task-6", householdId: HOUSEHOLD_ID, roomId: "room-badkamer", title: "Toilet schoonmaken", durationMin: 10, planned: false },
      { id: "task-7", householdId: HOUSEHOLD_ID, roomId: "room-woonkamer", title: "Stof afnemen", durationMin: 15, planned: false },
      { id: "task-8", householdId: HOUSEHOLD_ID, roomId: "room-badkamer", title: "Spiegel schoonmaken", durationMin: 5, planned: false },
      { id: "task-9", householdId: HOUSEHOLD_ID, roomId: "room-slaapkamer", title: "Bed verschonen", durationMin: 15, planned: false },
      { id: "task-10", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Vloer dweilen", durationMin: 15, planned: false },

      // Routine tasks (bundleId groups them; no own status, see selectors.ts)
      { id: "task-r1", householdId: HOUSEHOLD_ID, title: "Bed opmaken", bundleId: "bundle-ochtend", intervalDays: 1, planned: false },
      { id: "task-r2", householdId: HOUSEHOLD_ID, roomId: "room-woonkamer", title: "Planten water geven", bundleId: "bundle-ochtend", intervalDays: 1, planned: false },
      { id: "task-r3", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Keuken resetten", bundleId: "bundle-ochtend", intervalDays: 1, planned: false },
      { id: "task-r4", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Afwas doen", bundleId: "bundle-avond", intervalDays: 1, planned: false },
      { id: "task-r5", householdId: HOUSEHOLD_ID, roomId: "room-keuken", title: "Aanrecht afnemen", bundleId: "bundle-avond", intervalDays: 1, planned: false },
      { id: "task-r6", householdId: HOUSEHOLD_ID, title: "Vuilniszak checken", bundleId: "bundle-avond", intervalDays: 1, planned: false },
      { id: "task-r7", householdId: HOUSEHOLD_ID, roomId: "room-woonkamer", title: "Stofzuigen", bundleId: "bundle-weekend", intervalDays: 7, planned: false },
      { id: "task-r8", householdId: HOUSEHOLD_ID, title: "Dweilen", bundleId: "bundle-weekend", intervalDays: 7, planned: false },
      { id: "task-r9", householdId: HOUSEHOLD_ID, roomId: "room-badkamer", title: "Badkamer grondig", bundleId: "bundle-weekend", intervalDays: 7, planned: false },
      { id: "task-r10", householdId: HOUSEHOLD_ID, title: "Was doen", bundleId: "bundle-weekend", intervalDays: 7, planned: false },
    ],
    completions: [
      { id: "completion-1", taskId: "task-3", completedById: STEPHANIE_ID, completedAt: todayAt(8, 42) },
    ],
    bundles: [
      { id: "bundle-ochtend", householdId: HOUSEHOLD_ID, name: "Ochtendroutine", trigger: "'s ochtends", cadence: "daily", windowLabel: "ochtenden" },
      { id: "bundle-avond", householdId: HOUSEHOLD_ID, name: "Avondroutine", trigger: "'s avonds", cadence: "daily", windowLabel: "avonden" },
      { id: "bundle-weekend", householdId: HOUSEHOLD_ID, name: "Weekend schoonmaak", trigger: "Weekeinde", cadence: "weekly", windowLabel: "weekenden" },
    ],
    shoppingItems: [
      { id: "shopping-1", householdId: HOUSEHOLD_ID, title: "Melk", checked: false, createdAt: todayAt(9, 0) },
      { id: "shopping-2", householdId: HOUSEHOLD_ID, title: "Eieren", quantity: "10", checked: false, createdAt: todayAt(9, 1) },
      { id: "shopping-3", householdId: HOUSEHOLD_ID, title: "Wc-papier", quantity: "1 pak", checked: false, createdAt: todayAt(9, 2) },
      { id: "shopping-4", householdId: HOUSEHOLD_ID, title: "Afwasmiddel", checked: true, createdAt: todayAt(8, 30) },
    ],
  };
}
