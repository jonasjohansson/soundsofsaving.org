/* ==================================================================== *
 *  Home page — three independent bits of re-personalisation.
 *
 *  The page is static HTML: the server picks one hero photo, one session and
 *  one interview, and every visitor would otherwise see the same three. Here
 *  we reshuffle from pools embedded as JSON islands, so the site feels as
 *  broad as the archive actually is. Everything degrades to the server's
 *  choice if JS never runs.
 * ==================================================================== */
(function () {
  "use strict";

  var HERO_INTERVAL = 10000;   // time one hero photo holds
  var HERO_FADE     = 1700;    // must outlast the CSS opacity transition
  var CREDIT_FADE   = 600;

  /** Read and parse a <script type="application/json"> island by id. */
  function pool(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    try {
      var v = JSON.parse(el.textContent);
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Pick something other than `current`, giving up rather than looping. */
  function pickOther(arr, current) {
    var next = current;
    for (var i = 0; i < 8 && next === current; i++) next = pick(arr);
    return next === current ? null : next;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* — Hero ————————————————————————————————————————————————————————— *
   *  Photographs from the archive, cross-fading. Two stacked <img> layers so
   *  a swap never flashes the background: the incoming frame is only revealed
   *  once it has decoded. */
  function heroRotator() {
    var photos = pool("hero-pool").filter(function (h) { return h && h.src; });
    var img = document.querySelector(".home-hero__img");
    if (!img || !photos.length) return;

    var credit = document.querySelector(".home-hero__credit");
    var current = pick(photos);

    function setCredit(h) {
      if (!credit) return;
      credit.textContent = h.credit || "";
      credit.hidden = !h.credit;
    }
    /* The pool carries a resolved srcset per photo (built by the {% heroPool %}
       shortcode), so the browser still picks a width-appropriate file even
       though this is a plain <img> rather than a <picture>. */
    function apply(el, h) {
      if (h.srcset) el.srcset = h.srcset;
      else el.removeAttribute("srcset");
      el.src = h.src;
      el.alt = h.alt || "";
    }

    apply(img, current);
    setCredit(current);

    if (photos.length < 2 || prefersReducedMotion()) return;

    var back = img;                     // the visible layer
    var front = img.cloneNode(false);   // the incoming layer
    front.style.opacity = "0";
    front.removeAttribute("fetchpriority");
    front.loading = "lazy";
    back.parentNode.insertBefore(front, back.nextSibling);

    function rotate() {
      if (document.hidden) return;      // don't burn bandwidth on a hidden tab
      var next = pickOther(photos, current);
      if (!next) return;

      apply(front, next);

      function reveal() {
        front.style.opacity = "1";
        if (credit) {
          credit.style.opacity = "0";
          setTimeout(function () {
            setCredit(next);
            credit.style.opacity = "";
          }, CREDIT_FADE);
        }
        setTimeout(function () {
          var tmp = back; back = front; front = tmp;   // front becomes hidden again
          front.style.opacity = "0";
          current = next;
        }, HERO_FADE);
      }

      if (front.complete) reveal();
      else front.addEventListener("load", reveal, { once: true });
    }

    setInterval(rotate, HERO_INTERVAL);
  }

  /* — Featured session ————————————————————————————————————————————— *
   *  Prefer an episode that actually names a song; fall back to any. */
  function featuredSession() {
    var all = pool("session-pool");
    if (!all.length) return;

    var withSong = all.filter(function (s) { return s.song; });
    var s = pick(withSong.length ? withSong : all);

    var root = document.querySelector(".featured:not(.featured--story)");
    if (!root) return;

    var img = root.querySelector(".featured__media img");
    var media = root.querySelector(".featured__media");
    var titleLink = root.querySelector(".featured__titlelink");
    var artist = root.querySelector(".featured__artist");
    var song = root.querySelector(".featured__song");

    if (img && s.base) {
      img.srcset = s.base + "-800.webp 800w, " + s.base + "-1280.webp 1280w";
      img.src = s.base + "-800.webp";
      img.alt = s.artist;
    }
    if (media && s.url) media.setAttribute("href", s.url);
    if (titleLink && s.url) titleLink.setAttribute("href", s.url);
    if (artist) artist.textContent = s.artist;
    if (song) {
      if (s.song) {
        song.textContent = s.song + " by " + (s.covers || s.artist);
        song.hidden = false;
      } else {
        song.hidden = true;
      }
    }
  }

  /* — Featured interview ——————————————————————————————————————————— */
  function featuredStory() {
    var stories = pool("story-pool");
    if (!stories.length) return;

    var root = document.querySelector(".featured--story");
    if (!root) return;

    var st = pick(stories);
    var img = root.querySelector(".featured__media img");
    var media = root.querySelector(".featured__media");
    var titleLink = root.querySelector(".featured__titlelink");
    var title = root.querySelector(".featured__artist");
    var author = root.querySelector(".featured__song");
    var read = root.querySelector(".featured__links a");

    if (img && st.img) {
      img.src = st.img;
      img.alt = st.title;
    }
    if (media && st.url) {
      media.setAttribute("href", st.url);
      media.setAttribute("aria-label", "Read " + st.title);
    }
    if (titleLink && st.url) titleLink.setAttribute("href", st.url);
    if (title) title.textContent = st.title;
    if (author) {
      if (st.author) { author.textContent = st.author; author.hidden = false; }
      else { author.hidden = true; }
    }
    if (read && st.url) read.setAttribute("href", st.url);
  }

  heroRotator();
  featuredSession();
  featuredStory();
})();
