export type CuraIconName =
  | "today" | "home" | "tasks" | "routines" | "together"
  | "my-tasks" | "all-tasks" | "planning" | "reminder" | "priority" | "progress"
  | "habit" | "category" | "groceries" | "settings" | "more"
  | "back" | "close" | "save" | "edit" | "delete";

/** Cura Icons font glyph — decorative by default, action meaning comes from the surrounding button's aria-label (CLAUDE.md §6). */
export function CuraIcon({
  name, size = 18, className = "",
}: { name: CuraIconName; size?: number; className?: string }) {
  return <span aria-hidden="true" className={`cura-icon ci-${name} ${className}`} style={{ fontSize: size }} />;
}
