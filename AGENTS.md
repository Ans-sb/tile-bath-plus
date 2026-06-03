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
