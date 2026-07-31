/* Preview-only progressive enhancement. SIDEARM embeds ship without
   JS on purpose — every page works fully with this file absent. */
(function () {
  "use strict";

  document.documentElement.classList.add("rkt-js");

  // Mobile nav toggle
  var btn = document.querySelector(".rkt-menu-btn");
  var nav = document.getElementById("rkt-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });
  }

  // Reveal-on-scroll (single motion pattern; disabled for reduced motion)
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".rkt-reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) {
      el.classList.add("is-in");
    });
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach(function (el) {
    io.observe(el);
  });
})();
