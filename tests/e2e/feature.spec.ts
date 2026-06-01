import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/** Read the aggregate "still" count rendered on a peer's dashboard. */
async function stillCount(page: Page): Promise<number> {
  const txt = await page.locator(".silence-aggregate-num").innerText();
  return Number(txt.trim());
}

/** Dispatch a synthetic high-jerk DeviceMotionEvent so the feature's real
 * `devicemotion` listener flips this phone from "still" to "moving". The
 * listener computes jerk = |Δacceleration| between consecutive events, so we
 * send a zero baseline then a large jump. This is the genuine sensor code
 * path — no stub — and it mutates the same Yjs awareness field the aggregate
 * reads from, so the change must cross the mesh to the other peer. */
async function makeMoving(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(
      new DeviceMotionEvent("devicemotion", {
        acceleration: { x: 0, y: 0, z: 0 },
      } as DeviceMotionEventInit),
    );
    window.dispatchEvent(
      new DeviceMotionEvent("devicemotion", {
        acceleration: { x: 80, y: 80, z: 80 },
      } as DeviceMotionEventInit),
    );
  });
}

/** Dispatch two identical DeviceMotionEvents so jerk = 0 < threshold and the
 * phone flips back to "still" — the symmetric counterpart to makeMoving. */
async function makeStill(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (let i = 0; i < 2; i++) {
      window.dispatchEvent(
        new DeviceMotionEvent("devicemotion", {
          acceleration: { x: 5, y: 5, z: 5 },
        } as DeviceMotionEventInit),
      );
    }
  });
}

/**
 * Load-bearing cross-peer test for the advertised core action.
 *
 * Advertised: "group meditation timer; phones detect stillness via
 * accelerometer and aggregate the count anonymously. The aggregate 'X / N
 * still right now' is the only public signal." The accelerometer IS drivable
 * headlessly via a synthetic DeviceMotionEvent, which the feature listens for
 * — so we drive the REAL sensor path, not a stub.
 *
 * Two peers join. Each phone defaults to "still", so both dashboards read
 * "2 / 2 still". We then dispatch a high-jerk DeviceMotionEvent on peer A; A's
 * accelerometer handler sets its awareness `silence.still = false`, which must
 * propagate so that peer B's aggregate drops to "1 / 2". That falling count on
 * the OPPOSITE peer is the assertion — it proves one phone's stillness state
 * genuinely crosses the mesh into the shared count.
 */
test("one phone going non-still drops the shared still-count on the other peer", async ({
  browser,
  baseURL,
}) => {
  const roomId = `e2e-${Math.random().toString(36).slice(2, 8)}`;
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix,
    roomId,
  });
  try {
    await a.locator("button.silence-arm-button").click();
    await b.locator("button.silence-arm-button").click();

    // Both phones are still by default → each dashboard aggregates 2 / 2 still.
    await expect(a.locator(".silence-aggregate-num")).toHaveText("2", { timeout: 10_000 });
    await expect(b.locator(".silence-aggregate-num")).toHaveText("2", { timeout: 10_000 });
    expect(await stillCount(a)).toBe(2);
    expect(await stillCount(b)).toBe(2);

    // Drive peer A's real accelerometer handler to "moving".
    await makeMoving(a);

    // THE load-bearing cross-peer assertion: peer B's shared aggregate must
    // fall to 1 still — A's non-still state crossed the mesh. (Awareness is
    // re-published on a 1 s tick, so allow a few seconds.)
    await expect(b.locator(".silence-aggregate-num")).toHaveText("1", { timeout: 10_000 });
    // The room still reports 2 phones present — the count dropped, not a peer.
    await expect(b.locator(".silence-hud")).toContainText("2 phones in room");

    // Live, not one-shot: peer A settles back to still and peer B's shared
    // count must climb back to 2. This proves the awareness signal tracks the
    // sensor state continuously across the mesh, not just a single drop event.
    await makeStill(a);
    await expect(b.locator(".silence-aggregate-num")).toHaveText("2", { timeout: 10_000 });
  } finally {
    await cleanup();
  }
});
