/* ==================================================================== *
 *  Get Help — resource finder. Vanilla, no framework.
 *
 *  The page server-renders the first batch of cards so there is something
 *  real to read (and to crawl) immediately. The full 491-record dataset is
 *  fetched from /assets/data/resources.json — it used to be inlined, but half
 *  a megabyte of JSON in the middle of the document delayed first paint for
 *  everyone, including the people who only ever needed the crisis lines at
 *  the top. Once it arrives we take over rendering.
 *
 *    - No filter active  -> progressive reveal: `shownLimit` cards plus a
 *                           "Show more" button that adds another batch.
 *    - Any filter active -> render every match, with live counts and a
 *                           clear empty state.
 *
 *  Matching is plain substring over a prebuilt lowercased haystack, so a full
 *  pass over 491 records is well under a frame; keystrokes are coalesced with
 *  requestAnimationFrame.
 * ==================================================================== */
(function () {
  "use strict";

  var list = document.getElementById("finder-results");
  if (!list) return;

  var q = document.getElementById("finder-q");
  var topic = document.getElementById("finder-topic");
  var loc = document.getElementById("finder-location");
  var lang = document.getElementById("finder-language");
  var reset = document.getElementById("finder-reset");
  var shown = document.getElementById("finder-shown");
  var empty = document.getElementById("finder-empty");
  var intro = document.getElementById("finder-intro");
  var more = document.getElementById("finder-more");
  var moreBtn = document.getElementById("finder-more-btn");

  var BATCH = parseInt(list.getAttribute("data-batch"), 10) || 36;
  var SRC = list.getAttribute("data-src") || "/assets/data/resources.json";

  var data = [];
  var catLabels = {};
  var intros = {};
  var total = 0;
  var shownLimit = BATCH;

  try {
    intros = JSON.parse(document.getElementById("finder-topic-intros").textContent);
  } catch (e) { intros = {}; }

  /* — Rendering ——————————————————————————————————————————————————— */

  function tel(p) { return p.replace(/[^0-9+]/g, ""); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;";
    });
  }

  /* The whole card is the link out. We deliberately do NOT print the phone
     number when the organization has a site: numbers go stale in a static
     list, and theirs is the copy that stays current. The handful with no site
     keep their number, since it is the only way to reach them. */
  function cardHTML(r) {
    var isNational = (" " + r.l + " ").indexOf(" national ") !== -1;
    var html = "<li>";

    html += r.u
      ? '<a class="resource-card" href="' + esc(r.u) + '" target="_blank" rel="noopener">'
      : '<div class="resource-card">';

    html += '<p class="resource-card__name">' + esc(r.n) + "</p>";
    if (isNational) html += '<span class="resource-card__badge">National</span>';
    if (r.d) html += "<p>" + esc(r.d) + "</p>";

    var cats = r.c ? r.c.split(" ").filter(Boolean) : [];
    if (cats.length) {
      html += '<div class="resource-card__tags" aria-label="Topics">';
      for (var i = 0; i < cats.length; i++) {
        html += '<span class="tag">' + esc(catLabels[cats[i]] || cats[i]) + "</span>";
      }
      html += "</div>";
    }

    // No "visit site" line: the card IS the link. Only the handful with no
    // website at all show a number, because that is all they have.
    if (!r.u && r.p) {
      html += '<span class="resource-card__go">Call <a href="tel:' + esc(tel(r.p)) + '">' + esc(r.p) + "</a></span>";
    }

    html += r.u ? "</a>" : "</div>";
    return html + "</li>";
  }

  function render(rows, limit) {
    var n = Math.min(limit, rows.length);
    var html = "";
    for (var i = 0; i < n; i++) html += cardHTML(rows[i]);
    list.innerHTML = html;
  }

  /* — Filtering ——————————————————————————————————————————————————— */

  function matches(r, term, t, l, lg) {
    if (term && r.s.indexOf(term) === -1) return false;
    if (t && (" " + r.c + " ").indexOf(" " + t + " ") === -1) return false;
    if (l && (" " + r.l + " ").indexOf(" " + l + " ") === -1) return false;
    if (lg && (" " + r.g + " ").indexOf(" " + lg + " ") === -1) return false;
    return true;
  }

  function apply() {
    var term = q.value.trim().toLowerCase();
    var t = topic.value;
    var l = loc.value;
    var lg = lang.value;
    var active = !!(term || t || l || lg);

    var rows = active ? data.filter(function (r) { return matches(r, term, t, l, lg); }) : data;
    var count = rows.length;

    if (active) {
      render(rows, count);
      shown.textContent = count;
      more.hidden = true;
    } else {
      if (shownLimit > total) shownLimit = total;
      render(rows, shownLimit);
      shown.textContent = total;
      more.hidden = shownLimit >= total;
    }

    empty.hidden = count !== 0;
    list.hidden = count === 0;

    // Editorial intro, only when exactly one topic is selected.
    if (t && intros[t]) {
      var label = topic.options[topic.selectedIndex].text.replace(/\s*\(\d+\)\s*$/, "");
      intro.innerHTML = "<strong>" + esc(label) + ".</strong> " + esc(intros[t]);
      intro.hidden = false;
    } else {
      intro.hidden = true;
    }

    reset.hidden = !active;
  }

  /* — Wiring ————————————————————————————————————————————————————— */

  var raf = null;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; shownLimit = BATCH; apply(); });
  }

  function onFilterChange() { shownLimit = BATCH; apply(); }

  function enable() {
    q.addEventListener("input", schedule);
    topic.addEventListener("change", onFilterChange);
    loc.addEventListener("change", onFilterChange);
    lang.addEventListener("change", onFilterChange);

    reset.addEventListener("click", function () {
      q.value = ""; topic.value = ""; loc.value = ""; lang.value = "";
      shownLimit = BATCH;
      apply();
      q.focus();
    });

    moreBtn.addEventListener("click", function () {
      shownLimit += BATCH;
      apply();
    });

    // Deep links: /resources/?topic=lgbtq, ?location=national, ?q=grief
    var params = new URLSearchParams(location.search);
    if (params.get("q")) q.value = params.get("q");
    if (params.get("topic")) topic.value = params.get("topic");
    if (params.get("location")) loc.value = params.get("location");
    if (params.get("language")) lang.value = params.get("language");
  }

  /* The controls are inert until the dataset lands — better a control that is
     visibly not-yet-ready than one that silently returns nothing. */
  var controls = [q, topic, loc, lang];
  controls.forEach(function (el) { if (el) el.disabled = true; });

  fetch(SRC, { credentials: "omit" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (payload) {
      data = payload.resources || [];
      catLabels = payload.catLabels || {};
      total = data.length;
      controls.forEach(function (el) { if (el) el.disabled = false; });
      enable();
      apply();
    })
    .catch(function () {
      /* Leave the server-rendered first batch in place and re-enable search so
         the page is never dead — it just can't filter the full directory. */
      controls.forEach(function (el) { if (el) el.disabled = false; });
      var note = document.getElementById("finder-offline");
      if (note) note.hidden = false;
    });
})();
