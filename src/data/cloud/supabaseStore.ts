import type { DataStore } from "../store";

/**
 * Phase 3 placeholder. Supabase (auth, Postgres, RLS, realtime) is out of
 * scope until the shared dynamic (Samen, invites, push) is being built —
 * see CLAUDE.md §13. This stub exists only so `createDataStore()` type-checks
 * for `VITE_DATA_MODE=cloud` without pulling Phase 3 work forward.
 */
export class SupabaseStore implements DataStore {
  readonly mode = "cloud" as const;

  constructor() {
    throw new Error("Cloud mode (Supabase) isn't implemented yet — that's Phase 3. Use VITE_DATA_MODE=local.");
  }

  currentUserId: DataStore["currentUserId"] = () => {
    throw new Error("not implemented");
  };
  getHouseholdsForUser: DataStore["getHouseholdsForUser"] = () => {
    throw new Error("not implemented");
  };
  listMembers: DataStore["listMembers"] = () => {
    throw new Error("not implemented");
  };
  createInvite: DataStore["createInvite"] = () => {
    throw new Error("not implemented");
  };
  acceptInvite: DataStore["acceptInvite"] = () => {
    throw new Error("not implemented");
  };
  listRooms: DataStore["listRooms"] = () => {
    throw new Error("not implemented");
  };
  createRoom: DataStore["createRoom"] = () => {
    throw new Error("not implemented");
  };
  updateRoom: DataStore["updateRoom"] = () => {
    throw new Error("not implemented");
  };
  deleteRoom: DataStore["deleteRoom"] = () => {
    throw new Error("not implemented");
  };
  listTasks: DataStore["listTasks"] = () => {
    throw new Error("not implemented");
  };
  createTask: DataStore["createTask"] = () => {
    throw new Error("not implemented");
  };
  updateTask: DataStore["updateTask"] = () => {
    throw new Error("not implemented");
  };
  deleteTask: DataStore["deleteTask"] = () => {
    throw new Error("not implemented");
  };
  claimTask: DataStore["claimTask"] = () => {
    throw new Error("not implemented");
  };
  completeTask: DataStore["completeTask"] = () => {
    throw new Error("not implemented");
  };
  uncompleteTask: DataStore["uncompleteTask"] = () => {
    throw new Error("not implemented");
  };
  listCompletions: DataStore["listCompletions"] = () => {
    throw new Error("not implemented");
  };
  listBundles: DataStore["listBundles"] = () => {
    throw new Error("not implemented");
  };
  createBundle: DataStore["createBundle"] = () => {
    throw new Error("not implemented");
  };
  updateBundle: DataStore["updateBundle"] = () => {
    throw new Error("not implemented");
  };
  deleteBundle: DataStore["deleteBundle"] = () => {
    throw new Error("not implemented");
  };
}
