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
   *  Photographs from the archive. Two stacked <img> layers so a swap never
   *  flashes the background: the incoming frame is only revealed once it has
   *  decoded.
   *
   *  The cut itself is composited in WebGL through a greyscale film matte
   *  (assets/js/wipe.js), so the picture arrives in patches from the middle
   *  outward rather than on a flat opacity ramp. Every failure path — reduced
   *  motion, no WebGL, a matte that never buffered, a refused play() — lands
   *  back on the CSS crossfade, which is what the two layers already do. */
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

    /* -- the matte, one clip at a time ------------------------------------
     * The set comes from the hero's data-mattes (settings.hero_mattes), so it
     * can be swapped or extended without touching code. Nothing is fetched on
     * page load: a clip is armed only once the hero is on screen and the page
     * has settled, because the hero photograph is the LCP and the matte must
     * not compete with it. Two <video> elements take turns — while one plays
     * a cut the next clip loads into the other — so a cut always has a
     * buffered matte to draw with. */
    var hero    = document.querySelector("[data-hero]");
    var canvas  = hero && hero.querySelector("[data-wipe]");
    var videos  = hero ? [].slice.call(hero.querySelectorAll("[data-matte]")) : [];
    var mattes  = hero ? (hero.getAttribute("data-mattes") || "").split(/\s+/).filter(Boolean) : [];
    var wipe    = (window.SoSWipe && canvas && videos.length && mattes.length)
                    ? window.SoSWipe.make(canvas) : null;
    var armed   = -1;   // which clip in the set is loaded
    var slot    = 0;    // which of the two <video> elements holds it
    var active  = null; // the cut that is running, if any

    function armInto(which) {
      if (!wipe || !window.SoSWipe.motionAllowed()) return;
      var n = mattes.length;
      var i = n === 1 ? 0 : (armed + 1 + Math.floor(Math.random() * (n - 1))) % n;
      armed = i;
      var v = videos[which];
      // preload="none" in the markup keeps the clip off the page load. Once
      // the hero is on screen the clip has to be buffered rather than merely
      // addressed: without load() it never reaches readyState 2 and every cut
      // falls back to the crossfade.
      v.preload = "auto";
      v.src = mattes[i];
      v.load();
    }

    if (wipe && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        var go = function () {
          if (window.requestIdleCallback) window.requestIdleCallback(function () { armInto(slot); }, { timeout: 2000 });
          else setTimeout(function () { armInto(slot); }, 500);
        };
        if (document.readyState === "complete") go();
        else window.addEventListener("load", go, { once: true });
      }, { rootMargin: "0px" });
      io.observe(hero);
    }

    /** Hand the layers over: front becomes the visible one. */
    function settle(next) {
      var tmp = back; back = front; front = tmp;
      front.style.opacity = "0";
      current = next;
    }

    function rollCredit(next) {
      if (!credit) return;
      credit.style.opacity = "0";
      setTimeout(function () {
        setCredit(next);
        credit.style.opacity = "";
      }, CREDIT_FADE);
    }

    function rotate() {
      if (document.hidden) return;      // don't burn bandwidth on a hidden tab
      var next = pickOther(photos, current);
      if (!next) return;

      apply(front, next);

      function reveal() {
        rollCredit(next);

        var v = videos[slot];
        if (wipe && wipe.available() && v && v.readyState >= 2) {
          // A cut still running is photographed and dissolved from, so an
          // interrupt is continuous rather than a jump.
          var fromImg = back;
          if (active) {
            if (wipe.capture()) fromImg = null;
            active.stop();
            active = null;
          }
          // Both layers opaque underneath: the canvas is what is seen during
          // the cut, and when it hides the incoming frame is already there.
          front.style.opacity = "1";
          slot = 1 - slot;                       // next cut draws from the other <video>
          active = wipe.run(v, fromImg, front, function () {
            active = null;
            settle(next);
            armInto(1 - slot);                   // re-arm the one just used
          });
          if (active) return;
          // run() bailed before starting (no size, upload failed): fall through.
        }

        // No matte: the CSS opacity transition on .home-hero__img does it.
        front.style.opacity = "1";
        setTimeout(function () { settle(next); }, HERO_FADE);
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
