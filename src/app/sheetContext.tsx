import { createContext, useContext } from "react";

export interface SheetActions {
  /** Opens the add-task sheet; pass a roomId to preselect that room. */
  openAddTask: (roomId?: string) => void;
  /** Opens the add-boodschap sheet (title + aantal/eenheid/categorie + snelkeuzes). */
  openAddBoodschap: () => void;
  openEditTask: (taskId: string) => void;
  openNewRoom: () => void;
  openEditRoom: (roomId: string) => void;
  openNewRoutine: () => void;
  openEditRoutine: (bundleId: string) => void;
  openHousehold: () => void;
  openProfiel: () => void;
}

export const SheetContext = createContext<SheetActions | null>(null);

export function useSheets(): SheetActions {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheets must be used within SheetContext.Provider");
  return ctx;
}
