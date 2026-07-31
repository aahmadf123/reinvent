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

  // Items in a grid reveal in sequence rather than all at once. The
  // index feeds a transition-delay in CSS.
  document
    .querySelectorAll(".rkt-cards, .rkt-tickets, .rkt-quotes, .rkt-staff, .rkt-channels, .rkt-board")
    .forEach(function (grid) {
      var i = 0;
      grid.querySelectorAll(":scope > .rkt-reveal").forEach(function (el) {
        el.style.setProperty("--rkt-i", i++);
      });
    });

  // Athlete voices: upgrade the stacked quotes to a paced rotator.
  // Only where motion is welcome — reduced-motion visitors, no-JS
  // visitors, and SIDEARM embeds all keep the stacked form.
  document.querySelectorAll("[data-rkt-quotes]").forEach(function (box) {
    var slides = Array.prototype.slice.call(box.querySelectorAll(".rkt-quote"));
    if (slides.length < 2 || reduced) return;

    box.classList.add("is-rotator");
    box.setAttribute("role", "region");
    box.setAttribute("aria-roledescription", "carousel");
    box.setAttribute("aria-label", "Athlete voices");

    var current = 0;
    var timer = null;
    var auto = true;

    slides.forEach(function (slide, i) {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", i + 1 + " of " + slides.length);
      if (i !== 0) slide.hidden = true;
    });

    var controls = document.createElement("div");
    controls.className = "rkt-quotes-controls";

    function makeButton(label, text) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.textContent = text;
      return b;
    }

    var prevBtn = makeButton("Previous quote", "←");
    var nextBtn = makeButton("Next quote", "→");
    var pauseBtn = makeButton("Pause automatic rotation", "Pause");
    pauseBtn.setAttribute("aria-pressed", "false");
    var count = document.createElement("span");
    count.className = "rkt-quotes-count";
    count.setAttribute("aria-hidden", "true");

    controls.appendChild(pauseBtn);
    controls.appendChild(prevBtn);
    controls.appendChild(count);
    controls.appendChild(nextBtn);
    box.insertBefore(controls, box.firstChild);

    function show(i) {
      slides[current].hidden = true;
      current = (i + slides.length) % slides.length;
      slides[current].hidden = false;
      count.textContent = current + 1 + " / " + slides.length;
    }
    show(0);

    function halt() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function resume() {
      if (auto && timer === null) {
        timer = setInterval(function () {
          show(current + 1);
        }, 8000);
      }
    }

    // Any manual step ends auto-rotation for good; the pause button
    // is an explicit toggle.
    function manual(step) {
      auto = false;
      halt();
      pauseBtn.textContent = "Play";
      pauseBtn.setAttribute("aria-label", "Resume automatic rotation");
      pauseBtn.setAttribute("aria-pressed", "true");
      show(current + step);
    }

    prevBtn.addEventListener("click", function () {
      manual(-1);
    });
    nextBtn.addEventListener("click", function () {
      manual(1);
    });
    pauseBtn.addEventListener("click", function () {
      if (auto) {
        auto = false;
        halt();
        pauseBtn.textContent = "Play";
        pauseBtn.setAttribute("aria-label", "Resume automatic rotation");
        pauseBtn.setAttribute("aria-pressed", "true");
      } else {
        auto = true;
        pauseBtn.textContent = "Pause";
        pauseBtn.setAttribute("aria-label", "Pause automatic rotation");
        pauseBtn.setAttribute("aria-pressed", "false");
        resume();
      }
    });

    // Rotation yields while the visitor is reading or interacting.
    box.addEventListener("mouseenter", halt);
    box.addEventListener("mouseleave", resume);
    box.addEventListener("focusin", halt);
    box.addEventListener("focusout", resume);

    resume();
  });

  // Stat figures count up the first time they're seen. The real values
  // live in a .rkt-sr sibling that never changes, so assistive tech is
  // unaffected by whatever the visible digits are doing mid-animation.
  function countUp(el) {
    var final = el.textContent.trim();
    // Decimal figures ("3.4") can't animate through integers — the
    // digit-splitting below would render garbage mid-flight. Static.
    if (/\d\.\d/.test(final)) return;
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
