/* ==================================================================== *
 *  Educators intake form.
 *
 *  There is no hosted form endpoint yet, so the form composes a mailto: with
 *  the fields already filled in. Progressive enhancement: without JS the form
 *  still submits by its own action, and the address is on the page regardless.
 * ==================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("intake-form");
  if (!form) return;

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var track = val("f-track");
    var subject = "Educator inquiry" + (track ? " (" + track + ")" : "");
    var body = [
      "Name: " + val("f-name"),
      "Role: " + val("f-role"),
      "School or institution: " + val("f-school"),
      "Email: " + val("f-email"),
      "Track: " + track,
      "",
      val("f-message")
    ].join("\n");

    window.location.href =
      "mailto:programs@soundsofsaving.org?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  });
})();
