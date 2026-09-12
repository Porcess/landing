// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteCopy } from "@/content/copy";
import { forgetSignup } from "@/lib/signup";

import { EarlyAccessForm } from "./early-access-form";

function respond(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

async function submit(email: string) {
  const user = userEvent.setup();
  // `type` rejects an empty string, so an empty submission is a bare click.
  if (email.length > 0) {
    await user.type(screen.getByLabelText(siteCopy.form.label), email);
  }
  await user.click(screen.getByRole("button", { name: siteCopy.form.submit }));
}

describe("EarlyAccessForm", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    // jsdom has no `sendBeacon`, so analytics would fall through to `fetch` and
    // every tracked event would be counted as a signup request by the cases
    // below. A real browser has it, so this is the honest environment.
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: () => true,
    });
    // The subscribed state lives at module scope, so it outlives a test unless
    // it is cleared. Without this every case after the first success would
    // render the confirmation instead of the form.
    forgetSignup();
  });

  afterEach(() => {
    // No `globals: true`, so the automatic cleanup is not registered.
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("offers one labelled email field and nothing else to fill in", () => {
    render(<EarlyAccessForm placement="hero" />);

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByLabelText(siteCopy.form.label)).toBeTruthy();
  });

  it("refuses an empty submission without calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EarlyAccessForm placement="hero" />);

    await submit("");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      siteCopy.form.empty,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a malformed address without calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      siteCopy.form.invalid,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirms a new signup and states the discount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(200, { status: "subscribed" })),
    );
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@example.com");

    expect(
      await screen.findByText(siteCopy.form.success.headline),
    ).toBeTruthy();
    expect(screen.getByText(siteCopy.form.success.month)).toBeTruthy();
    expect(screen.queryByText(siteCopy.form.success.duplicate)).toBeNull();
  });

  it("sends the attribution captured from the URL", async () => {
    window.history.replaceState(
      {},
      "",
      "/?utm_source=newsletter&utm_medium=email",
    );
    const sent: { url: string; payload: unknown }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url, payload: JSON.parse(String(init.body)) });
      return respond(200, { status: "subscribed" });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EarlyAccessForm placement="earlyAccess" />);

    await submit("builder@example.com");

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.url).toBe("/early-access");
    expect(sent[0]?.payload).toMatchObject({
      email: "builder@example.com",
      attribution: { utmSource: "newsletter", utmMedium: "email" },
    });
  });

  it("confirms a returning visitor without asking again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(200, { status: "already_subscribed" })),
    );
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@example.com");

    expect(
      await screen.findByText(siteCopy.form.success.duplicate),
    ).toBeTruthy();
  });

  it("offers a retry when the server fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(500, { status: "error" })),
    );
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@example.com");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      siteCopy.form.failed,
    );
    expect(
      screen.getByRole("button", { name: siteCopy.form.submit }),
    ).toHaveProperty("disabled", false);
  });

  it("explains that signups are not connected rather than claiming success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(503, { status: "unconfigured" })),
    );
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@example.com");

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      siteCopy.form.unavailable,
    );
  });

  it("stops asking in every placement once one of them is answered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(200, { status: "subscribed" })),
    );
    render(
      <>
        <EarlyAccessForm placement="hero" />
        <EarlyAccessForm placement="earlyAccess" />
      </>,
    );

    // Both placements are asking to begin with.
    expect(screen.getAllByLabelText(siteCopy.form.label)).toHaveLength(2);

    const hero = document.querySelector("[data-early-access='hero']");
    if (hero === null) {
      throw new Error("expected the hero placement to render");
    }

    const user = userEvent.setup();
    await user.type(
      within(hero as HTMLElement).getByLabelText(siteCopy.form.label),
      "builder@example.com",
    );
    await user.click(within(hero as HTMLElement).getByRole("button"));

    // Both confirmations take over, and no field is left anywhere on the page:
    // the second placement must not ask for an address that was just given.
    await waitFor(() =>
      expect(screen.getAllByText(siteCopy.form.success.headline)).toHaveLength(
        2,
      ),
    );
    expect(screen.queryByLabelText(siteCopy.form.label)).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("writes the answer to storage, so a reload can find it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(200, { status: "subscribed" })),
    );
    render(<EarlyAccessForm placement="hero" />);

    await submit("builder@example.com");
    await screen.findByText(siteCopy.form.success.headline);

    expect(window.localStorage.getItem("porcess.early-access")).toBe(
      "subscribed",
    );
  });

  it("opens already answered for a visitor who has been here before", () => {
    // Seeded after the beforeEach clear, so this is what a returning visitor's
    // browser looks like before the page has run a line of its own.
    window.localStorage.setItem("porcess.early-access", "subscribed");
    render(<EarlyAccessForm placement="hero" />);

    expect(screen.queryByLabelText(siteCopy.form.label)).toBeNull();
    expect(screen.getByText(siteCopy.form.success.headline)).toBeTruthy();
  });
});
