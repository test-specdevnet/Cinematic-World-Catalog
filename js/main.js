(function () {
  "use strict";

  const DATA_URL = "/data/chapters.json";
  const ASSET_VERSION = "20260530-chapter-3";
  const page = document.body.dataset.page;
  let activeLorePlayback = null;

  document.addEventListener("DOMContentLoaded", initAtlas);

  async function initAtlas() {
    if (page === "index") {
      await renderIndex();
      return;
    }

    if (page === "chapter") {
      await renderChapterPage();
    }
  }

  async function fetchChapters() {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Chapter data could not be loaded.");
    }

    const chapters = await response.json();
    if (!Array.isArray(chapters)) {
      throw new Error("Chapter data is not an array.");
    }

    return chapters;
  }

  async function renderIndex() {
    try {
      const chapters = await fetchChapters();
      renderTableOfContents(chapters);
      setupCoverControls();
      setupScrollControls();
    } catch (error) {
      renderIndexError(error);
    }
  }

  function renderTableOfContents(chapters) {
    const mount = document.querySelector("[data-toc-list]");
    if (!mount) return;

    const list = createElement("div", { className: "toc-list" });

    chapters.forEach((chapter) => {
      const isPublished = chapter.status === "published";
      const entry = createElement(isPublished ? "a" : "div", {
        className: `toc-entry${isPublished ? "" : " is-locked"}`,
      });

      entry.style.setProperty("--accent", chapter.accentColor || "var(--gold)");

      if (isPublished) {
        entry.href = chapterHref(chapter.slug);
        entry.setAttribute("aria-label", `Open chapter ${chapter.chapterNumber}: ${chapter.title}`);
      } else {
        entry.setAttribute("aria-disabled", "true");
      }

      entry.append(
        createImageFrame(chapter.coverImage, `${chapter.title} thumbnail`, "toc-thumb", {
          fallbackLabel: `${chapter.shortTitle || chapter.title} image pending`,
        }),
        createTocCopy(chapter),
        createElement("span", { className: "toc-number", text: padChapter(chapter.chapterNumber) })
      );

      list.append(entry);
    });

    mount.replaceChildren(list);
  }

  function createTocCopy(chapter) {
    const copy = createElement("div", { className: "toc-copy" });
    copy.append(
      createElement("span", { className: "chapter-eyebrow", text: `Chapter ${chapter.chapterNumber}` }),
      createElement("strong", { text: chapter.title }),
      createElement("span", { text: chapter.tagline }),
      createElement("span", {
        className: "status-pill",
        text: chapter.status === "published" ? "Published" : "Coming soon",
      })
    );
    return copy;
  }

  async function renderChapterPage() {
    const root = document.querySelector("[data-chapter-root]");
    if (!root) return;

    try {
      const chapters = await fetchChapters();
      const slug = new URLSearchParams(window.location.search).get("slug");

      if (!slug) {
        renderChapterError(root, "No chapter selected.", "Return to the table of contents and choose a world.");
        return;
      }

      const chapter = getChapterBySlug(chapters, slug);
      if (!chapter) {
        renderChapterError(root, "Chapter not found.", "The atlas could not find a world for this address.");
        return;
      }

      if (chapter.status === "coming-soon") {
        renderComingSoonChapter(root, chapter);
        return;
      }

      renderPublishedChapter(root, chapter, chapters);
    } catch (error) {
      renderChapterError(root, "The atlas could not open.", error.message || "Chapter data failed to load.");
    }
  }

  function renderPublishedChapter(root, chapter, chapters) {
    const published = getPublishedChapters(chapters);
    const currentIndex = published.findIndex((item) => item.slug === chapter.slug);
    const previousChapter = currentIndex > 0 ? published[currentIndex - 1] : null;
    const nextChapter = currentIndex < published.length - 1 ? published[currentIndex + 1] : null;

    root.style.setProperty("--accent", chapter.accentColor || "var(--gold)");
    updateChapterMetadata(chapter);
    root.replaceChildren(
      createPageTurn(previousChapter, "prev"),
      createChapterOpening(chapter),
      createPageTurn(nextChapter, "next"),
      createChapterContinuation(chapter, previousChapter, nextChapter)
    );

    setupThumbnailGallery(root);
    setupCopyPromptButtons(root);
    setupLorePlayback(root);
    setupChapterKeyboardNavigation(previousChapter, nextChapter);
  }

  function createChapterOpening(chapter) {
    const section = createElement("section", {
      className: "chapter-opening",
      "aria-labelledby": "chapter-title",
    });
    const spread = createElement("div", { className: "chapter-spread" });

    spread.append(createImagePage(chapter), createTextPage(chapter));
    section.append(spread);
    return section;
  }

  function createImagePage(chapter) {
    const pageElement = createElement("div", { className: "book-page image-page" });
    const hero = createImageFrame(chapter.coverImage, `${chapter.title} primary world image`, "hero-image-frame", {
      eager: true,
      fallbackLabel: `${chapter.title} primary image pending`,
    });
    hero.dataset.heroFrame = "true";

    const rail = createElement("div", { className: "thumbnail-rail", "aria-label": "Chapter image thumbnails" });
    chapter.images.forEach((image, index) => {
      const button = createElement("button", {
        className: "thumb-button",
        type: "button",
        "aria-label": `Show ${chapter.title} image ${index + 1}`,
        "aria-pressed": index === 0 ? "true" : "false",
      });
      button.dataset.imageSrc = versionAssetSrc(image);
      button.dataset.imageAlt = `${chapter.title} image ${index + 1}: ${chapter.promptLabels[index] || "world view"}`;
      button.append(
        createImageFrame(image, `${chapter.title} thumbnail ${index + 1}`, "thumb-image-frame", {
          fallbackLabel: `Image ${index + 1}`,
        })
      );
      rail.append(button);
    });

    pageElement.append(hero, rail);
    return pageElement;
  }

  function createTextPage(chapter) {
    const pageElement = createElement("div", { className: "book-page text-page" });
    const scroll = createElement("div", { className: "chapter-scroll" });

    scroll.append(
      createChapterTitleGroup(chapter),
      createLoreBlock(chapter),
      createChapterVideo(chapter),
      createPromptList(chapter),
      createPromptDna(chapter)
    );

    pageElement.append(scroll);
    return pageElement;
  }

  function createChapterTitleGroup(chapter) {
    const group = createElement("div", { className: "chapter-title-group" });
    group.append(
      createElement("span", { className: "chapter-eyebrow", text: `Chapter ${chapter.chapterNumber}` }),
      createElement("h1", { id: "chapter-title", text: chapter.title }),
      createElement("p", { text: chapter.tagline })
    );
    return group;
  }

  function createChapterMeta(chapter) {
    const list = createElement("dl", { className: "chapter-meta" });
    list.append(createDefinition("Theme", chapter.theme), createDefinition("Instagram Seed", chapter.instagramCaptionSeed));
    return list;
  }

  function createDefinition(term, definition) {
    const row = createElement("div");
    row.append(createElement("dt", { text: term }), createElement("dd", { text: definition || "Awaiting entry" }));
    return row;
  }

  function createLoreBlock(chapter) {
    const group = createElement("section", { className: "content-group lore-block", "aria-labelledby": "lore-title" });
    const header = createElement("div", { className: "lore-heading-row" });
    header.append(createElement("h2", { id: "lore-title", text: "Lore" }), createLoreListenControls(chapter));
    group.append(header);

    chapter.lore.forEach((entry) => {
      if (typeof entry === "object" && entry.type === "subheader") {
        group.append(createElement("h3", { className: "lore-subheader", text: entry.text }));
        return;
      }

      group.append(createElement("p", { text: entry }));
    });

    return group;
  }

  function createLoreListenControls(chapter) {
    const text = getLoreSpeechText(chapter);
    if (!text) return document.createDocumentFragment();

    const controls = createElement("div", { className: "lore-listen-controls", "data-lore-listen": "true" });
    const statusId = `lore-listen-status-${chapter.id}`;
    const button = createElement("button", {
      className: "lore-listen-button",
      type: "button",
      "aria-label": `Listen to lore for ${chapter.title}`,
      "aria-pressed": "false",
      "aria-describedby": statusId,
      text: "Listen to Lore",
    });
    const status = createElement("span", {
      className: "lore-listen-status",
      id: statusId,
      "aria-live": "polite",
    });

    button.dataset.loreText = text;
    controls.append(button, status);
    return controls;
  }

  function getLoreSpeechText(chapter) {
    return (chapter.lore || [])
      .map((entry) => {
        if (typeof entry === "object" && entry.type === "subheader") return entry.text;
        return entry;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  function createTagGroup(title, tags) {
    const group = createElement("section", { className: "content-group", "aria-label": title });
    const list = createElement("div", { className: "tag-list" });
    tags.forEach((tag) => list.append(createElement("span", { text: tag })));
    group.append(createElement("h2", { text: title }), list);
    return group;
  }

  function createChapterVideo(chapter) {
    const videos = getChapterVideos(chapter);
    if (!videos.length) return document.createDocumentFragment();

    const titleId = `chapter-video-title-${chapter.id}`;
    const group = createElement("section", {
      className: "content-group chapter-video-block",
      "aria-labelledby": titleId,
    });
    const videoList = createElement("div", {
      className: videos.length === 1 ? "chapter-video-list is-single" : "chapter-video-list",
    });

    group.append(
      createElement("div", { className: "section-kicker", text: "Cinematic Preview" }),
      createElement("h2", { id: titleId, text: "World Motion Study" })
    );

    videos.forEach((video, index) => {
      const label = video.label || `${chapter.title} cinematic video ${index + 1}`;
      const frame = createElement("figure", { className: "chapter-video-frame" });
      const player = createElement("video", {
        controls: "",
        playsinline: "",
        preload: "metadata",
        poster: versionAssetSrc(video.poster || chapter.coverImage || ""),
        "aria-label": label,
      });
      const source = createElement("source", {
        src: versionAssetSrc(video.src),
        type: "video/mp4",
      });

      player.append(source, document.createTextNode("Your browser does not support embedded video."));
      frame.append(player);
      videoList.append(frame);
    });

    group.append(videoList);
    return group;
  }

  function getChapterVideos(chapter) {
    if (Array.isArray(chapter.videos)) {
      return chapter.videos.filter((video) => video && video.src);
    }

    if (chapter.video && chapter.video.src) {
      return [chapter.video];
    }

    return [];
  }

  function createPromptList(chapter) {
    const group = createElement("section", { className: "content-group", "aria-labelledby": "prompt-title" });
    const list = createElement("div", { className: "prompt-list" });

    chapter.prompts.forEach((prompt, index) => {
      const label = chapter.promptLabels[index] || `Prompt ${index + 1}`;
      const card = createElement("article", { className: "prompt-card" });
      const status = createElement("span", { className: "copy-status", "aria-live": "polite" });
      const button = createElement("button", {
        className: "copy-button",
        type: "button",
        text: "Copy Prompt",
      });
      button.dataset.prompt = prompt;

      const row = createElement("div", { className: "copy-row" });
      row.append(button, status);

      card.append(
        createElement("h3", { text: label }),
        createElement("p", { text: prompt }),
        row
      );
      list.append(card);
    });

    group.append(createElement("h2", { id: "prompt-title", text: "Prompt Starters" }), list);
    return group;
  }

  function createPromptDna(chapter) {
    const group = createElement("section", {
      className: "content-group prompt-dna-block",
      "aria-labelledby": "prompt-dna-title",
    });
    const grid = createElement("div", { className: "prompt-dna-grid" });
    grid.append(createTagGroup("Visual DNA", chapter.visualDNA), createUseCases(chapter.useCases));

    group.append(
      createElement("span", { className: "chapter-eyebrow", text: "Creation Notes" }),
      createElement("h2", { id: "prompt-dna-title", text: "Prompt DNA" }),
      grid
    );
    return group;
  }

  function createChapterContinuation(chapter, previousChapter, nextChapter) {
    const wrap = createElement("section", { className: "chapter-continuation", "aria-label": "Chapter navigation" });
    const navPanel = createElement("div", { className: "chapter-panel chapter-nav-panel" });
    navPanel.append(createBottomNav(previousChapter, nextChapter));
    wrap.append(navPanel);
    return wrap;
  }

  function createUseCases(useCases) {
    const group = createElement("section", { className: "content-group", "aria-label": "Use cases" });
    const list = createElement("ul", { className: "use-list" });
    useCases.forEach((useCase) => {
      list.append(createElement("li", { text: useCase }));
    });
    group.append(createElement("h2", { text: "Use Cases" }), list);
    return group;
  }

  function createBottomNav(previousChapter, nextChapter) {
    const nav = createElement("nav", { className: "chapter-bottom-nav", "aria-label": "Chapter navigation" });
    nav.append(
      previousChapter
        ? createElement("a", {
            className: "button button-secondary",
            href: chapterHref(previousChapter.slug),
            text: `Previous: ${previousChapter.shortTitle}`,
          })
        : createElement("span", { className: "button button-secondary", text: "First Chapter", "aria-disabled": "true" }),
      createElement("a", { className: "button button-secondary", href: "/#contents", text: "Back to Atlas" }),
      nextChapter
        ? createElement("a", {
            className: "button button-secondary",
            href: chapterHref(nextChapter.slug),
            text: `Next: ${nextChapter.shortTitle}`,
          })
        : createElement("span", { className: "button button-secondary", text: "More Worlds Soon", "aria-disabled": "true" })
    );
    return nav;
  }

  function createPageTurn(targetChapter, direction) {
    const isPrevious = direction === "prev";
    const label = isPrevious ? "Previous chapter" : "Next chapter";
    const glyph = isPrevious ? "<" : ">";

    if (!targetChapter) {
      return createElement("span", {
        className: `page-turn ${direction}`,
        "aria-disabled": "true",
        "aria-label": label,
        text: glyph,
      });
    }

    return createElement("a", {
      className: `page-turn ${direction}`,
      href: chapterHref(targetChapter.slug),
      "aria-label": `${label}: ${targetChapter.title}`,
      text: glyph,
    });
  }

  function renderComingSoonChapter(root, chapter) {
    root.style.setProperty("--accent", chapter.accentColor || "var(--gold)");
    updateChapterMetadata(chapter);

    const section = createElement("section", { className: "state-section", "aria-labelledby": "coming-title" });
    const shell = createElement("div", { className: "section-shell final-shell" });

    shell.append(
      createElement("span", { className: "coming-soon-badge", text: "Coming soon" }),
      createElement("span", { className: "chapter-eyebrow", text: `Chapter ${chapter.chapterNumber}` }),
      createElement("h1", { id: "coming-title", text: chapter.title }),
      createElement("p", { text: chapter.tagline }),
      createElement("p", { text: `Theme: ${chapter.theme}` }),
      createElement("a", { className: "button button-primary", href: "/#contents", text: "Back to Contents" })
    );

    section.append(shell);
    root.replaceChildren(section);
  }

  function setupThumbnailGallery(root) {
    const frame = root.querySelector("[data-hero-frame]");
    const image = frame ? frame.querySelector("img") : null;
    const fallback = frame ? frame.querySelector(".missing-image") : null;
    const buttons = Array.from(root.querySelectorAll(".thumb-button"));

    if (!frame || !image || !buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");

        frame.classList.remove("image-is-missing");
        if (fallback) fallback.hidden = true;
        image.alt = button.dataset.imageAlt || image.alt;
        image.src = button.dataset.imageSrc || image.src;
      });
    });
  }

  function setupCopyPromptButtons(root) {
    const buttons = Array.from(root.querySelectorAll(".copy-button"));

    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".prompt-card");
        const status = card ? card.querySelector(".copy-status") : null;
        const originalText = "Copy Prompt";
        const prompt = button.dataset.prompt || "";

        button.disabled = true;
        try {
          await copyText(prompt);
          button.textContent = "Copied";
          button.classList.add("is-copied");
          if (status) status.textContent = "Prompt copied to clipboard.";
        } catch (error) {
          if (status) status.textContent = "Copy failed. Select the prompt text manually.";
        } finally {
          window.setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove("is-copied");
            if (status) status.textContent = "";
          }, 1600);
        }
      });
    });
  }

  function setupLorePlayback(root) {
    const controls = root.querySelector("[data-lore-listen]");
    if (!controls) return;

    const button = controls.querySelector(".lore-listen-button");
    const status = controls.querySelector(".lore-listen-status");
    const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    if (!button || !status) return;

    if (!canSpeak) {
      button.disabled = true;
      status.textContent = "Audio playback is not supported in this browser.";
      return;
    }

    button.addEventListener("click", () => {
      if (activeLorePlayback && activeLorePlayback.button === button) {
        stopLorePlayback("Lore audio stopped.");
        return;
      }

      startLorePlayback(button, status, button.dataset.loreText || "");
    });

    window.addEventListener("beforeunload", () => stopLorePlayback(""));
  }

  function startLorePlayback(button, status, text) {
    const chunks = splitLoreForSpeech(text);
    if (!chunks.length) {
      status.textContent = "No lore text is available to read aloud.";
      return;
    }

    stopLorePlayback("");
    activeLorePlayback = {
      button,
      chunks,
      index: 0,
      status,
      stopped: false,
    };

    button.textContent = "Stop Lore";
    button.classList.add("is-playing");
    button.setAttribute("aria-pressed", "true");
    status.textContent = "Preparing lore audio.";
    speakNextLoreChunk();
  }

  function speakNextLoreChunk() {
    const playback = activeLorePlayback;
    if (!playback || playback.stopped) return;

    if (playback.index >= playback.chunks.length) {
      resetLorePlayback(playback, "Lore reading finished.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(playback.chunks[playback.index]);
    utterance.rate = 0.96;
    utterance.pitch = 0.96;
    utterance.onstart = () => {
      if (activeLorePlayback === playback) {
        playback.status.textContent = `Reading lore section ${playback.index + 1} of ${playback.chunks.length}.`;
      }
    };
    utterance.onend = () => {
      if (activeLorePlayback !== playback || playback.stopped) return;
      playback.index += 1;
      speakNextLoreChunk();
    };
    utterance.onerror = () => {
      if (activeLorePlayback === playback && !playback.stopped) {
        resetLorePlayback(playback, "Lore audio stopped.");
      }
    };

    playback.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopLorePlayback(message) {
    if (!activeLorePlayback) return;

    const playback = activeLorePlayback;
    playback.stopped = true;
    activeLorePlayback = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    resetLoreButton(playback, message);
  }

  function resetLorePlayback(playback, message) {
    activeLorePlayback = null;
    resetLoreButton(playback, message);
  }

  function resetLoreButton(playback, message) {
    playback.button.textContent = "Listen to Lore";
    playback.button.classList.remove("is-playing");
    playback.button.setAttribute("aria-pressed", "false");
    if (message) playback.status.textContent = message;
  }

  function splitLoreForSpeech(text) {
    return text
      .split(/\n{2,}/)
      .flatMap((part) => splitLongSpeechPart(part.trim()))
      .filter(Boolean);
  }

  function splitLongSpeechPart(text) {
    if (text.length <= 260) return [text];

    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = "";

    sentences.forEach((sentence) => {
      const next = `${current} ${sentence.trim()}`.trim();
      if (next.length <= 260) {
        current = next;
        return;
      }

      if (current) chunks.push(current);
      current = sentence.trim();
    });

    if (current) chunks.push(current);
    return chunks;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-999px";
    document.body.append(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Clipboard fallback failed.");
    }
  }

  function setupChapterKeyboardNavigation(previousChapter, nextChapter) {
    document.body.dataset.previousChapterHref = previousChapter
      ? chapterHref(previousChapter.slug)
      : "";
    document.body.dataset.nextChapterHref = nextChapter ? chapterHref(nextChapter.slug) : "";

    if (document.body.dataset.keyboardNavigationBound === "true") return;
    document.body.dataset.keyboardNavigationBound = "true";

    document.addEventListener("keydown", (event) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(activeTag)) return;

      if (event.key === "ArrowLeft" && document.body.dataset.previousChapterHref) {
        window.location.href = document.body.dataset.previousChapterHref;
      }

      if (event.key === "ArrowRight" && document.body.dataset.nextChapterHref) {
        window.location.href = document.body.dataset.nextChapterHref;
      }
    });
  }

  function setupScrollControls() {
    const progress = document.querySelector("[data-section-progress]");
    const sections = Array.from(document.querySelectorAll(".index-main .snap-section"));
    if (!progress || !sections.length) return;

    const buttons = sections.map((section) => {
      const label = section.querySelector("h1, h2") ? section.querySelector("h1, h2").textContent : section.id;
      const button = createElement("button", {
        type: "button",
        "aria-label": `Scroll to ${label}`,
      });

      button.addEventListener("click", () => {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      progress.append(button);
      return button;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = sections.indexOf(entry.target);
          buttons.forEach((button, buttonIndex) => {
            if (buttonIndex === index) {
              button.setAttribute("aria-current", "true");
            } else {
              button.removeAttribute("aria-current");
            }
          });
        });
      },
      { threshold: 0.55 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function setupCoverControls() {
    const triggers = Array.from(document.querySelectorAll("[data-open-atlas]"));
    const closeTriggers = Array.from(document.querySelectorAll("[data-close-atlas]"));
    const stage = document.querySelector("[data-cover-stage]");
    const front = document.querySelector("[data-cover-front]");
    const contents = document.querySelector("[data-cover-interior]");
    const contentsTitle = document.getElementById("contents-title");
    if (!stage || !front || !contents || !triggers.length) return;

    const openAtlas = (event) => {
      event.preventDefault();
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.classList.add("is-open");
      front.hidden = true;
      contents.hidden = false;
      document.getElementById("cover").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", "#contents");
      } else {
        window.location.hash = "contents";
      }
      window.setTimeout(() => {
        if (contentsTitle) contentsTitle.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 220);
    };

    const closeAtlas = (event) => {
      if (event) event.preventDefault();
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.classList.remove("is-open");
      front.hidden = false;
      contents.hidden = true;
      document.getElementById("cover").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", "#cover");
      } else {
        window.location.hash = "cover";
      }
    };

    triggers.forEach((trigger) => trigger.addEventListener("click", openAtlas));
    closeTriggers.forEach((trigger) => trigger.addEventListener("click", closeAtlas));

    if (window.location.hash === "#contents") {
      stage.classList.add("is-open");
      front.hidden = true;
      contents.hidden = false;
    }
  }

  function createImageFrame(src, alt, className, options) {
    const frame = createElement("figure", { className });
    const fallback = createMissingImageFallback(options && options.fallbackLabel ? options.fallbackLabel : alt);
    const image = document.createElement("img");
    image.alt = alt || "";
    image.decoding = "async";

    if (options && options.eager) {
      image.loading = "eager";
      image.fetchPriority = "high";
    } else {
      image.loading = options && options.lazy === false ? "eager" : "lazy";
    }

    image.addEventListener("load", () => {
      frame.classList.remove("image-is-missing");
      fallback.hidden = true;
    });

    image.addEventListener("error", () => {
      frame.classList.add("image-is-missing");
      fallback.hidden = false;
    });

    fallback.hidden = Boolean(src);
    if (src) {
      image.src = versionAssetSrc(src);
    } else {
      frame.classList.add("image-is-missing");
      fallback.hidden = false;
    }

    frame.append(image, fallback);
    return frame;
  }

  function createMissingImageFallback(label) {
    const fallback = createElement("div", { className: "missing-image" });
    fallback.append(createElement("span", { text: label || "Image awaiting placement" }));
    return fallback;
  }

  function versionAssetSrc(src) {
    if (!src || /^https?:\/\//i.test(src) || /^data:/i.test(src)) {
      return src;
    }

    const rootPath = src.startsWith("/") ? src : `/${src}`;

    if (
      rootPath.startsWith("/assets/images/") ||
      rootPath.startsWith("/assets/videos/") ||
      rootPath.startsWith("/docs/reference/")
    ) {
      const cleanPath = rootPath.replace(/[?&]v=[^&]+/, "");
      const separator = cleanPath.includes("?") ? "&" : "?";
      return `${cleanPath}${separator}v=${ASSET_VERSION}`;
    }

    return rootPath;
  }

  function renderIndexError(error) {
    const mounts = [document.querySelector("[data-toc-list]")].filter(Boolean);
    mounts.forEach((mount) => {
      mount.replaceChildren(
        createElement("p", {
          className: "error-note",
          text: error.message || "The atlas data could not be loaded.",
        })
      );
    });
  }

  function renderChapterError(root, title, message) {
    const section = createElement("section", { className: "state-section", "aria-labelledby": "error-title" });
    const shell = createElement("div", { className: "section-shell final-shell" });

    shell.append(
      createElement("span", { className: "coming-soon-badge", text: "Atlas notice" }),
      createElement("h1", { id: "error-title", text: title }),
      createElement("p", { text: message }),
      createElement("a", { className: "button button-primary", href: "/#contents", text: "Back to Contents" })
    );

    section.append(shell);
    root.replaceChildren(section);
  }

  function updateChapterMetadata(chapter) {
    const title = `${chapter.title} | The Cinematic Worlds Atlas`;
    const description = chapter.tagline || "Explore a cinematic AI world chapter from The Cinematic Worlds Atlas.";

    document.title = title;
    setMeta("description", description);
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setPropertyMeta("og:title", title);
    setPropertyMeta("og:description", description);

    if (chapter.coverImage) {
      setPropertyMeta("og:image", chapter.coverImage);
    }
  }

  function setMeta(name, content) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) meta.setAttribute("content", content);
  }

  function setPropertyMeta(property, content) {
    const meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) meta.setAttribute("content", content);
  }

  function getChapterBySlug(chapters, slug) {
    return chapters.find((chapter) => chapter.slug === slug);
  }

  function getPublishedChapters(chapters) {
    return chapters.filter((chapter) => chapter.status === "published");
  }

  function createElement(tagName, attributes) {
    const element = document.createElement(tagName);
    const attrs = attributes || {};

    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === "className") {
        element.className = value;
        return;
      }
      if (key === "text") {
        element.textContent = value;
        return;
      }
      element.setAttribute(key, value);
    });

    return element;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function padChapter(number) {
    return String(number).padStart(2, "0");
  }

  function chapterHref(slug) {
    return `/chapter/?slug=${encodeURIComponent(slug)}`;
  }

  window.CinematicWorldsAtlas = {
    fetchChapters,
    renderIndex,
    renderTableOfContents,
    renderChapterPage,
    renderComingSoonChapter,
    createChapterVideo,
    setupScrollControls,
    setupThumbnailGallery,
    setupCopyPromptButtons,
    setupLorePlayback,
    getChapterBySlug,
    getPublishedChapters,
    createMissingImageFallback,
    escapeHTML,
  };
})();
