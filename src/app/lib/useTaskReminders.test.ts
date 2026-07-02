import { describe, expect, it } from "vitest";
import { resolveReminderChannel } from "./useTaskReminders";

describe("resolveReminderChannel", () => {
  it("dispatches nothing after the user explicitly disables notifications", () => {
    expect(resolveReminderChannel(true, "granted")).toBe("none");
    expect(resolveReminderChannel(true, "denied")).toBe("none");
  });

  it("uses a browser notification when permission is granted", () => {
    expect(resolveReminderChannel(false, "granted")).toBe("notification");
  });

  it("falls back to an in-app toast when browser notifications are unavailable", () => {
    expect(resolveReminderChannel(false, "default")).toBe("toast");
    expect(resolveReminderChannel(false, "denied")).toBe("toast");
    expect(resolveReminderChannel(false, "unsupported")).toBe("toast");
  });
});
