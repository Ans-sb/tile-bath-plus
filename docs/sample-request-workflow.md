# Field Sample Request Workflow

The sample request workflow connects the AI tile sales project ledger to member and admin operations.

1. A signed-in customer creates or selects a field project in the AI sales assistant.
2. The customer saves recommended products to that project.
3. Sample GO lists only sample-eligible SNT products that are already selected in the owned project.
4. The server reloads product data and validates ownership, public catalog eligibility, and SNT eligibility before accepting a request.
5. My Page shows the customer's request status, selected products, destination, requested date, and tracking information.
6. The admin order workspace changes status and records carrier, tracking number, and an internal handling note.

Customer responses must never contain internal brand, supplier, margin, quality, or cost fields. The JSON store is `data/sample-requests.json` and is written atomically.
