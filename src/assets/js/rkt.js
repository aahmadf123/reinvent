/* Preview-only progressive enhancement. SIDEARM embeds ship without
   JS on purpose — every page works fully with this file absent. */
(function () {
  "use strict";

  document.documentElement.classList.add("rkt-js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // Hero reel. The markup ships with a still and no video source; the
  // footage is attached only where it is welcome — a screen wide enough
  // to see it, no reduced-motion preference, and no data-saver request.
  // Everywhere else the still is the hero, which is also what the
  // JS-free SIDEARM embeds get.
  var reel = document.querySelector("[data-rkt-reel]");
  if (reel) {
    var conn = navigator.connection || {};
    var wide = window.matchMedia("(min-width: 48em)").matches;
    if (wide && !reduced && !conn.saveData) {
      reel.addEventListener("playing", function () {
        reel.classList.add("is-playing");
      });
      reel.src = reel.getAttribute("data-rkt-reel");
      var playing = reel.play();
      if (playing && playing.catch) {
        playing.catch(function () {
          /* Autoplay refused — the still stays. */
        });
      }
    }
  }

  // Cards in a grid reveal in sequence rather than all at once. The
  // index feeds a transition-delay in CSS.
  document.querySelectorAll(".rkt-cards").forEach(function (grid) {
    var i = 0;
    grid.querySelectorAll(":scope > .rkt-reveal").forEach(function (el) {
      el.style.setProperty("--rkt-i", i++);
    });
  });

  // Stat figures count up the first time they're seen. The real values
  // live in a .rkt-sr sibling that never changes, so assistive tech is
  // unaffected by whatever the visible digits are doing mid-animation.
  function countUp(el) {
    var final = el.textContent.trim();
    var digits = final.replace(/[^0-9]/g, "");
    if (!digits) return;
    var target = parseInt(digits, 10);
    if (!isFinite(target) || target === 0) return;
    var prefix = final.slice(0, final.indexOf(digits.charAt(0)));
    var suffix = final.slice(final.indexOf(digits) + digits.length);
    var grouped = /,/.test(final);
    var start = null;
    var dur = 900;

    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / dur);
      // ease-out cubic — lands softly on the real number
      var v = Math.round(target * (1 - Math.pow(1 - t, 3)));
      el.textContent = prefix + (grouped ? v.toLocaleString("en-US") : v) + suffix;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = final;
    }
    requestAnimationFrame(frame);
  }

  // Reveal-on-scroll (single motion pattern; disabled for reduced motion)
  var targets = document.querySelectorAll(".rkt-reveal");
  var stats = document.querySelectorAll("[data-rkt-count]");

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) {
      el.classList.add("is-in");
    });
    return;
  }

  // Only now commit to hiding anything. The CSS that makes .rkt-reveal
  // invisible is gated on this class, so if any code above had thrown,
  // the page would still be fully readable — content is never hidden by
  // a stylesheet that depends on script we haven't reached yet.
  document.documentElement.classList.add("rkt-anim");

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

  var statIo = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          statIo.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  stats.forEach(function (el) {
    statIo.observe(el);
  });
})();
