#!/usr/bin/env node
// smoke_test.mjs
// Simple smoke tests for the RacketApp API. Usage:
//   API_URL=https://your-api-url node smoke_test.mjs

import fetch from "node-fetch";

const API_URL =
  process.env.API_URL || process.env.SMOKE_API_URL || "http://localhost:4001";
console.log("Running smoke tests against", API_URL);

function fail(msg, code = 1) {
  console.error("✖", msg);
  process.exit(code);
}

async function ok(res, name) {
  if (!res) return fail(`${name}: no response`);
  if (!res.ok) return fail(`${name}: HTTP ${res.status} - ${await res.text()}`);
}

async function main() {
  try {
    // health
    const h = await fetch(`${API_URL.replace(/\/$/, "")}/health`);
    await ok(h, "/health");
    console.log("✔ /health ok");

    // list matches (should be 200)
    const l = await fetch(`${API_URL.replace(/\/$/, "")}/matches`);
    await ok(l, "GET /matches");
    const list = await l.json();
    console.log(
      `✔ GET /matches -> ${Array.isArray(list) ? list.length : "ok"}`
    );

    // create a match
    const payload = {
      sportType: "TENNIS",
      format: "SINGLE_SET",
      players: { p1: "smoke_p1", p2: "smoke_p2" },
      nickname: `smoke-${Date.now()}`,
    };
    const c = await fetch(`${API_URL.replace(/\/$/, "")}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await ok(c, "POST /matches");
    const created = await c.json();
    console.log("✔ POST /matches -> created id", created.id);

    // fetch state
    const s = await fetch(
      `${API_URL.replace(/\/$/, "")}/matches/${created.id}/state`
    );
    await ok(s, `GET /matches/${created.id}/state`);
    const state = await s.json();
    console.log("✔ GET state ok");

    // patch state (viewLog) to ensure PATCH works
    const ms = state.matchState || {};
    ms.smokeTest = true;
    const p = await fetch(
      `${API_URL.replace(/\/$/, "")}/matches/${created.id}/state`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchState: ms }),
      }
    );
    await ok(p, `PATCH /matches/${created.id}/state`);
    console.log("✔ PATCH state ok");

    console.log("\nALL SMOKE TESTS PASSED");
    process.exit(0);
  } catch (err) {
    console.error("Smoke test failed", err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
