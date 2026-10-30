// The live-update subscriptions in src/lib/customers.js, against a fake
// Supabase client: channel naming, catching up, and replacing failed channels.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { channels } = vi.hoisted(() => ({ channels: [] }));

vi.mock("../../src/supabaseClient", () => ({
  supabase: {
    channel(name) {
      const ch = {
        name,
        removed: false,
        on: () => ch,
        subscribe(callback) {
          ch.setStatus = callback;
          return ch;
        },
      };
      channels.push(ch);
      return ch;
    },
    removeChannel(ch) {
      ch.removed = true;
    },
  },
}));

const { subscribeToAllCustomers, subscribeToMyCustomer } = await import("../../src/lib/customers.js");

let onChange;

beforeEach(() => {
  channels.length = 0;
  onChange = vi.fn();
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const comeToForeground = () => document.dispatchEvent(new Event("visibilitychange"));

describe("live customer updates", () => {
  it("catch up once the channel is connected", () => {
    subscribeToMyCustomer("user-1", onChange);
    expect(onChange).not.toHaveBeenCalled();
    channels[0].setStatus("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("give every channel its own name, so a new subscription never gets an old channel back", () => {
    const unsubscribe = subscribeToMyCustomer("user-1", onChange);
    unsubscribe();
    subscribeToMyCustomer("user-1", onChange);
    expect(channels).toHaveLength(2);
    expect(channels[0].removed).toBe(true);
    expect(channels[1].name).not.toBe(channels[0].name);
    expect(channels[1].removed).toBe(false);
  });

  it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])("replace a channel that reports %s, then catch up", (status) => {
    subscribeToAllCustomers(onChange);
    channels[0].setStatus(status);
    expect(channels).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(channels).toHaveLength(2);
    expect(channels[0].removed).toBe(true);

    channels[1].setStatus("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignore the replaced channel closing", () => {
    subscribeToAllCustomers(onChange);
    channels[0].setStatus("CHANNEL_ERROR");
    vi.advanceTimersByTime(3000);
    channels[0].setStatus("CLOSED"); // the old channel finishing its teardown
    vi.advanceTimersByTime(10000);
    expect(channels).toHaveLength(2);
  });

  it("retry once per failure, not once per status report", () => {
    subscribeToAllCustomers(onChange);
    channels[0].setStatus("CHANNEL_ERROR");
    channels[0].setStatus("CLOSED");
    vi.advanceTimersByTime(3000);
    expect(channels).toHaveLength(2);
  });

  it("catch up when the app comes back to the foreground", () => {
    subscribeToMyCustomer("user-1", onChange);
    document.visibilityState = "hidden";
    comeToForeground();
    expect(onChange).not.toHaveBeenCalled();
    document.visibilityState = "visible";
    comeToForeground();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("stop everything after unsubscribing", () => {
    const unsubscribe = subscribeToMyCustomer("user-1", onChange);
    channels[0].setStatus("CHANNEL_ERROR");
    unsubscribe();
    vi.advanceTimersByTime(10000);
    comeToForeground();
    channels[0].setStatus("SUBSCRIBED");
    expect(channels).toHaveLength(1);
    expect(channels[0].removed).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
