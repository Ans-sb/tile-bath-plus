(function initializeDialog() {
  const state = { package: null };
  const elements = {
    apiBase: document.querySelector("#apiBase"),
    code: document.querySelector("#pairingCode"),
    status: document.querySelector("#status"),
    packagePanel: document.querySelector("#packagePanel"),
    projectMeta: document.querySelector("#projectMeta"),
    projectName: document.querySelector("#projectName"),
    packageOptions: document.querySelector("#packageOptions"),
    offsetX: document.querySelector("#offsetX"),
    offsetY: document.querySelector("#offsetY"),
    groutPreview: document.querySelector("#groutPreview"),
    list: document.querySelector("#materialList"),
    usagePanel: document.querySelector("#usagePanel"),
    usageResult: document.querySelector("#usageResult")
  };

  document.querySelector("#connectButton").addEventListener("click", () => {
    setStatus("자재 패키지를 불러오고 있습니다.");
    sketchup.load_package(JSON.stringify({ apiBase: elements.apiBase.value, code: elements.code.value }));
  });
  document.querySelector("#helpButton").addEventListener("click", () => sketchup.open_help());
  elements.code.addEventListener("input", () => { elements.code.value = elements.code.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); });
  elements.list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-apply-product]");
    if (!button) return;
    const rotation = Number(button.closest("article").querySelector("select").value || 0);
    setStatus("선택한 면에 실제 규격으로 타일을 적용하고 있습니다.");
    sketchup.apply_material(JSON.stringify({
      productId: button.dataset.applyProduct,
      rotation,
      offsetXmm: Number(elements.offsetX.value || 0),
      offsetYmm: Number(elements.offsetY.value || 0)
    }));
  });

  window.Jajaego = {
    receivePackage(record) {
      state.package = record;
      elements.projectName.textContent = record.project.name;
      elements.projectMeta.textContent = [record.project.siteName, record.project.roomName].filter(Boolean).join(" · ") || "LOCAL PROJECT";
      const groutWidth = Number(record.grout?.widthMm ?? record.groutMm ?? 0);
      const groutColor = record.grout?.color || "#D8D5CF";
      elements.packageOptions.textContent = `줄눈 ${groutWidth}mm · 로스 ${record.wastePercent}%`;
      elements.offsetX.value = Number(record.layout?.offsetXmm || 0);
      elements.offsetY.value = Number(record.layout?.offsetYmm || 0);
      elements.groutPreview.querySelector("i").style.background = groutColor;
      elements.groutPreview.querySelector("b").textContent = `${groutWidth}mm`;
      elements.list.innerHTML = record.items.map(renderItem).join("");
      elements.packagePanel.hidden = false;
      setStatus(`${record.items.length}개 타일을 불러왔습니다. SketchUp에서 면을 선택하세요.`);
    },
    receiveApplied(payload) {
      state.package = payload.package;
      const report = payload.report;
      elements.usagePanel.hidden = false;
      elements.usageResult.innerHTML = `<strong>${escapeHtml(payload.item.name)}</strong><span>${payload.faceCount}개 면 · ${format(report.areaSqm)}㎡ · ${format(report.tileCount, 0)}장${report.boxCount ? ` · ${format(report.boxCount, 0)}박스` : ""} · 시작점 ${format(report.offsetXmm, 0)}, ${format(report.offsetYmm, 0)}mm</span>`;
      setStatus("선택한 면에 타일을 적용했습니다.");
    },
    receiveError(payload) { setStatus(payload.message || "요청을 처리하지 못했습니다.", true); }
  };

  function renderItem(item) {
    return `<article><img src="${escapeHtml(item.imageUrl)}" alt="" /><div><small>${roleLabel(item.role)}</small><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml([item.modelName, item.sizeLabel, item.finish].filter(Boolean).join(" · "))}</span></div><label>방향<select><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><button type="button" data-apply-product="${escapeHtml(item.productId)}">선택 면에 적용</button></article>`;
  }

  function roleLabel(role) { return role === "wall" ? "벽" : role === "point" ? "포인트" : "바닥"; }
  function setStatus(message, error = false) { elements.status.textContent = message; elements.status.classList.toggle("is-error", error); }
  function format(value, digits = 2) { return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(Number(value) || 0); }
  function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
})();
