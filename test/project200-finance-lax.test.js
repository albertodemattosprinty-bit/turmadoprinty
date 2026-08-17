import assert from "node:assert/strict";
import test from "node:test";

import { buildProject200LaxKey, parseProject200LaxKey } from "../src/project200-finance-ledger.js";

test("builds the automatic LAX key from the normalized login", () => {
  assert.equal(buildProject200LaxKey("LucasM"), "lucasm@lax.com");
  assert.equal(buildProject200LaxKey("  João Silva  "), "joão silva@lax.com");
});

test("accepts only the LAX domain and returns the destination login", () => {
  assert.equal(parseProject200LaxKey(" LucasM@LAX.COM "), "lucasm");
  assert.equal(parseProject200LaxKey("lucasm@example.com"), "");
  assert.equal(parseProject200LaxKey("@lax.com"), "");
  assert.equal(parseProject200LaxKey("lucas@extra@lax.com"), "");
});
