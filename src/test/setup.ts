import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Global test setup.
 *
 * Two jobs, both of which exist because of bugs that reached production while
 * the suite was "fully green":
 *
 * 1. jest-dom matchers, so a test can assert on what the USER sees
 *    (toBeInTheDocument, toHaveTextContent) rather than on component internals.
 *    Asserting on rendered text is what catches a missing translation key — the
 *    UI renders the raw key string, and only the rendered output shows it.
 *
 * 2. Automatic unmount. Without it a test that renders a dialog leaves it
 *    mounted, and the next test's queryByText finds the previous test's nodes —
 *    which produces failures that pass on a re-run and fail on a clean one.
 */
afterEach(() => {
  cleanup();
});

/**
 * Radix's Dialog renders into a portal and reads `matchMedia`, which jsdom does
 * not implement. Any component test touching Dialog/Sheet/Popover fails without
 * this, with an error that points at the component rather than at jsdom.
 */
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // Radix checks for these during focus management.
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
}
