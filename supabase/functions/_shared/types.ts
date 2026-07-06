// Minimal structural mirror of the fields src/data/reminders.ts reads, so the
// byte-identical shared copy of that engine (./reminders.ts) resolves its
// `import type { Task, TaskCompletion } from "./types"` in Deno without pulling
// zod / the full domain (src/data/types.ts). Type-only — erased at bundle time.

export interface Task {
  id: string;
  title: string;
  intervalDays?: number;
  dueDate?: string;
}

export interface TaskCompletion {
  taskId: string;
  completedAt: string;
}
