// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteCopy } from "@/content/copy";

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

  it("confirms a new signup and states the free month", async () => {
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
    render(<EarlyAccessForm placement="final" />);

    await submit("builder@example.com");

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.url).toBe("/early-access");
    expect(sent[0]?.payload).toMatchObject({
      email: "builder@example.com",
      attribution: { utmSource: "newsletter", utmMedium: "email" },
    });
  });

  it("tells a returning visitor they were already on the list", async () => {
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
});
