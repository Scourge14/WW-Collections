const collections = window.WW_COLLECTIONS;
const controls = window.WW_CONTROLS;

const state = {
  collectionId: "editorial",
  presetName: "Filtre Yok",
  presetFilter: "Tümü",
  presetSearch: "",
  values: {},
  image: null,
  original: null,
  analysis: null,
  aiPick: null,
  fitMode: true,
  showingBefore: false,
  thumbnailCache: new Map(),
  thumbnailObserver: null,
  drawFrame: 0
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  emptyUploadBtn: document.querySelector("#emptyUploadBtn"),
  dropzone: document.querySelector("#dropzone"),
  collectionTabs: document.querySelector("#collectionTabs"),
  presetSearch: document.querySelector("#presetSearch"),
  presetFilters: document.querySelector("#presetFilters"),
  presetList: document.querySelector("#presetList"),
  controls: document.querySelector("#controls"),
  canvas: document.querySelector("#canvas"),
  emptyState: document.querySelector("#emptyState"),
  fileMeta: document.querySelector("#fileMeta"),
  presetMeta: document.querySelector("#presetMeta"),
  analysisMeta: document.querySelector("#analysisMeta"),
  aiTitle: document.querySelector("#aiTitle"),
  aiReason: document.querySelector("#aiReason"),
  resetBtn: document.querySelector("#resetBtn"),
  beforeBtn: document.querySelector("#beforeBtn"),
  stageBeforeBtn: document.querySelector("#stageBeforeBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  fitBtn: document.querySelector("#fitBtn"),
  applyAiBtn: document.querySelector("#applyAiBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  randomBtn: document.querySelector("#randomBtn")
};

const ctx = els.canvas.getContext("2d", { willReadFrequently: true });

function currentCollection() {
  return collections.find(collection => collection.id === state.collectionId);
}

function currentPreset() {
  return currentCollection().presets.find(preset => preset.name === state.presetName) || {
    name: "Filtre Yok",
    values: {}
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setPreset(preset) {
  state.presetName = preset.name;
  state.values = withControlDefaults(preset.values);
  renderControls();
  renderPresets();
  scheduleDraw();
}

function scheduleDraw() {
  if (state.drawFrame) return;
  state.drawFrame = window.requestAnimationFrame(() => {
    state.drawFrame = 0;
    draw();
  });
}

function presetCategory(preset, collection = currentCollection()) {
  const text = `${collection.name} ${collection.mood} ${preset.name} ${preset.desc}`.toLowerCase();
  if (collection.id === "film") return "Film";
  if (collection.id === "outdoor") return "Dış";
  if (collection.id === "indoor") return "İç";
  if (collection.id === "product") return "Ürün";
  if (collection.id === "portrait") return "Portre";
  if (collection.id === "night") return "Gece";
  if (collection.id === "vintage") {
    if (text.includes("2000") || text.includes("y2k") || text.includes("digicam") || text.includes("camcorder") || text.includes("vhs")) return "2000ler";
    return "Vintage";
  }
  if (text.includes("2000") || text.includes("y2k") || text.includes("digicam") || text.includes("camcorder") || text.includes("vhs")) return "2000ler";
  if (text.includes("vintage") || text.includes("retro") || text.includes("nostalji") || text.includes("eski") || text.includes("disposable")) return "Vintage";
  if (text.includes("dış") || text.includes("outdoor") || text.includes("seyahat") || text.includes("doğa") || text.includes("gün ışığı") || text.includes("golden")) return "Dış";
  if (text.includes("iç") || text.includes("indoor") || text.includes("kafe") || text.includes("ev") || text.includes("stüdyo") || text.includes("softbox")) return "İç";
  if (text.includes("ürün") || text.includes("reels") || text.includes("e-ticaret") || text.includes("detay")) return "Ürün";
  if (text.includes("film") || text.includes("kodak") || text.includes("fuji") || text.includes("portra") || text.includes("analog") || text.includes("tri-x")) return "Film";
  if (text.includes("portre") || text.includes("cilt") || text.includes("beauty") || text.includes("moda")) return "Portre";
  if (text.includes("gece") || text.includes("neon") || text.includes("flaş") || text.includes("düşük ışık") || text.includes("karanlık")) return "Gece";
  if (text.includes("sokak") || text.includes("şehir") || text.includes("metro") || text.includes("asfalt")) return "Sokak";
  return "Günlük";
}

function renderPresetFilters() {
  const filters = ["Tümü", "Günlük", "Sokak", "Portre", "Gece", "Film", "Vintage", "2000ler", "Dış", "İç", "Ürün"];
  const counts = currentCollection().presets.reduce((map, preset) => {
    const category = presetCategory(preset);
    map[category] = (map[category] || 0) + 1;
    return map;
  }, {});
  const visibleFilters = filters.filter(filter => filter === "Tümü" || counts[filter]);
  if (state.presetFilter !== "Tümü" && !counts[state.presetFilter]) {
    state.presetFilter = "Tümü";
  }
  els.presetFilters.innerHTML = "";
  visibleFilters.forEach(filter => {
    const button = document.createElement("button");
    button.className = `chip${filter === state.presetFilter ? " active" : ""}`;
    button.type = "button";
    button.textContent = filter === "Tümü" ? `Tümü ${currentCollection().presets.length}` : `${filter} ${counts[filter]}`;
    button.addEventListener("click", () => {
      state.presetFilter = filter;
      renderPresetFilters();
      renderPresets();
    });
    els.presetFilters.appendChild(button);
  });
}

function allControlItems() {
  return controls.flatMap(group => group.items);
}

function withControlDefaults(values = {}) {
  return allControlItems().reduce((recipe, [key]) => {
    recipe[key] = values[key] ?? 0;
    return recipe;
  }, {});
}

function renderCollections() {
  els.collectionTabs.innerHTML = "";
  collections.forEach(collection => {
    const button = document.createElement("button");
    button.className = `tab${collection.id === state.collectionId ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span><strong>${collection.name}</strong><small>${collection.mood}</small></span><span>${collection.presets.length}</span>`;
    button.addEventListener("click", () => {
      state.collectionId = collection.id;
      state.presetFilter = "Tümü";
      state.presetSearch = "";
      els.presetSearch.value = "";
      setPreset(collection.presets[0]);
      renderPresetFilters();
      renderCollections();
    });
    els.collectionTabs.appendChild(button);
  });
}

function renderPresets() {
  els.presetList.innerHTML = "";
  const query = state.presetSearch.trim().toLowerCase();
  const filteredPresets = currentCollection().presets.filter(preset => {
    const category = presetCategory(preset);
    const text = `${preset.name} ${preset.desc} ${category}`.toLowerCase();
    const matchesFilter = state.presetFilter === "Tümü" || category === state.presetFilter;
    const matchesSearch = !query || text.includes(query);
    return matchesFilter && matchesSearch;
  });

  if (!filteredPresets.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Bu aramada preset bulunamadı.";
    els.presetList.appendChild(empty);
  }

  filteredPresets.forEach(preset => {
    const button = document.createElement("button");
    button.className = `preset${preset.name === state.presetName ? " active" : ""}`;
    button.type = "button";
    const swatches = preset.colors.map(color => `<span class="swatch" style="background:${color}"></span>`).join("");
    const category = presetCategory(preset);
    button.innerHTML = `
      <canvas class="preset-preview" width="160" height="112" aria-hidden="true"></canvas>
      <div class="preset-copy">
        <div class="preset-top"><strong>${preset.name}</strong><span class="preset-tag">${category}</span></div>
        <small>${preset.desc}</small>
        <div class="swatches">${swatches}</div>
      </div>`;
    button.addEventListener("click", () => setPreset(preset));
    els.presetList.appendChild(button);
    queuePresetPreview(button.querySelector(".preset-preview"), preset);
  });
  els.presetMeta.textContent = state.presetName === "Filtre Yok" ? "Preset: Filtre Yok" : `Preset: ${state.presetName}`;
}

function queuePresetPreview(canvas, preset) {
  renderPlaceholderPreview(canvas, preset);
  if (!state.image) return;
  if (!("IntersectionObserver" in window)) {
    window.requestIdleCallback?.(() => renderPresetPreview(canvas, preset)) || window.setTimeout(() => renderPresetPreview(canvas, preset), 120);
    return;
  }
  if (!state.thumbnailObserver) {
    state.thumbnailObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        state.thumbnailObserver.unobserve(entry.target);
        renderPresetPreview(entry.target, entry.target.__preset);
      });
    }, { root: els.presetList, rootMargin: "180px 0px", threshold: .01 });
  }
  canvas.__preset = preset;
  state.thumbnailObserver.observe(canvas);
}

function renderPlaceholderPreview(canvas, preset) {
  const preview = canvas.getContext("2d");
  const gradient = preview.createLinearGradient(0, 0, canvas.width, canvas.height);
  preset.colors.forEach((color, index) => {
    gradient.addColorStop(index / Math.max(1, preset.colors.length - 1), color);
  });
  preview.fillStyle = gradient;
  preview.fillRect(0, 0, canvas.width, canvas.height);
}

function renderPresetPreview(canvas, preset) {
  const key = `${state.original || "empty"}:${preset.name}`;
  const cached = state.thumbnailCache.get(key);
  if (cached) {
    const image = new Image();
    image.onload = () => canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = cached;
    return;
  }
  const preview = canvas.getContext("2d");
  const values = withControlDefaults(preset.values);
  const scale = Math.max(canvas.width / state.image.naturalWidth, canvas.height / state.image.naturalHeight);
  const width = state.image.naturalWidth * scale;
  const height = state.image.naturalHeight * scale;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  preview.clearRect(0, 0, canvas.width, canvas.height);
  preview.filter = recipeCssFilter(values);
  preview.drawImage(state.image, x, y, width, height);
  preview.filter = "none";
  if (values.fade) {
    preview.fillStyle = `rgba(245,238,220,${values.fade / 160})`;
    preview.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (values.vignette) {
    const gradient = preview.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * .18, canvas.width / 2, canvas.height / 2, canvas.width * .72);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${values.vignette / 85})`);
    preview.fillStyle = gradient;
    preview.fillRect(0, 0, canvas.width, canvas.height);
  }
  state.thumbnailCache.set(key, canvas.toDataURL("image/jpeg", .72));
}

function renderControls() {
  els.controls.innerHTML = "";
  controls.forEach((group, index) => {
    const details = document.createElement("details");
    details.className = "control-group";
    if (index === 0 || window.matchMedia("(max-width: 760px)").matches) details.open = true;
    details.innerHTML = `<summary>${group.group}</summary>`;
    const stack = document.createElement("div");
    stack.className = "control-stack";
    group.items.forEach(([key, label, min, max]) => {
      const wrap = document.createElement("div");
      wrap.className = "control";
      wrap.innerHTML = `
        <label for="${key}">
          <span>${label}</span>
          <output id="${key}Out">${state.values[key] ?? 0}</output>
        </label>
        <input id="${key}" type="range" min="${min}" max="${max}" value="${state.values[key] ?? 0}">
      `;
      const input = wrap.querySelector("input");
      const output = wrap.querySelector("output");
      input.addEventListener("input", () => {
        state.values[key] = Number(input.value);
        output.value = input.value;
        scheduleDraw();
      });
      stack.appendChild(wrap);
    });
    details.appendChild(stack);
    els.controls.appendChild(details);
  });
}

function loadImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.original = file.name;
      state.thumbnailCache.clear();
      state.presetName = "Filtre Yok";
      state.values = withControlDefaults();
      els.emptyState.style.display = "none";
      els.fileMeta.textContent = `${file.name} · ${image.naturalWidth}x${image.naturalHeight}`;
      analyzeImage();
      updateToolState();
      renderControls();
      renderPresets();
      draw();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function getDrawSize() {
  const max = 1800;
  const scale = Math.min(1, max / Math.max(state.image.naturalWidth, state.image.naturalHeight));
  return {
    width: Math.round(state.image.naturalWidth * scale),
    height: Math.round(state.image.naturalHeight * scale)
  };
}

function drawBase(filter = "none") {
  if (!state.image) return false;
  const size = getDrawSize();
  els.canvas.width = size.width;
  els.canvas.height = size.height;
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.filter = filter;
  ctx.drawImage(state.image, 0, 0, size.width, size.height);
  ctx.filter = "none";
  return true;
}

function draw() {
  if (!state.image) return;
  if (state.showingBefore) {
    drawBase();
    return;
  }

  const v = state.values;
  drawBase(recipeCssFilter(v));
  applyPixelRecipe();
  applySharpness();
  addVignette();
  addGrain();
  els.presetMeta.textContent = `Preset: ${state.presetName}`;
}

function recipeCssFilter(v) {
  const brightness = 100 + (v.exposure || 0) + ((v.shadows || 0) * .14) + ((v.highlights || 0) * .1);
  const contrast = 100 + (v.contrast || 0) + ((v.clarity || 0) * .35) + ((v.dehaze || 0) * .22) - ((v.fade || 0) * .22);
  const saturation = 100 + (v.saturation || 0) + ((v.vibrance || 0) * .42);
  const hue = (v.tint || 0) * .22 + (v.warmth || 0) * -.08;
  const sepia = Math.max(0, v.warmth || 0) * .38;
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
}

function applyPixelRecipe() {
  const imageData = ctx.getImageData(0, 0, els.canvas.width, els.canvas.height);
  const data = imageData.data;
  const v = state.values;
  const warmth = (v.warmth || 0) / 100;
  const tint = (v.tint || 0) / 100;
  const fade = (v.fade || 0) / 100;
  const highlights = (v.highlights || 0) / 100;
  const shadows = (v.shadows || 0) / 100;
  const whites = (v.whites || 0) / 100;
  const blacks = (v.blacks || 0) / 100;
  const vibrance = (v.vibrance || 0) / 100;
  const texture = (v.texture || 0) / 100;
  const clarity = (v.clarity || 0) / 100;
  const dehaze = (v.dehaze || 0) / 100;
  const noiseReduction = (v.noiseReduction || 0) / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const lum = (r * .299 + g * .587 + b * .114) / 255;
    const shadowMask = 1 - lum;
    const highlightMask = lum;
    const midMask = 1 - Math.abs(lum - .5) * 2;

    r += warmth * 34;
    b -= warmth * 30;
    r += tint * 18;
    b += tint * 20;
    g -= tint * 16;

    r += highlights * highlightMask * 36;
    g += highlights * highlightMask * 36;
    b += highlights * highlightMask * 36;
    r += shadows * shadowMask * 34;
    g += shadows * shadowMask * 34;
    b += shadows * shadowMask * 34;
    r += whites * Math.pow(highlightMask, 1.8) * 42;
    g += whites * Math.pow(highlightMask, 1.8) * 42;
    b += whites * Math.pow(highlightMask, 1.8) * 42;
    r += blacks * Math.pow(shadowMask, 1.8) * 42;
    g += blacks * Math.pow(shadowMask, 1.8) * 42;
    b += blacks * Math.pow(shadowMask, 1.8) * 42;

    const avg = (r + g + b) / 3;
    const colorSpread = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
    const vibranceMask = Math.max(0, 1 - colorSpread / 220);
    r += (r - avg) * vibrance * vibranceMask * .7;
    g += (g - avg) * vibrance * vibranceMask * .7;
    b += (b - avg) * vibrance * vibranceMask * .7;
    r += (r - avg) * clarity * midMask * .28;
    g += (g - avg) * clarity * midMask * .28;
    b += (b - avg) * clarity * midMask * .28;
    r += (r - avg) * texture * .18;
    g += (g - avg) * texture * .18;
    b += (b - avg) * texture * .18;
    r += dehaze * (lum - .5) * 35;
    g += dehaze * (lum - .5) * 35;
    b += dehaze * (lum - .5) * 35;

    if (noiseReduction) {
      r = r * (1 - noiseReduction * .25) + avg * noiseReduction * .25;
      g = g * (1 - noiseReduction * .25) + avg * noiseReduction * .25;
      b = b * (1 - noiseReduction * .25) + avg * noiseReduction * .25;
    }

    r = r * (1 - fade) + 24 * fade;
    g = g * (1 - fade) + 25 * fade;
    b = b * (1 - fade) + 28 * fade;

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySharpness() {
  const amount = (state.values.sharpen || 0) / 100;
  if (!amount) return;
  const imageData = ctx.getImageData(0, 0, els.canvas.width, els.canvas.height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  const width = els.canvas.width;
  const height = els.canvas.height;
  const strength = amount * 1.25;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = copy[i + c] * 5;
        const left = copy[i - 4 + c];
        const right = copy[i + 4 + c];
        const top = copy[i - width * 4 + c];
        const bottom = copy[i + width * 4 + c];
        const sharpened = center - left - right - top - bottom;
        data[i + c] = clamp(copy[i + c] * (1 - strength) + sharpened * strength, 0, 255);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function addVignette() {
  const amount = (state.values.vignette || 0) / 100;
  if (!amount) return;
  const w = els.canvas.width;
  const h = els.canvas.height;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .72);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function addGrain() {
  const amount = state.values.grain || 0;
  if (!amount) return;
  const imageData = ctx.getImageData(0, 0, els.canvas.width, els.canvas.height);
  const data = imageData.data;
  const size = 1 + Math.round((state.values.grainSize || 0) / 14);
  const roughness = 1 + ((state.values.grainRoughness || 0) / 28);
  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % els.canvas.width;
    const y = Math.floor(pixel / els.canvas.width);
    const seed = Math.sin(Math.floor(x / size) * 12.9898 + Math.floor(y / size) * 78.233) * 43758.5453;
    const pattern = seed - Math.floor(seed);
    const noise = (pattern - .5) * amount * roughness * 2.4;
    data[i] = clamp(data[i] + noise, 0, 255);
    data[i + 1] = clamp(data[i + 1] + noise, 0, 255);
    data[i + 2] = clamp(data[i + 2] + noise, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
}

function analyzeImage() {
  drawBase();
  const sample = ctx.getImageData(0, 0, els.canvas.width, els.canvas.height).data;
  let lum = 0;
  let sat = 0;
  let contrast = 0;
  const step = 20;
  const luminances = [];

  for (let i = 0; i < sample.length; i += 4 * step) {
    const r = sample[i] / 255;
    const g = sample[i + 1] / 255;
    const b = sample[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    lum += l;
    sat += max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    luminances.push(l);
  }

  lum /= luminances.length;
  sat /= luminances.length;
  const mean = lum;
  contrast = Math.sqrt(luminances.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / luminances.length);

  state.analysis = { lum, sat, contrast };
  chooseAiPick();
}

function chooseAiPick() {
  const a = state.analysis;
  let pick = collections[0].presets[0];
  let reason = "Fotoğraf dengeli ışığa sahip. Temiz ve kontrollü bir başlangıç daha iyi sonuç verir.";

  if (a.lum < .33) {
    pick = findPreset("Düşük Işık Kurtar");
    reason = "Fotoğraf karanlık görünüyor. Bu preset gölgeleri açarken düşük ışık havasını korur.";
  } else if (a.lum < .42 && a.contrast > .22) {
    pick = findPreset("Karanlık Sonrası");
    reason = "Karede derin gölge ve güçlü kontrast var. Daha sert bir gece görünümü iyi oturur.";
  } else if (a.sat > .42) {
    pick = findPreset("Sessiz Lüks");
    reason = "Fotoğraf zaten renkli. Doygunluğu azaltan premium bir ton daha kontrollü durur.";
  } else if (a.lum > .66) {
    pick = findPreset("Kafe Krem");
    reason = "Fotoğraf parlak. Krem tonlu yumuşak vurgu sertliği azaltır.";
  } else if (a.contrast < .13) {
    pick = findPreset("Şehir Temiz");
    reason = "Fotoğraf biraz düz. Temiz kontrast ilk düzeltme için pratik bir seçim.";
  } else {
    pick = findPreset("Sıcak Film");
    reason = "Fotoğrafta sıcak film görünümünü taşıyacak kadar detay var.";
  }

  state.aiPick = pick;
  els.aiTitle.textContent = pick.name;
  els.aiReason.textContent = reason;
  els.analysisMeta.textContent = `Işık ${Math.round(a.lum * 100)} · Renk ${Math.round(a.sat * 100)} · Kontrast ${Math.round(a.contrast * 100)}`;
}

function findPreset(name) {
  return collections.flatMap(collection => collection.presets).find(preset => preset.name === name);
}

function applyAiPick() {
  if (!state.aiPick) return;
  const collection = collections.find(item => item.presets.includes(state.aiPick));
  state.collectionId = collection.id;
  renderCollections();
  setPreset(state.aiPick);
}

function exportPng() {
  if (!state.image) {
    showStatus("Önce fotoğraf yükle");
    return;
  }
  draw();
  const safePreset = safeName(state.presetName);
  exportCanvas(`ww-collections-${safePreset}.png`);
}

function exportCanvas(filename) {
  els.canvas.toBlob(blob => {
    if (!blob) {
      showStatus("PNG alınamadı");
      return;
    }
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    showStatus("PNG hazırlandı");
  }, "image/png");
}

function safeName(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function copyRecipe() {
  const recipe = {
    collection: currentCollection().name,
    preset: state.presetName,
    values: state.values
  };
  navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
  els.copyBtn.textContent = "Kopyalandı";
  window.setTimeout(() => els.copyBtn.textContent = "Reçeteyi Kopyala", 1200);
}

function showStatus(message) {
  els.analysisMeta.textContent = message;
}

function updateToolState() {
  const hasImage = Boolean(state.image);
  [
    els.resetBtn,
    els.exportBtn,
    els.beforeBtn,
    els.stageBeforeBtn,
    els.fitBtn,
    els.applyAiBtn,
  ].forEach(button => {
    button.disabled = !hasImage;
  });
}

function applyQuickRecipe(type) {
  const recipes = {
    auto: {
      exposure: 6,
      contrast: 8,
      highlights: -18,
      shadows: 18,
      whites: 4,
      blacks: -8,
      vibrance: 10,
      clarity: 5,
      sharpen: 12,
      noiseReduction: 6
    },
    clean: {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      warmth: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      texture: 0,
      clarity: 0,
      dehaze: 0,
      sharpen: 0,
      noiseReduction: 0,
      fade: 0,
      grain: 0,
      grainSize: 0,
      grainRoughness: 0,
      vignette: 0
    },
    film: {
      contrast: 8,
      highlights: -16,
      shadows: 10,
      blacks: 6,
      warmth: 8,
      vibrance: 6,
      saturation: -4,
      clarity: -3,
      fade: 14,
      grain: 18,
      grainSize: 18,
      grainRoughness: 24,
      vignette: 10
    },
    portrait: {
      exposure: 6,
      contrast: -4,
      highlights: -18,
      shadows: 16,
      warmth: 5,
      tint: 6,
      vibrance: 5,
      saturation: -4,
      texture: -10,
      clarity: -8,
      sharpen: 8,
      noiseReduction: 14,
      grain: 2,
      vignette: 3
    }
  };
  state.values = { ...state.values, ...recipes[type] };
  renderControls();
  scheduleDraw();
}

function shuffleRecipe() {
  allControlItems().forEach(([key, , min, max]) => {
    const span = max - min;
    const current = state.values[key] || 0;
    state.values[key] = clamp(Math.round(current + (Math.random() - .5) * span * .16), min, max);
  });
  renderControls();
  scheduleDraw();
}

els.fileInput.addEventListener("change", event => loadImage(event.target.files[0]));
els.emptyUploadBtn.addEventListener("click", () => els.fileInput.click());
els.dropzone.addEventListener("dragover", event => {
  event.preventDefault();
  els.dropzone.style.borderColor = "var(--accent)";
});
els.dropzone.addEventListener("dragleave", () => {
  els.dropzone.style.borderColor = "#56606c";
});
els.dropzone.addEventListener("drop", event => {
  event.preventDefault();
  els.dropzone.style.borderColor = "#56606c";
  loadImage(event.dataTransfer.files[0]);
});
els.resetBtn.addEventListener("click", () => {
  if (!state.image) {
    showStatus("Önce fotoğraf yükle");
    return;
  }
  state.presetName = "Filtre Yok";
  state.values = withControlDefaults();
  renderControls();
  renderPresets();
  draw();
  showStatus("Ayarlar sıfırlandı");
});
els.beforeBtn.addEventListener("pointerdown", () => {
  state.showingBefore = true;
  draw();
});
els.beforeBtn.addEventListener("pointerup", () => {
  state.showingBefore = false;
  draw();
});
els.beforeBtn.addEventListener("pointerleave", () => {
  if (state.showingBefore) {
    state.showingBefore = false;
    draw();
  }
});
function bindBeforeButton(button) {
  button.addEventListener("pointerdown", event => {
    if (!state.image) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    state.showingBefore = true;
    draw();
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach(type => {
    button.addEventListener(type, () => {
      if (!state.showingBefore) return;
      state.showingBefore = false;
      draw();
    });
  });
}
bindBeforeButton(els.stageBeforeBtn);
els.exportBtn.addEventListener("click", exportPng);
els.applyAiBtn.addEventListener("click", applyAiPick);
els.fitBtn.addEventListener("click", draw);
els.copyBtn.addEventListener("click", copyRecipe);
els.randomBtn.addEventListener("click", shuffleRecipe);
els.presetSearch.addEventListener("input", event => {
  state.presetSearch = event.target.value;
  renderPresets();
});
document.querySelectorAll("[data-quick]").forEach(button => {
  button.addEventListener("click", () => applyQuickRecipe(button.dataset.quick));
});

state.values = withControlDefaults();
renderCollections();
renderPresetFilters();
renderPresets();
renderControls();
updateToolState();
