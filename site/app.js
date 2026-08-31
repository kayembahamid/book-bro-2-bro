/* =========================================================================
   Bro 2 Bro — the notes
   Builds the reading river out of window.NOTES and drives the scroll motion.
   ========================================================================= */
(function () {
  "use strict";

  var NOTES = window.NOTES || [];
  if (!NOTES.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORE = "b2b_last_note";

  var river   = document.getElementById("river");
  var bar     = document.getElementById("bar");
  var barFill = document.getElementById("barFill");
  var barWhere= document.getElementById("barWhere");
  var rail    = document.getElementById("rail");
  var toc     = document.getElementById("toc");
  var tocList = document.getElementById("tocList");

  /* ---------------------------------------------------------------- build */

  var slots = [];          // one wrapper per note, in reading order
  var cards = [];          // the paper itself
  var lastPart = null;

  NOTES.forEach(function (note, i) {
    if (note.part !== lastPart) {
      river.appendChild(partDivider(note.part, lastPart === null));
      lastPart = note.part;
    }

    var slot = document.createElement("div");
    slot.className = "slot";
    slot.id = "n" + note.n;

    var card = document.createElement("article");
    card.className = "note" + (note.kind === "chapter" ? " is-chapter" : "");
    card.setAttribute("aria-labelledby", "t" + note.n);

    if (note.kind === "chapter") card.appendChild(el("div", "chapter-band"));

    /* stamp row */
    var head = el("div", "note-head");
    head.appendChild(el("span", "note-dot"));
    head.appendChild(text(el("span", "note-n"), pad(note.n) + " / " + pad(NOTES.length)));
    var where = note.chapter === note.title ? note.part : note.chapter;
    head.appendChild(text(el("span", "note-ch"), where));
    card.appendChild(head);

    if (note.kicker) card.appendChild(text(el("p", "note-kicker"), note.kicker));

    var h = text(el("h2", "note-title"), note.title);
    h.id = "t" + note.n;
    card.appendChild(h);

    card.appendChild(bodyOf(note));

    /* footer */
    var foot = el("div", "note-foot");
    var a = document.createElement("a");
    a.className = "note-link";
    a.href = note.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Read this page in the book";
    foot.appendChild(a);

    if (i < NOTES.length - 1) {
      var next = document.createElement("button");
      next.className = "note-next";
      next.type = "button";
      next.textContent = "Next note ↓";
      next.addEventListener("click", function () { goTo(i + 1); });
      foot.appendChild(next);
    }
    card.appendChild(foot);

    slot.appendChild(card);
    river.appendChild(slot);
    slots.push(slot);
    cards.push(card);
  });

  function bodyOf(note) {
    var wrap = el("div", "note-body");
    var leadDone = false;
    var seen = 0;
    note.blocks.forEach(function (b) {
      if (b.t === "h")  { wrap.appendChild(text(document.createElement("h3"), b.x)); return; }
      if (b.t === "h2") { wrap.appendChild(text(document.createElement("h4"), b.x)); return; }
      var p = document.createElement("p");
      var t = b.x;
      seen++;
      if (isQuote(t)) p.className = "quote";
      else if (!leadDone && seen <= 2 && t.length > 45) { p.className = "lead"; leadDone = true; }
      // GitBook hard breaks arrive as newlines inside one paragraph
      t.split("\n").forEach(function (line, i) {
        if (i) p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode(line));
      });
      wrap.appendChild(p);
    });
    return wrap;
  }

  function isQuote(t) {
    return /^["“]/.test(t) && /["”][.?!]?$/.test(t.trim()) && t.length < 220;
  }

  function partDivider(part, first) {
    var s = document.createElement("section");
    s.className = "part";
    s.appendChild(text(el("p", "part-n"), first ? "Where it starts" : "Next part"));
    s.appendChild(text(el("h2", "part-t"), part));
    s.appendChild(el("div", "part-rule"));
    return s;
  }

  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function text(n, t) { n.textContent = t; return n; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ------------------------------------------------------------- contents */

  var tocButtons = [];
  var chapterFirst = [];   // first note index of each chapter, for the rail

  (function buildToc() {
    var seenPart = null, seenChapter = null;
    NOTES.forEach(function (note, i) {
      if (note.part !== seenPart) {
        tocList.appendChild(text(el("p", "toc-part"), note.part));
        seenPart = note.part;
      }
      if (note.chapter !== seenChapter) {
        chapterFirst.push({ i: i, label: note.chapter });
        seenChapter = note.chapter;
      }
      var b = el("button", "toc-item" + (note.kind === "chapter" ? " is-chapter" : ""));
      b.type = "button";
      b.appendChild(text(document.createElement("b"), pad(note.n)));
      b.appendChild(document.createTextNode(note.title));
      b.addEventListener("click", function () { closeToc(); goTo(i); });
      tocList.appendChild(b);
      tocButtons.push(b);
    });

    chapterFirst.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.title = c.label;
      b.appendChild(document.createElement("i"));
      b.appendChild(text(document.createElement("span"), c.label));
      b.addEventListener("click", function () { goTo(c.i); });
      rail.appendChild(b);
    });
  })();

  var railButtons = Array.prototype.slice.call(rail.children);

  function openToc() {
    toc.hidden = false;
    document.getElementById("tocBtn").setAttribute("aria-expanded", "true");
    var here = tocButtons[current];
    if (here) here.scrollIntoView({ block: "center" });
  }
  function closeToc() {
    toc.hidden = true;
    document.getElementById("tocBtn").setAttribute("aria-expanded", "false");
  }
  document.getElementById("tocBtn").addEventListener("click", function () {
    toc.hidden ? openToc() : closeToc();
  });
  document.getElementById("tocClose").addEventListener("click", closeToc);
  toc.addEventListener("click", function (e) { if (e.target === toc) closeToc(); });

  /* ----------------------------------------------------------- background */

  var ghosts = [];
  if (!reduce) {
    var drift = document.getElementById("drift");
    for (var g = 0; g < 12; g++) {
      var n = el("div", "ghost");
      var seed = {
        x: (g * 37) % 100,
        y: (g * 53) % 100,
        depth: 0.25 + ((g % 4) * 0.22),
        rot: ((g * 41) % 24) - 12
      };
      n.style.left = seed.x + "vw";
      n.style.top = seed.y + "vh";
      n.style.setProperty("--rot", seed.rot + "deg");
      n.style.opacity = String(0.10 + seed.depth * 0.16);
      drift.appendChild(n);
      ghosts.push({ node: n, seed: seed });
    }
  }

  /* -------------------------------------------------------------- motion */

  var vh = window.innerHeight;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var current = 0;
  var ticking = false;
  var lastY = window.scrollY;
  var barHidden = false;

  var near = new Set();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = slots.indexOf(e.target);
        if (e.isIntersecting) near.add(i); else { near.delete(i); reset(cards[i]); }
      });
      request();
    }, { rootMargin: "120% 0px 120% 0px" });
    slots.forEach(function (s) { io.observe(s); });
  } else {
    slots.forEach(function (_, i) { near.add(i); });
  }

  function reset(card) {
    card.style.transform = "";
    card.style.opacity = "";
    card.style.filter = "";
  }

  function frame() {
    ticking = false;
    vh = window.innerHeight;

    mx += (tmx - mx) * 0.08;
    my += (tmy - my) * 0.08;

    var y = window.scrollY;
    var doc = document.documentElement.scrollHeight - vh;
    barFill.style.width = (doc > 0 ? Math.min(1, y / doc) * 100 : 0) + "%";

    /* hide the bar going down, bring it back coming up */
    if (y > 240 && y > lastY + 6 && !barHidden) { bar.classList.add("is-hidden"); barHidden = true; }
    else if ((y < lastY - 6 || y < 240) && barHidden) { bar.classList.remove("is-hidden"); barHidden = false; }
    lastY = y;

    var best = -1, bestD = Infinity;
    var enterAt = vh * 0.62, settleAt = vh * 0.42, span = vh * 0.55;

    near.forEach(function (i) {
      var card = cards[i];
      var r = card.getBoundingClientRect();

      var p = 0;
      if (r.top > enterAt) p = Math.min(1.6, (r.top - enterAt) / span);
      else if (r.bottom < settleAt) p = Math.max(-1.6, (r.bottom - settleAt) / span);

      if (!reduce) {
        var t, o, blur;
        if (p > 0) {
          /* still in the dark, coming forward */
          t = "translate3d(" + (mx * 14 * p).toFixed(2) + "px," + (26 * p).toFixed(1) + "px," +
              (-190 * p).toFixed(0) + "px) rotateX(" + (5.5 * p).toFixed(2) + "deg) scale(" +
              (1 - 0.11 * Math.min(p, 1.4)).toFixed(3) + ")";
          o = Math.max(0, 1 - 0.78 * Math.min(p, 1.25));
          blur = 2.8 * Math.min(p, 1.4);
        } else if (p < 0) {
          /* read, drifting away over your shoulder */
          var q = -p;
          t = "translate3d(" + (mx * 8 * q).toFixed(2) + "px," + (-22 * q).toFixed(1) + "px," +
              (60 * q).toFixed(0) + "px) rotateX(" + (-4 * q).toFixed(2) + "deg) scale(" +
              (1 + 0.045 * q).toFixed(3) + ")";
          o = Math.max(0, 1 - 0.85 * q);
          blur = 3.2 * q;
        } else {
          /* settled: only the cursor moves it */
          t = "translate3d(0,0,0) rotateY(" + (mx * 1.6).toFixed(2) + "deg) rotateX(" +
              (-my * 1.1).toFixed(2) + "deg)";
          o = 1;
          blur = 0;
        }
        card.style.transform = t;
        card.style.opacity = o.toFixed(3);
        card.style.filter = blur > 0.04 ? "blur(" + blur.toFixed(2) + "px)" : "";
      }

      var d = Math.abs(r.top + Math.min(r.height, vh) / 2 - vh * 0.45);
      if (d < bestD) { bestD = d; best = i; }
    });

    if (!reduce) {
      var gy = y * 0.06;
      ghosts.forEach(function (g, i) {
        var d = g.seed.depth;
        var dx = mx * 46 * d + Math.sin((y * 0.0012) + i) * 12 * d;
        var dy = -gy * (0.4 + d) + my * 34 * d;
        g.node.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) +
          "px,0) rotate(var(--rot))";
      });
    }

    if (best >= 0 && best !== current) setCurrent(best);
  }

  function setCurrent(i) {
    current = i;
    var note = NOTES[i];
    var where = note.chapter === note.title ? note.part : note.chapter;
    barWhere.textContent = where + "  ·  Note " + pad(note.n) + " of " + pad(NOTES.length);

    var ci = -1;
    for (var k = 0; k < chapterFirst.length; k++) if (chapterFirst[k].i <= i) ci = k;
    railButtons.forEach(function (b, k) { b.classList.toggle("is-on", k === ci); });
    tocButtons.forEach(function (b, k) { b.classList.toggle("is-here", k === i); });

    try { localStorage.setItem(STORE, String(i)); } catch (e) {}
    if (history.replaceState) history.replaceState(null, "", "#n" + note.n);
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = (e.clientY / innerHeight) * 2 - 1;
    request();
  }, { passive: true });

  /* keep easing the cursor even when nothing else moves */
  if (!reduce) (function loop() { request(); requestAnimationFrame(loop); })();

  /* ------------------------------------------------------------ movement */

  function goTo(i) {
    i = Math.max(0, Math.min(NOTES.length - 1, i));
    var top = slots[i].getBoundingClientRect().top + window.scrollY - 74;
    window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  }

  addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "Escape" && !toc.hidden) { closeToc(); return; }
    if (e.key === "c" || e.key === "C") { toc.hidden ? openToc() : closeToc(); e.preventDefault(); return; }
    if (e.key === "ArrowDown" || e.key === "j" || e.key === "PageDown") { goTo(current + 1); e.preventDefault(); }
    else if (e.key === "ArrowUp" || e.key === "k" || e.key === "PageUp") { goTo(current - 1); e.preventDefault(); }
    else if (e.key === "Home") { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); e.preventDefault(); }
    else if (e.key === "End") { goTo(NOTES.length - 1); e.preventDefault(); }
  });

  /* --------------------------------------------------------------- intro */

  var todayIdx = (function () {
    var d = new Date();
    var day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return day % NOTES.length;
  })();

  var heroToday = document.getElementById("heroToday");
  var t = NOTES[todayIdx];
  heroToday.appendChild(document.createTextNode(
    new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) + "  ·  today's note:  "
  ));
  var tb = document.createElement("b");
  tb.textContent = t.title;
  heroToday.appendChild(tb);
  heroToday.style.cursor = "pointer";
  heroToday.addEventListener("click", function () { goTo(todayIdx); });

  var words = NOTES.reduce(function (a, n) { return a + n.words; }, 0);
  document.getElementById("heroMeta").textContent =
    NOTES.length + " notes  ·  " + chapterFirst.length + " chapters  ·  " +
    words.toLocaleString() + " words  ·  scroll, or press J and K";

  document.getElementById("startBtn").addEventListener("click", function () { goTo(0); });
  document.getElementById("topBtn").addEventListener("click", function () { goTo(0); });

  var saved = -1;
  try { saved = parseInt(localStorage.getItem(STORE), 10); } catch (e) {}
  if (saved > 1 && saved < NOTES.length) {
    var rb = document.getElementById("resumeBtn");
    rb.hidden = false;
    rb.textContent = "Pick up at note " + pad(NOTES[saved].n);
    rb.addEventListener("click", function () { goTo(saved); });
  }

  /* a shared link like /#n24 opens on that note */
  if (/^#n\d+$/.test(location.hash)) {
    var want = parseInt(location.hash.slice(2), 10) - 1;
    if (want >= 0 && want < NOTES.length) {
      requestAnimationFrame(function () {
        window.scrollTo({ top: slots[want].getBoundingClientRect().top + window.scrollY - 74, behavior: "auto" });
      });
    }
  }

  request();
})();
