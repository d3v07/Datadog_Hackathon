// Sidecar live layer for the static demo app.
// Loaded AFTER the React/Babel pipeline finishes hydrating. Polls for the
// FleetStats cards (rendered by shared.jsx), fetches the Unsyphn dashboard
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
  var BEARER   = metaValue("redline-bearer", "demo_token_acme_corp_2026");

  // In dev, Vite serves the static demo on a different port than the API.
  // Detect this: if no meta base is set and we're on a non-API port, point
  // directly at the known API port.
  if (!API_BASE && typeof window !== "undefined") {
    var h = window.location.hostname;
    var p = window.location.port;
    // Port 4004 = vite dev server; API lives on 3005
    if (p === "4004" || p === "5173" || p === "3000") {
      API_BASE = window.location.protocol + "//" + h + ":3005";
    }
  }

  var baseUrl   = (API_BASE || (typeof window !== "undefined" && window.location.origin) || "").replace(/\/+$/, "");
  var SUMMARY_URL = baseUrl + "/v1/dashboard/summary";
  var STREAM_URL  = baseUrl + "/v1/stream?token=" + encodeURIComponent(BEARER);

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
      // CustomEvent unsupported — silent.
    }
  }

  function subscribeToStream() {
    if (typeof EventSource === "undefined") return;
    var es = new EventSource(STREAM_URL);

    // On any named or unnamed message, re-fetch summary to keep stats fresh.
    var REFRESH_EVENTS = ["scheduler.tick", "run.stage", "run.completed", "org.entitlements.changed"];
    REFRESH_EVENTS.forEach(function (evtType) {
      es.addEventListener(evtType, function (e) {
        var payload = null;
        try { payload = JSON.parse(e.data); } catch (_) {}
        dispatchEvent("redline:stream-event", { type: evtType, payload: payload });
        fetchSummary().then(function (summary) {
          waitForFleet(1000, function (mounted) {
            if (mounted) applySummary(summary);
          });
        }).catch(function () {});
      });
    });

    es.onerror = function () {
      // Reconnect is handled automatically by EventSource; no action needed.
    };
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
          subscribeToStream();
        })
        .catch(function (err) {
          dispatchEvent("redline:live-summary-error", { reason: String(err && err.message ? err.message : err) });
          subscribeToStream();
        });
    });
  }

  // Export for tests
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
