/* ==================================================================== *
 *  Site chrome — runs on every page. Two small, independent jobs.
 *  Deferred: nothing here is needed before first paint.
 * ==================================================================== */
(function () {
  "use strict";

  /* The mark turns continuously across page loads: remember when the spin
     started for this tab and offset the animation by however long ago that
     was, so navigating never snaps it back to zero. */
  (function spinContinuity() {
    var logo = document.querySelector(".site-header__logo");
    if (!logo) return;
    var period = 40000;
    var start;
    try { start = parseInt(sessionStorage.getItem("sos-spin-start"), 10); } catch (e) {}
    if (!start || isNaN(start)) {
      start = Date.now();
      try { sessionStorage.setItem("sos-spin-start", String(start)); } catch (e) {}
    }
    logo.style.animationDelay = "-" + (((Date.now() - start) % period) / 1000) + "s";
  })();

  /* Show the logo only while the nav still fits beside it. Below that the nav
     is the thing that must stay reachable, so the mark gives up its space. */
  (function brandFit() {
    var header = document.getElementById("site-header");
    var nav = document.getElementById("site-nav");
    if (!header || !nav) return;
    var brand = header.querySelector(".site-header__brand");
    if (!brand) return;

    function fit() {
      brand.style.display = "";
      if (nav.scrollWidth > nav.clientWidth + 1) brand.style.display = "none";
    }
    fit();

    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(fit, 100);
    }, { passive: true });
  })();
})();
