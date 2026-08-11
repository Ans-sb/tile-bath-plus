## Internal Brand Policy

Brand is the top-level internal filter for tile DB management.

However, brand is not customer-facing.

Rules:
1. Customer-facing category UI must not show brand.
2. Customer-facing product cards must not show brand.
3. Customer-facing table rows must not show brand.
4. Customer-facing URLs must not include brand.
5. Customer-facing API responses must not include:
   - internal_brand_id
   - internal_brand_code
   - internal_brand_name
   - supplier_name
   - margin_grade
   - quality_grade
6. Admin/internal APIs may include brand.
7. Admin tile management UI must show brand as the first filter.
8. CSV imports must require internal_brand_code.
9. Search documents must separate customer_searchable_text and admin_searchable_text.
10. Customer search must not match by internal brand code or internal brand name.

## Tile Image Finder Policy

Image search must treat selected tile size and selected surface/finish as absolute filters.

Rules:
1. Image search must only return tile products, never materials or accessories.
2. Selected tile size is mandatory and must match the product size.
3. Selected surface/finish is mandatory and must match the product finish group.
4. After size and finish filtering, rank results by image similarity: color, pattern, and visible motif.
5. Do not relax size or finish in customer-facing image search unless the user explicitly asks for a broader search mode.

## Vendor Stock Refresh Policy

Vendor stock refresh must be manual-only.

Rules:
1. Do not create or run scheduled/recurring vendor stock refresh jobs.
2. Do not run `npm.cmd run stock:refresh` or `node scripts/daily-stock-refresh.mjs` unless the owner explicitly asks for stock refresh/update/check.
3. Existing stock-refresh scripts may remain available as manual tools.
4. If a recurring stock refresh automation exists, keep it disabled or delete it.
5. Before refreshing stock against supplier/vendor sites, confirm the owner has requested that specific run.

## Agent Operating Environment

This repository is the working app for Tile & Bath Plus product DB management,
search, cart, proposal, and quotation workflows.

Primary files:
1. `server.js`: local API server, persistence, imports, and backend routes.
2. `app.js`: browser app behavior and customer/admin UI logic.
3. `index.html`: main app shell.
4. `styles.css`: app styling.
5. `data/products.json`: source product database.
6. `products-db.js`: browser-readable product database bundle.
7. `scripts/`: DB import, normalization, audit, search simulation, and maintenance tools.
8. `docs/`: project specifications and operating notes.

Local commands:
1. Start the app with `npm.cmd start`.
2. Open `http://localhost:4173` after the server starts.
3. Run validation with `npm.cmd run check`.
4. Use `rg` for search and inspect existing patterns before editing.

Working rules for agents:
1. Read this file before changing code, data, or scripts.
2. Preserve user edits and do not revert unrelated work.
3. Keep changes scoped to the current request.
4. When editing customer-facing behavior, verify that internal brand and supplier fields do not leak.
5. When editing image search, keep size and finish as mandatory filters unless a broader mode is explicitly requested.
6. When changing product DB shape or generated DB bundles, verify both `data/products.json` and `products-db.js` expectations.
7. Prefer existing scripts and data normalization flows over one-off manual transformations.
8. Run `npm.cmd run check` after code or data-shape changes when feasible.
9. Document any new recurring workflow in `docs/` or in a clearly named script.

Customer-facing forbidden fields:
1. `internal_brand_id`
2. `internal_brand_code`
3. `internal_brand_name`
4. `supplier_name`
5. `margin_grade`
6. `quality_grade`

Useful task flow:
1. Inspect the relevant UI/API/search code.
2. Identify whether the change is customer-facing or admin/internal.
3. Apply the smallest coherent code or data change.
4. Run targeted validation, then `npm.cmd run check` if practical.
5. Report changed files, verification results, and any remaining risk.

## Agent Team Structure

Use `docs/agent-team.md` as the default GPT/Codex team configuration.

Decision rules:
1. The owner/CEO has all authority and final decision rights.
2. GPT/Codex team roles provide analysis, implementation, review, and recommendations only.
3. Product, UX, AI, data, frontend, backend, DevOps, content, operations, and sales perspectives should be considered when relevant.
4. Backend and DevOps responsibilities may be combined in the early stage.
5. Do not introduce Gemini, Claude, or other external model dependencies unless the owner explicitly requests it later.
