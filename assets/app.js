/* «Дуся и Белый Мякиш» — рендер книги и настройки чтения */
(function () {
  "use strict";

  var data = window.BOOK_DATA;
  var book = document.getElementById("book");
  var html = document.documentElement;

  if (!data || !book) return;

  var TOTAL = data.chapters.length;

  /* ---------------- разметка ---------------- */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chapterLabel(n) {
    return "Глава " + n + " из " + TOTAL;
  }

  var dims = data.dims || {};

  function sizeAttrs(src) {
    var d = dims[src];
    return d ? ' width="' + d[0] + '" height="' + d[1] + '"' : "";
  }

  function renderGallery(srcs, chapterNum) {
    return srcs.map(function (src) { return renderFigure(src, chapterNum, ""); }).join("");
  }

  function renderFigure(src, chapterNum, extraClass) {
    var d = dims[src] || [0, 0];
    var cls = "figure" + (d[0] && d[0] < 320 ? " figure--sm" : "");
    if (extraClass) cls += " " + extraClass;
    return (
      '<figure class="' + cls + '">' +
      '<img src="' + esc(src) + '" alt="Иллюстрация к главе ' + chapterNum + '"' +
      sizeAttrs(src) + ' loading="lazy" decoding="async" data-zoom="1">' +
      "</figure>"
    );
  }

  function renderBlocks(blocks, chapterNum, leadState) {
    var out = "";
    var inQuiz = false;
    var inDialog = false;

    function closeDialog() {
      if (inDialog) {
        out += "</div>";
        inDialog = false;
      }
    }
    function closeQuiz() {
      if (inQuiz) {
        out += "</div>";
        inQuiz = false;
      }
    }

    blocks.forEach(function (b) {
      if (b.type === "q") {
        closeDialog();
        if (!inQuiz) {
          out += '<div class="quiz">';
          inQuiz = true;
        }
        out += '<p class="q">' + esc(b.text.replace(/^\d+\.\s*/, "")) + "</p>";
        return;
      }
      closeQuiz();

      if (b.type === "dlg") {
        if (!inDialog) {
          out += '<div class="dialog">';
          inDialog = true;
        }
        out += "<p>" + esc(b.text) + "</p>";
        return;
      }
      closeDialog();

      if (b.type === "h3") {
        out += '<h3 class="sec__title">' + esc(b.text) + "</h3>";
      } else if (b.type === "p") {
        var lead = !!(leadState && leadState.pending);
        if (lead) leadState.pending = false;
        out += '<p class="p' + (lead ? " lead" : "") + '">' + esc(b.text) + "</p>";
      } else if (b.type === "img" && b.src) {
        out += renderFigure(b.src, chapterNum, "");
      } else if (b.type === "gallery" && b.srcs && b.srcs.length) {
        out += renderGallery(b.srcs, chapterNum);
      }
    });

    closeDialog();
    closeQuiz();
    return out;
  }

  var htmlOut = "";

  data.chapters.forEach(function (ch, idx) {
    var prev = data.chapters[idx - 1];
    var next = data.chapters[idx + 1];

    var leadHtml = (ch.lead || []).map(function (src) {
      return renderFigure(src, ch.num, "figure--lead");
    }).join("");

    htmlOut +=
      '<article class="chapter" id="ch-' + ch.num + '" data-chapter="' + ch.num + '">' +
      leadHtml +
      '<header class="chapter__head">' +
      '<p class="chapter__label">' + chapterLabel(ch.num) + "</p>" +
      '<h2 class="chapter__title">' + esc(ch.title) + "</h2>" +
      "</header>";

    var leadState = { pending: true };
    ch.sections.forEach(function (sec, si) {
      if ((!sec.blocks || !sec.blocks.length) && !(sec.lead && sec.lead.length)) return;
      var hasTitle = sec.title && sec.title.trim();
      htmlOut += '<section class="sec">';
      (sec.lead || []).forEach(function (src) {
        htmlOut += renderFigure(src, ch.num, "");
      });
      if (hasTitle) htmlOut += '<h3 class="sec__title">' + esc(sec.title) + "</h3>";
      htmlOut += renderBlocks(sec.blocks || [], ch.num, leadState);
      htmlOut += "</section>";
    });

    htmlOut += '<nav class="chapter__nav" aria-label="Переход между главами">';
    if (prev) {
      htmlOut +=
        '<a href="#ch-' + prev.num + '" class="nav-prev"><span>← ' +
        chapterLabel(prev.num) + "</span><span>" + esc(prev.title) + "</span></a>";
    } else {
      htmlOut +=
        '<a href="#top" class="nav-prev"><span>← Начало</span><span>Обложка</span></a>';
    }
    if (next) {
      htmlOut +=
        '<a href="#ch-' + next.num + '" class="nav-next"><span>' +
        chapterLabel(next.num) + " →</span><span>" + esc(next.title) + "</span></a>";
    } else {
      htmlOut +=
        '<a href="#extra-0" class="nav-next"><span>Дальше →</span><span>Задания и благодарности</span></a>';
    }
    htmlOut += "</nav></article>";
  });

  data.extras.forEach(function (ex, i) {
    htmlOut +=
      '<article class="chapter chapter--extra" id="extra-' + i + '">' +
      (ex.lead || []).map(function (src) {
        return renderFigure(src, TOTAL, "figure--lead");
      }).join("") +
      '<header class="chapter__head">' +
      '<p class="chapter__label">' + (i === 0 ? "После книги" : "Финал") + "</p>" +
      '<h2 class="chapter__title">' + esc(ex.title) + "</h2>" +
      "</header><section class=\"sec\">" +
      renderBlocks(ex.blocks, TOTAL) +
      "</section></article>";
  });

  book.innerHTML = htmlOut;

  /* обложка: точные размеры, чтобы не было сдвига при загрузке */
  var coverImg = document.getElementById("coverImg");
  if (coverImg && data.cover) {
    coverImg.setAttribute("src", data.cover);
    if (dims[data.cover]) {
      coverImg.setAttribute("width", dims[data.cover][0]);
      coverImg.setAttribute("height", dims[data.cover][1]);
    }
  }

  /* ---------------- содержание ---------------- */

  var tocNav = document.getElementById("tocNav");
  var tocHtml = "";
  data.chapters.forEach(function (ch) {
    tocHtml +=
      '<a class="toc-item" href="#ch-' + ch.num + '" data-toc="ch-' + ch.num + '">' +
      '<span class="toc-item__num">' + String(ch.num).padStart(2, "0") + "</span>" +
      '<span class="toc-item__title">' + esc(ch.title) + "</span></a>";
  });
  data.extras.forEach(function (ex, i) {
    tocHtml +=
      '<a class="toc-item is-extra" href="#extra-' + i + '" data-toc="extra-' + i + '">' +
      '<span class="toc-item__num">' + (i === 0 ? "?" : "♥") + "</span>" +
      '<span class="toc-item__title">' + esc(ex.title) + "</span></a>";
  });
  tocNav.innerHTML = tocHtml;

  /* ---------------- фон: белый / чёрный ---------------- */

  var THEME_KEY = "dusya-theme";
  var themeButtons = document.querySelectorAll("[data-set-theme]");
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  var themeColors = { light: "#faf7f1", dark: "#0c1016" };

  function applyTheme(theme, persist) {
    html.setAttribute("data-theme", theme);
    themeButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.dataset.setTheme === theme ? "true" : "false");
    });
    if (metaTheme) metaTheme.setAttribute("content", themeColors[theme]);
    if (persist === false) return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.dataset.setTheme);
    });
  });

  applyTheme(html.getAttribute("data-theme") === "dark" ? "dark" : "light");

  /* ?theme=dark — разовая подсказка в адресе (не запоминается) */
  var urlTheme = /[?&]theme=(light|dark)\b/.exec(location.search);
  if (urlTheme) applyTheme(urlTheme[1], false);

  var heroTheme = document.getElementById("heroTheme");
  if (heroTheme) {
    heroTheme.addEventListener("click", function () {
      applyTheme(html.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------------- размер текста ---------------- */

  var FS_KEY = "dusya-fs";
  var fsLevel = 2;
  try {
    var saved = parseInt(localStorage.getItem(FS_KEY), 10);
    if (saved >= 1 && saved <= 4) fsLevel = saved;
  } catch (e) {}

  function applyFs(level) {
    fsLevel = Math.min(4, Math.max(1, level));
    html.setAttribute("data-fs", String(fsLevel));
    try {
      localStorage.setItem(FS_KEY, String(fsLevel));
    } catch (e) {}
  }
  applyFs(fsLevel);

  var fsUp = document.getElementById("fsUp");
  var fsDown = document.getElementById("fsDown");
  if (fsUp) fsUp.addEventListener("click", function () { applyFs(fsLevel + 1); });
  if (fsDown) fsDown.addEventListener("click", function () { applyFs(fsLevel - 1); });

  /* ---------------- полоса прогресса и липкая панель ---------------- */

  var bar = document.getElementById("progressBar");
  var topbar = document.getElementById("topbar");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop;
      if (bar) bar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
      if (topbar) topbar.classList.toggle("is-stuck", y > 30);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------------- содержание: открыть / закрыть ---------------- */

  var drawer = document.getElementById("toc");
  var scrim = document.getElementById("scrim");
  var tocBtn = document.getElementById("tocBtn");
  var tocClose = document.getElementById("tocClose");
  var lastFocus = null;

  function openToc() {
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    tocBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var first = drawer.querySelector("a, button");
    if (first) first.focus({ preventScroll: true });
  }

  function closeToc() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    tocBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  if (tocBtn) {
    tocBtn.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) closeToc();
      else openToc();
    });
  }
  if (tocClose) tocClose.addEventListener("click", closeToc);
  if (scrim) scrim.addEventListener("click", closeToc);
  tocNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeToc();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (drawer.classList.contains("is-open")) closeToc();
      if (lightbox && !lightbox.hidden) closeLightbox();
    }
  });

  /* ---------------- просмотр иллюстраций ---------------- */

  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxClose = document.getElementById("lightboxClose");

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  book.addEventListener("click", function (e) {
    var img = e.target.closest("img[data-zoom]");
    if (img) openLightbox(img.getAttribute("src"), img.alt);
  });
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------------- активная глава в содержании ---------------- */

  var tocLinks = tocNav.querySelectorAll(".toc-item");
  var sections = book.querySelectorAll("article.chapter");

  if ("IntersectionObserver" in window) {
    var visible = new Set();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) visible.add(en.target.id);
          else visible.delete(en.target.id);
        });
        var active = null;
        sections.forEach(function (s) {
          if (!active && visible.has(s.id)) active = s.id;
        });
        tocLinks.forEach(function (a) {
          var on = active && a.dataset.toc === active;
          a.classList.toggle("is-active", !!on);
          if (on) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- мелочи ---------------- */

  // заголовок вкладки по текущей главе
  var baseTitle = document.title;
  if ("IntersectionObserver" in window) {
    var titleIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var t = en.target.querySelector(".chapter__title");
            document.title = t ? t.textContent + " — " + baseTitle.split(" — ")[0] : baseTitle;
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) { titleIO.observe(s); });
  }

  // плавный переход к якорю без «прыжка» при загрузке
  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target) setTimeout(function () {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }, 60);
  }
})();
