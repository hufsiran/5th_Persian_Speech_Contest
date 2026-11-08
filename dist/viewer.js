import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const PDF_URL = "./assets/persian-speech-contest-booklet.pdf";
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.2;

const els = {
  canvas: document.querySelector("#pdfCanvas"),
  pageCard: document.querySelector("#pageCard"),
  pageStage: document.querySelector("#pageStage"),
  stageWrap: document.querySelector("#stageWrap"),
  loading: document.querySelector("#loading"),
  loadingText: document.querySelector("#loadingText"),
  pageInput: document.querySelector("#pageInput"),
  pageCount: document.querySelector("#pageCount"),
  zoomValue: document.querySelector("#zoomValue"),
  prev: [document.querySelector("#prevPage"), document.querySelector("#edgePrev")],
  next: [document.querySelector("#nextPage"), document.querySelector("#edgeNext")],
  first: document.querySelector("#firstPage"),
  last: document.querySelector("#lastPage"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomIn: document.querySelector("#zoomIn"),
  fit: document.querySelector("#fitPage"),
  brand: document.querySelector(".brand"),
};

const state = {
  pdf: null,
  leaves: [],
  page: 1,
  zoom: 1,
  fitScale: 1,
  rendering: false,
  pendingPage: null,
  direction: "next",
  renderTask: null,
  resizeTimer: null,
  touchStartX: null,
};

const ctx = els.canvas.getContext("2d", { alpha: false });

function setLoading(message, isError = false) {
  els.loadingText.textContent = message;
  els.loading.classList.toggle("error", isError);
  els.loading.classList.remove("hidden");
}

function hideLoading() {
  els.loading.classList.add("hidden");
}

function updateControls() {
  if (!state.pdf) return;
  els.pageInput.value = String(state.page);
  els.pageInput.max = String(state.leaves.length);
  els.pageCount.textContent = String(state.leaves.length);
  els.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;

  [...els.prev, els.first].forEach((button) => { button.disabled = state.page <= 1; });
  [...els.next, els.last].forEach((button) => { button.disabled = state.page >= state.leaves.length; });
  els.zoomOut.disabled = state.zoom <= MIN_ZOOM + 0.01;
  els.zoomIn.disabled = state.zoom >= MAX_ZOOM - 0.01;
}

function getAvailableSize() {
  const styles = getComputedStyle(els.pageStage);
  const width = els.pageStage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight) - 4;
  const height = els.pageStage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom) - 4;
  return { width: Math.max(width, 120), height: Math.max(height, 160) };
}

async function calculateFitScale(page) {
  const viewport = page.getViewport({ scale: 1 });
  const available = getAvailableSize();
  return Math.min(available.width / viewport.width, available.height / viewport.height);
}

function animateTurn(direction) {
  const className = direction === "prev" ? "turn-prev" : "turn-next";
  els.pageCard.classList.remove("turn-prev", "turn-next");
  void els.pageCard.offsetWidth;
  els.pageCard.classList.add(className);
}

async function renderPage(pageNumber, animate = false) {
  if (!state.pdf) return;
  if (state.rendering) {
    state.pendingPage = pageNumber;
    return;
  }

  state.rendering = true;
  if (state.page === pageNumber && !animate) setLoading("페이지를 정리하는 중입니다");

  try {
    const leaf = state.leaves[pageNumber - 1];
    const page = await state.pdf.getPage(leaf.pdfPage);
    const base = page.getViewport({ scale: 1 });
    const available = getAvailableSize();
    state.fitScale = Math.min(available.width / (base.width / leaf.parts), available.height / base.height);
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: state.fitScale * state.zoom });

    const buffer = document.createElement("canvas");
    buffer.width = Math.ceil(viewport.width / leaf.parts * outputScale);
    buffer.height = Math.ceil(viewport.height * outputScale);

    if (state.renderTask) state.renderTask.cancel();
    state.renderTask = page.render({
      canvasContext: buffer.getContext("2d", { alpha: false }),
      viewport,
      transform: [outputScale, 0, 0, outputScale, -leaf.part * viewport.width / leaf.parts * outputScale, 0],
    });
    await state.renderTask.promise;

    const oldSheet = animate ? els.canvas.cloneNode() : null;
    if (oldSheet) {
      oldSheet.removeAttribute("id");
      oldSheet.setAttribute("aria-hidden", "true");
      oldSheet.getContext("2d").drawImage(els.canvas, 0, 0);
      oldSheet.className = `turning-sheet ${state.direction === "prev" ? "sheet-prev" : "sheet-next"}`;
    }
    els.canvas.width = buffer.width;
    els.canvas.height = buffer.height;
    els.canvas.style.width = `${viewport.width / leaf.parts}px`;
    els.canvas.style.height = `${viewport.height}px`;
    ctx.drawImage(buffer, 0, 0);
    if (oldSheet && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.pageCard.append(oldSheet);
      await oldSheet.animate([
        { transform: "rotateY(0deg)", filter: "brightness(1)", opacity: 1 },
        { transform: `rotateY(${state.direction === "prev" ? 88 : -88}deg)`, filter: "brightness(.65)", opacity: 0 }
      ], { duration: 560, easing: "cubic-bezier(.32,.05,.24,1)", fill: "forwards" }).finished;
      oldSheet.remove();
    }

    state.page = pageNumber;
    updateControls();
    hideLoading();
  } catch (error) {
    if (error?.name !== "RenderingCancelledException") {
      console.error(error);
      setLoading("페이지를 표시하지 못했습니다. 새로고침해 주세요.", true);
    }
  } finally {
    state.rendering = false;
    state.renderTask = null;
    if (state.pendingPage !== null) {
      const nextPage = state.pendingPage;
      state.pendingPage = null;
      renderPage(nextPage, true);
    }
  }
}

function goToPage(pageNumber, direction) {
  if (!state.pdf) return;
  if (!Number.isFinite(pageNumber)) return;
  const target = Math.min(Math.max(Math.round(pageNumber), 1), state.leaves.length);
  if (target === state.page) {
    els.pageInput.value = String(state.page);
    return;
  }
  state.direction = direction || (target > state.page ? "next" : "prev");
  renderPage(target, true);
}

function changeZoom(delta) {
  const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((state.zoom + delta).toFixed(2))));
  if (nextZoom === state.zoom) return;
  state.zoom = nextZoom;
  updateControls();
  renderPage(state.page);
}

function resetZoom() {
  state.zoom = 1;
  updateControls();
  renderPage(state.page);
}

function bindEvents() {
  els.prev.forEach((button) => button.addEventListener("click", () => goToPage(state.page - 1, "prev")));
  els.next.forEach((button) => button.addEventListener("click", () => goToPage(state.page + 1, "next")));
  els.first.addEventListener("click", () => goToPage(1, "prev"));
  els.last.addEventListener("click", () => goToPage(state.leaves.length || 1, "next"));
  els.zoomOut.addEventListener("click", () => changeZoom(-ZOOM_STEP));
  els.zoomIn.addEventListener("click", () => changeZoom(ZOOM_STEP));
  els.fit.addEventListener("click", resetZoom);
  els.brand.addEventListener("click", (event) => { event.preventDefault(); goToPage(1, "prev"); });

  els.pageInput.addEventListener("change", () => goToPage(Number(els.pageInput.value)));
  els.pageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); goToPage(Number(els.pageInput.value)); els.pageInput.blur(); }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "ArrowLeft" || event.key === "PageUp") goToPage(state.page - 1, "prev");
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") { event.preventDefault(); goToPage(state.page + 1, "next"); }
    if (event.key === "Home") goToPage(1, "prev");
    if (event.key === "End") goToPage(state.leaves.length || 1, "next");
    if (event.key === "+" || event.key === "=") changeZoom(ZOOM_STEP);
    if (event.key === "-" || event.key === "_") changeZoom(-ZOOM_STEP);
    if (event.key === "0") resetZoom();
  });

  els.pageStage.addEventListener("touchstart", (event) => { state.touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
  els.pageStage.addEventListener("touchend", (event) => {
    if (state.touchStartX === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? state.touchStartX) - state.touchStartX;
    if (state.zoom <= 1 && Math.abs(distance) > 54) goToPage(state.page + (distance < 0 ? 1 : -1), distance < 0 ? "next" : "prev");
    state.touchStartX = null;
  }, { passive: true });

  window.addEventListener("resize", () => {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => renderPage(state.page), 160);
  });
}

async function init() {
  bindEvents();
  try {
    const loadingTask = pdfjsLib.getDocument(PDF_URL);
    state.pdf = await loadingTask.promise;
    for (let n = 1; n <= state.pdf.numPages; n++) {
      const page = await state.pdf.getPage(n);
      const size = page.getViewport({ scale: 1 });
      const parts = size.width > size.height ? 2 : 1;
      for (let part = 0; part < parts; part++) state.leaves.push({ pdfPage: n, part, parts });
    }
    els.pageCount.textContent = String(state.leaves.length);
    await renderPage(1);
  } catch (error) {
    console.error(error);
    setLoading("자료집을 불러오지 못했습니다. 파일 경로를 확인해 주세요.", true);
  }
}

init();
