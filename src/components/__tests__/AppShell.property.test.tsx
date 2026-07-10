// Feature: wander-game, Property 24: Responsive layout containment
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as fc from "fast-check";
import { AppShell } from "../AppShell";

/**
 * Validates: Requirements 12.4
 *
 * Property 24: For any viewport width from 320px to 2560px the root shell
 * must not produce horizontal overflow and the primary nav must be present.
 *
 * jsdom does not perform real CSS layout, so we verify the structural
 * guarantees that prevent overflow: the shell element carries
 * `overflowX: hidden` and `maxWidth: 100%`, and the nav is in the DOM.
 */

function renderShell(width: number) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  document.body.style.width = `${width}px`;

  const result = render(
    <MemoryRouter initialEntries={["/world-designer"]}>
      <AppShell />
    </MemoryRouter>
  );
  return result;
}

describe("Property 24: responsive layout containment", () => {
  afterEach(() => {
    document.body.style.width = "";
  });

  it("shell has overflow-x hidden and max-width 100% at every viewport width", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.integer({ min: 320, max: 2560 }), width => {
        const { container, unmount } = renderShell(width);

        const shell = container.firstElementChild as HTMLElement;
        expect(shell).not.toBeNull();

        expect(shell.style.overflowX).toBe("hidden");
        expect(shell.style.maxWidth).toBe("100%");

        const nav = screen.queryByRole("navigation", { name: "primary" });
        expect(nav).not.toBeNull();

        unmount();
      }),
    );
  });
});
