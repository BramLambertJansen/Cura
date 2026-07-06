// Vite's `?raw` import suffix returns a module's contents as a string. Used by
// the reminder-engine drift guard (src/data/reminders.test.ts) to compare the
// app copy against the byte-identical edge-function copy.
declare module "*?raw" {
  const content: string;
  export default content;
}
