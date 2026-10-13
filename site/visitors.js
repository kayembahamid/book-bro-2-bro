/* hamcodes-visitors.js · the footer counter, shared by every Hamcodes site.

   This file is identical in thefilter-landing, course-hackers-methodology
   (Labs), site-hackers-notes and site-digital-netizenship. Change it in one
   place and copy it to the other three, the way stars.js and moon.webp are
   already kept in step.

   What the number means, exactly: it is the count of distinct people who did
   something on this site. Played a drill, started a step, asked for a demo.
   We do not count page views at all, so somebody who reads a page and leaves
   is never recorded and never appears here. The count is all time, so it only
   ever climbs.

   Nothing identifying is involved: no cookies, no IP addresses, no names. The
   id behind the count is a random string kept in that one browser, and the
   country comes from Cloudflare's edge, never from a lookup we run.

   Markup it needs, anywhere on the page:
     <div id="visitors" hidden
          data-site="labs"                     (optional, else the server
                                                decides from the origin)
          data-label="People who played here"  (optional)
          data-min="0"                         (optional, 0 shows it from the
                                                first visit, a higher number
                                                keeps it hidden until then)
          data-config="/data/site.json"></div> (optional, a JSON file whose
                                                showVisitors can switch the
                                                counter off without a deploy)

   It styles itself from the host site's own tokens, so Labs comes out mint,
   Hacker's Notes green and Netizen red with no per site stylesheet. */
(function () {
  "use strict";

  var box = document.getElementById("visitors");
  if (!box) return;

  var API = box.dataset.api || "https://private.hamcodes.com/api/visitors";
  var SITE = box.dataset.site || "";
  var LABEL = box.dataset.label || "People who played here";
  var MIN = box.dataset.min == null ? 25 : Number(box.dataset.min);
  var MAX_FLAGS = Number(box.dataset.flags || 40);

  /* ── the look ──────────────────────────────────────────────────────────
     Injected rather than kept in four stylesheets, so this stays one file to
     copy. Every colour falls back through the token names the sites actually
     use: --brand on Labs and The Filter, --green on Hacker's Notes, --red on
     Netizen, then a plain default if a site defines none of them. */
  var ACCENT = "var(--brand, var(--green, var(--red, #3ddba3)))";
  var SURFACE = "var(--surface, var(--ink-1, rgba(255,255,255,.03)))";
  var LINE = "var(--line, rgba(255,255,255,.12))";
  var MUTED = "var(--muted, #8a93a6)";
  var MONO = "var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

  var CSS = [
    "#visitors{margin:0;padding:26px 0 4px;text-align:center;line-height:1.5}",
    "#visitors[hidden]{display:none}",
    ".hc-vc-line{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin:0}",
    ".hc-vc-label{font-family:" + MONO + ";font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:" + MUTED + "}",
    // The odometer: one box per digit, the way a 1999 hit counter did it.
    ".hc-vc-odo{display:inline-flex;gap:3px;padding:3px;border:1px solid " + ACCENT + ";border-radius:5px;background:" + SURFACE + "}",
    ".hc-vc-odo i{font-family:" + MONO + ";font-style:normal;font-weight:700;font-size:1.02rem;line-height:1;color:" + ACCENT + ";background:rgba(0,0,0,.35);padding:7px 6px;border-radius:2px;min-width:1ch;text-align:center}",
    ".hc-vc-from{font-family:" + MONO + ";font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:" + MUTED + ";margin:22px 0 10px;font-weight:400}",
    ".hc-vc-flags{display:flex;flex-wrap:wrap;justify-content:center;gap:7px 14px;margin:0;padding:0;list-style:none}",
    ".hc-vc-flags li{font-family:" + MONO + ";font-size:.76rem;color:" + MUTED + ";white-space:nowrap}",
    ".hc-vc-flags b{color:" + ACCENT + ";font-weight:700}",
    ".hc-vc-flags .hc-fl{font-size:.95rem;vertical-align:-1px;margin-right:3px}",
    ".hc-vc-foot{font-size:.74rem;color:" + MUTED + ";margin:16px 0 0}",
    "@media (max-width:560px){.hc-vc-odo i{font-size:.94rem;padding:6px 5px}.hc-vc-flags{gap:6px 11px}.hc-vc-flags li{font-size:.72rem}}"
  ].join("");

  function style() {
    if (document.getElementById("hc-vc-css")) return;
    var el = document.createElement("style");
    el.id = "hc-vc-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* A two letter country code as its flag. Regional indicator letters sit at
     0x1F1E6, so A becomes the first of them and the pair renders as one flag.
     A browser that has no flag font shows the letters, which is why the code
     is always printed beside it. */
  function flag(cc) {
    if (!/^[A-Za-z]{2}$/.test(cc)) return "";
    var pts = cc.toUpperCase().split("").map(function (c) { return 0x1f1e6 + c.charCodeAt(0) - 65; });
    return String.fromCodePoint.apply(null, pts);
  }

  // At least five boxes, so a small number still looks like an odometer.
  function digits(n) {
    var s = String(Math.max(0, n | 0));
    while (s.length < 5) s = "0" + s;
    return s;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function render(d) {
    var odo = digits(d.total).split("").map(function (ch) { return "<i>" + ch + "</i>"; }).join("");
    var list = (d.countries || []).slice(0, MAX_FLAGS).map(function (x) {
      var f = flag(x.c);
      return "<li>" + (f ? "<span class='hc-fl'>" + f + "</span>" : "") + esc(x.c) + " <b>" + (x.n | 0) + "</b></li>";
    }).join("");

    box.innerHTML =
      "<p class='hc-vc-line'><span class='hc-vc-label'>" + esc(LABEL) + "</span>" +
      "<span class='hc-vc-odo' aria-hidden='true'>" + odo + "</span></p>" +
      (list ? "<h2 class='hc-vc-from'>Visitors from</h2><ul class='hc-vc-flags'>" + list + "</ul>" : "") +
      "<p class='hc-vc-foot'>Counted anonymously. No cookies, no accounts, no personal data.</p>";

    // The odometer is decoration; this is what a screen reader reads out.
    box.setAttribute("aria-label", LABEL + ": " + (d.total | 0));
    style();
    box.hidden = false;
  }

  function count() {
    var url = API + (SITE ? "?site=" + encodeURIComponent(SITE) : "");
    return fetch(url, { mode: "cors" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        // data-min="0" shows the counter from the very first visit, zero and
        // all, so it can be watched counting. Any higher number keeps it
        // hidden until the count is worth showing.
        if (MIN > 0 && (!d.total || d.total < MIN)) return;
        render(d);
      });
  }

  // A site may keep the switch in a JSON file, so the counter can be turned
  // off by editing one line rather than by shipping a new page.
  var CONFIG = box.dataset.config || "";
  var start = CONFIG
    ? fetch(CONFIG, { cache: "no-cache" })
        .then(function (r) { return r.json(); })
        .then(function (c) {
          // Off unless the file says on, which is how the switch is documented.
          if (!c || !c.showVisitors) return;
          if (typeof c.visitorsMin === "number") MIN = c.visitorsMin;
          return count();
        })
    : count();

  start.catch(function () { /* a counter is never worth an error on the page */ });
})();
