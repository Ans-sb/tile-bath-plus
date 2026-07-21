(function attachPlannerPhotoRenderEngine(global) {
  "use strict";

  const DEFAULT_OUTPUT_WIDTH = 1400;

  async function renderPhotoTileComposition(options = {}) {
    const siteImage = await loadImageElement(options.siteImageDataUrl);
    if (!siteImage) return "";

    const canvas = document.createElement("canvas");
    canvas.width = Number(options.outputWidth) || DEFAULT_OUTPUT_WIDTH;
    canvas.height = Math.max(780, Math.round((siteImage.height / siteImage.width) * canvas.width));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(siteImage, 0, 0, canvas.width, canvas.height);

    const surfaces = Array.isArray(options.surfaces) ? options.surfaces : [];
    for (const surface of surfaces) {
      if (!surface?.tileImageDataUrl || !Array.isArray(surface.points) || surface.points.length < 3) continue;
      const tileImage = await loadImageElement(surface.tileImageDataUrl);
      if (!tileImage) continue;
      const points = surface.points.map((point) => ({
        x: clamp(Number(point.x) || 0, 0, 1) * canvas.width,
        y: clamp(Number(point.y) || 0, 0, 1) * canvas.height
      }));
      drawSurfaceTileProjection(context, {
        canvas,
        siteImage,
        tileImage,
        points,
        surface: surface.surface,
        tileSize: surface.tileSize,
        orientation: surface.orientation,
        finish: surface.finish,
        groutMillimeters: surface.groutMillimeters,
        room: surface.room || {},
        opacity: surface.opacity
      });
    }

    applyWholeImageFinish(context, canvas);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function drawSurfaceTileProjection(context, options) {
    const quad = normalizeSurfaceQuad(options.points, options.canvas.width, options.canvas.height);
    if (quad.length !== 4) return;

    const room = options.room || {};
    const realWidth = Math.max(Number(room.widthMeters) || 2.4, 0.1);
    const realHeight = options.surface === "floor"
      ? Math.max(Number(room.depthMeters) || 1.8, 0.1)
      : Math.max(Number(room.heightMeters) || 2.3, 0.1);
    const tileSize = parseTileDimensionsMeters(options.tileSize, options.surface, options.orientation);
    const columns = clamp(Math.round(realWidth / tileSize.width), 2, 90);
    const rows = clamp(Math.round(realHeight / tileSize.height), 2, 90);
    const groutMeters = clamp((Number(options.groutMillimeters) || 3) / 1000, 0.001, 0.02);
    const insetU = Math.min(0.018, groutMeters / realWidth / 2);
    const insetV = Math.min(0.018, groutMeters / realHeight / 2);
    const tileSource = createOrientedTileCanvas(options.tileImage, options.orientation);
    const groutColor = estimateGroutColor(options.siteImage, options.canvas, quad, options.surface);

    context.save();
    clipPolygon(context, quad);
    context.fillStyle = groutColor;
    context.fillRect(0, 0, options.canvas.width, options.canvas.height);
    context.restore();

    context.save();
    clipPolygon(context, quad);
    context.globalAlpha = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : (options.surface === "floor" ? 0.86 : 0.78);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const u0 = column / columns + insetU;
        const u1 = (column + 1) / columns - insetU;
        const v0 = row / rows + insetV;
        const v1 = (row + 1) / rows - insetV;
        if (u1 <= u0 || v1 <= v0) continue;
        const cell = [
          bilinearPoint(quad, u0, v0),
          bilinearPoint(quad, u1, v0),
          bilinearPoint(quad, u1, v1),
          bilinearPoint(quad, u0, v1)
        ];
        drawImageInQuad(context, tileSource, cell);
      }
    }
    context.restore();

    drawGroutPerspectiveLines(context, quad, columns, rows, options.canvas, options.surface);
    blendOriginalLighting(context, options.siteImage, options.canvas, quad, options.surface);
    addSurfaceDepthShading(context, quad, options.canvas, options.surface, options.finish);
    drawSurfaceEdgeBlend(context, quad, options.canvas, options.surface);
  }

  function createOrientedTileCanvas(tileImage, orientation) {
    if (orientation !== "vertical") return tileImage;
    const canvas = document.createElement("canvas");
    canvas.width = tileImage.height;
    canvas.height = tileImage.width;
    const context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(Math.PI / 2);
    context.drawImage(tileImage, -tileImage.width / 2, -tileImage.height / 2);
    return canvas;
  }

  function drawImageInQuad(context, image, quad) {
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    drawImageTriangle(context, image, [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height }
    ], [quad[0], quad[1], quad[3]]);
    drawImageTriangle(context, image, [
      { x: width, y: height },
      { x: 0, y: height },
      { x: width, y: 0 }
    ], [quad[2], quad[3], quad[1]]);
  }

  function drawImageTriangle(context, image, source, target) {
    const matrix = getAffineTransform(source, target);
    if (!matrix) return;
    context.save();
    context.beginPath();
    context.moveTo(target[0].x, target[0].y);
    context.lineTo(target[1].x, target[1].y);
    context.lineTo(target[2].x, target[2].y);
    context.closePath();
    context.clip();
    context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    context.drawImage(image, 0, 0);
    context.restore();
  }

  function getAffineTransform(source, target) {
    const denominator = source[0].x * (source[1].y - source[2].y)
      + source[1].x * (source[2].y - source[0].y)
      + source[2].x * (source[0].y - source[1].y);
    if (Math.abs(denominator) < 0.0001) return null;
    const a = (
      target[0].x * (source[1].y - source[2].y)
      + target[1].x * (source[2].y - source[0].y)
      + target[2].x * (source[0].y - source[1].y)
    ) / denominator;
    const c = (
      target[0].x * (source[2].x - source[1].x)
      + target[1].x * (source[0].x - source[2].x)
      + target[2].x * (source[1].x - source[0].x)
    ) / denominator;
    const e = (
      target[0].x * (source[1].x * source[2].y - source[2].x * source[1].y)
      + target[1].x * (source[2].x * source[0].y - source[0].x * source[2].y)
      + target[2].x * (source[0].x * source[1].y - source[1].x * source[0].y)
    ) / denominator;
    const b = (
      target[0].y * (source[1].y - source[2].y)
      + target[1].y * (source[2].y - source[0].y)
      + target[2].y * (source[0].y - source[1].y)
    ) / denominator;
    const d = (
      target[0].y * (source[2].x - source[1].x)
      + target[1].y * (source[0].x - source[2].x)
      + target[2].y * (source[1].x - source[0].x)
    ) / denominator;
    const f = (
      target[0].y * (source[1].x * source[2].y - source[2].x * source[1].y)
      + target[1].y * (source[2].x * source[0].y - source[0].x * source[2].y)
      + target[2].y * (source[0].x * source[1].y - source[1].x * source[0].y)
    ) / denominator;
    return { a, b, c, d, e, f };
  }

  function drawGroutPerspectiveLines(context, quad, columns, rows, canvas, surface) {
    context.save();
    clipPolygon(context, quad);
    context.lineWidth = Math.max(0.8, canvas.width * 0.0011);
    context.strokeStyle = surface === "floor" ? "rgba(240,235,224,0.64)" : "rgba(245,241,232,0.54)";
    context.shadowColor = "rgba(30,27,22,0.18)";
    context.shadowBlur = 1.4;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      drawPerspectiveLine(context, bilinearPoint(quad, u, 0), bilinearPoint(quad, u, 1));
    }
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      drawPerspectiveLine(context, bilinearPoint(quad, 0, v), bilinearPoint(quad, 1, v));
    }
    context.restore();
  }

  function drawPerspectiveLine(context, start, end) {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  function blendOriginalLighting(context, siteImage, canvas, quad, surface) {
    context.save();
    clipPolygon(context, quad);
    context.globalCompositeOperation = "multiply";
    context.globalAlpha = surface === "floor" ? 0.42 : 0.34;
    context.drawImage(siteImage, 0, 0, canvas.width, canvas.height);
    context.restore();

    context.save();
    clipPolygon(context, quad);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = surface === "floor" ? 0.08 : 0.11;
    context.drawImage(siteImage, 0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function addSurfaceDepthShading(context, quad, canvas, surface, finish) {
    const bounds = getBounds(quad, canvas.width, canvas.height);
    context.save();
    clipPolygon(context, quad);
    const gradient = surface === "floor"
      ? context.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.bottom)
      : context.createLinearGradient(bounds.left, bounds.top, bounds.left, bounds.bottom);
    gradient.addColorStop(0, "rgba(255,255,255,0.22)");
    gradient.addColorStop(0.48, "rgba(255,255,255,0.03)");
    gradient.addColorStop(1, "rgba(0,0,0,0.24)");
    context.globalAlpha = surface === "floor" ? 0.28 : 0.2;
    context.fillStyle = gradient;
    context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
    context.restore();

    if (/유광|폴리싱|gloss/i.test(String(finish || ""))) {
      context.save();
      clipPolygon(context, quad);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.16;
      const highlight = context.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.top + bounds.height * 0.55);
      highlight.addColorStop(0, "rgba(255,255,255,0)");
      highlight.addColorStop(0.48, "rgba(255,255,255,0.55)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = highlight;
      context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
      context.restore();
    }
  }

  function drawSurfaceEdgeBlend(context, quad, canvas, surface) {
    context.save();
    context.strokeStyle = surface === "floor" ? "rgba(18,24,22,0.24)" : "rgba(18,24,32,0.18)";
    context.lineWidth = Math.max(2, canvas.width * 0.002);
    context.beginPath();
    quad.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.stroke();
    context.restore();
  }

  function applyWholeImageFinish(context, canvas) {
    const gradient = context.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.44,
      canvas.width * 0.2,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.72
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.05)");
    gradient.addColorStop(1, "rgba(0,0,0,0.08)");
    context.save();
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function estimateGroutColor(siteImage, canvas, quad, surface) {
    const bounds = getBounds(quad, canvas.width, canvas.height);
    const sample = document.createElement("canvas");
    sample.width = 24;
    sample.height = 24;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(
      siteImage,
      bounds.left / canvas.width * siteImage.width,
      bounds.top / canvas.height * siteImage.height,
      Math.max(bounds.width / canvas.width * siteImage.width, 1),
      Math.max(bounds.height / canvas.height * siteImage.height, 1),
      0,
      0,
      sample.width,
      sample.height
    );
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let index = 0; index < data.length; index += 16) {
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
    const mix = surface === "floor" ? 0.76 : 0.82;
    return `rgb(${Math.round((r / count) * (1 - mix) + 232 * mix)}, ${Math.round((g / count) * (1 - mix) + 228 * mix)}, ${Math.round((b / count) * (1 - mix) + 218 * mix)})`;
  }

  function normalizeSurfaceQuad(points, width, height) {
    if (points.length === 4) return points;
    const bounds = getBounds(points, width, height);
    return [
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.left, y: bounds.bottom }
    ];
  }

  function bilinearPoint(quad, u, v) {
    const top = lerpPoint(quad[0], quad[1], u);
    const bottom = lerpPoint(quad[3], quad[2], u);
    return lerpPoint(top, bottom, v);
  }

  function lerpPoint(left, right, amount) {
    return {
      x: left.x + (right.x - left.x) * amount,
      y: left.y + (right.y - left.y) * amount
    };
  }

  function getBounds(points, width, height) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = clamp(Math.min(...xs), 0, width);
    const top = clamp(Math.min(...ys), 0, height);
    const right = clamp(Math.max(...xs), 0, width);
    const bottom = clamp(Math.max(...ys), 0, height);
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(right - left, 1),
      height: Math.max(bottom - top, 1)
    };
  }

  function clipPolygon(context, points) {
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.clip();
  }

  function parseTileDimensionsMeters(size, surface = "floor", orientation = "horizontal") {
    const matches = String(size || "").match(/(\d{2,4})\D+(\d{2,4})/);
    const dimensions = !matches
      ? (surface === "floor" ? { width: 0.6, height: 0.6 } : { width: 0.3, height: 0.6 })
      : {
        width: Math.max(Number(matches[1]) / 1000, 0.05),
        height: Math.max(Number(matches[2]) / 1000, 0.05)
      };
    if (orientation === "vertical" && Math.abs(dimensions.width - dimensions.height) > 0.001) {
      return { width: dimensions.height, height: dimensions.width };
    }
    return dimensions;
  }

  function loadImageElement(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  global.TbpPlannerPhotoRenderEngine = {
    renderPhotoTileComposition
  };
})(window);
