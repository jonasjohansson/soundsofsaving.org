/* ==================================================================== *
 *  Educators intake form.
 *
 *  There is no hosted form endpoint yet, so the form composes a mailto: with
 *  the fields already filled in. The address comes from the form's data-to
 *  (settings.contact_email), and is printed under the button as well, so the
 *  page still works with JS off or a mail client that never opens.
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

    var to = form.getAttribute("data-to");
    if (!to) return;
    window.location.href =
      "mailto:" + to + "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  });
})();
