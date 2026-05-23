// Sidecar live layer for the unsyphn-app demo.
// Loaded AFTER the React/Babel pipeline finishes hydrating. Polls for the
// FleetStats cards (rendered by shared.jsx), fetches the Redline dashboard
// summary, and patches the matching stat-val numbers in place — without
// touching any JSX file.
//
// Strict contract:
//   * No edits to any .jsx file.
//   * Silent no-op if API unreachable or shape mismatched.
//   * One window event emitted: `redline:live-summary` carrying the parsed body.
//   * One window event emitted on failure: `redline:live-summary-error`.
//
// API base + bearer are read from <meta> tags so the same script works in
// dev (localhost:8787) and on Vercel (proxied /v1).

(function () {
  "use strict";

  function metaValue(name, fallback) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el && el.content ? el.content : fallback;
  }

  var API_BASE = metaValue("redline-api-base", "");
  var BEARER = metaValue("redline-bearer", "demo_token_acme_corp_2026");
  var SUMMARY_URL = (API_BASE || (typeof window !== "undefined" && window.location.origin) || "").replace(/\/+$/, "") + "/v1/dashboard/summary";

  // Format helpers — keep numbers terse so they fit the existing tile size.
  function compactUsd(value) {
    if (value == null || isNaN(value)) return null;
    if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (value >= 1_000) return "$" + Math.round(value / 1_000) + "k";
    return "$" + Math.round(value);
  }

  function findStatByLabel(label) {
    var nodes = document.querySelectorAll(".fleet .stat");
    for (var i = 0; i < nodes.length; i++) {
      var lbl = nodes[i].querySelector(".stat-label");
      if (lbl && lbl.textContent.trim().toLowerCase() === label.toLowerCase()) {
        return nodes[i];
      }
    }
    return null;
  }

  function setVal(card, value) {
    if (!card || value == null) return false;
    var v = card.querySelector(".stat-val");
    if (!v) return false;
    v.textContent = String(value);
    card.setAttribute("data-live", "1");
    return true;
  }

  function setSub(card, value) {
    if (!card || !value) return;
    var s = card.querySelector(".stat-sub");
    if (s) s.textContent = value;
  }

  // The mapping is intentionally narrow — only patch values we can prove from
  // the API. Unknown stats keep their hardcoded demo defaults.
  function applySummary(summary) {
    if (!summary || typeof summary !== "object") return 0;
    var patched = 0;

    var vendors = findStatByLabel("Vendors");
    if (vendors && setVal(vendors, summary.vendorCount)) {
      var rr = compactUsd(summary.annualRunRateUsd);
      if (rr) setSub(vendors, "live · " + rr + " run-rate");
      patched += 1;
    }

    var openChanges = findStatByLabel("P1 · critical");
    if (openChanges && setVal(openChanges, summary.openChangeCount)) {
      patched += 1;
    }

    return patched;
  }

  function waitForFleet(maxMs, cb) {
    var deadline = Date.now() + maxMs;
    function tick() {
      var nodes = document.querySelectorAll(".fleet .stat");
      if (nodes.length > 0) return cb(true);
      if (Date.now() > deadline) return cb(false);
      setTimeout(tick, 100);
    }
    tick();
  }

  function fetchSummary() {
    return fetch(SUMMARY_URL, {
      headers: {
        Authorization: "Bearer " + BEARER,
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "omit",
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function dispatchEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (_) {
      // CustomEvent unsupported (very old browsers) — silent.
    }
  }

  function start() {
    waitForFleet(5000, function (mounted) {
      if (!mounted) {
        dispatchEvent("redline:live-summary-error", { reason: "fleet-not-mounted" });
        return;
      }
      fetchSummary()
        .then(function (summary) {
          var patched = applySummary(summary);
          dispatchEvent("redline:live-summary", { summary: summary, patched: patched });
        })
        .catch(function (err) {
          dispatchEvent("redline:live-summary-error", { reason: String(err && err.message ? err.message : err) });
        });
    });
  }

  // Export for tests; named entry so unit tests can call applySummary directly
  // against a stubbed DOM without going through fetch.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { applySummary: applySummary, compactUsd: compactUsd, findStatByLabel: findStatByLabel };
  }
  if (typeof window !== "undefined") {
    window.__redlineLive = { applySummary: applySummary, compactUsd: compactUsd, findStatByLabel: findStatByLabel };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})();
