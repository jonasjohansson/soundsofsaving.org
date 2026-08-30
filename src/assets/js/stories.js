/* ==================================================================== *
 *  Stories index — cluster tabs.
 *
 *  Progressive enhancement: with JS off every group renders stacked, which is
 *  also what a crawler sees. The tabs only hide what's already there.
 * ==================================================================== */
(function () {
  "use strict";

  var tabs = document.getElementById("stories-tabs");
  if (!tabs) return;

  var buttons = Array.prototype.slice.call(tabs.querySelectorAll(".stories__tab"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".stories__group"));

  function select(cluster) {
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-cluster") === cluster));
    });
    groups.forEach(function (g) {
      g.hidden = cluster !== "all" && g.getAttribute("data-cluster") !== cluster;
    });
  }

  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".stories__tab");
    if (btn) select(btn.getAttribute("data-cluster"));
  });
})();
