# HouseMind End-to-End User Journeys & Showcase Scenarios

> This document details the **6 primary user journeys** supported by HouseMind. These journeys illustrate how real homeowners, property managers, and families interact with the platform to manage physical assets, financial obligations, maintenance schedules, and grounded decision intelligence.

---

## Journey 1: New Household Setup & Spatial Mapping

### Persona
**Arjun & Priya**, new homeowners who recently purchased a 3-bedroom villa and want to establish complete operational visibility over their new home.

### Workflow Steps
1. **Household Profile & Currency Configuration**:
   - Arjun signs in via Firebase Authentication.
   - Visits the Profile setup screen, sets household country to `India` and primary currency to `INR (₹)`.
   - The platform configures national date formatting, standard tax schedules, and regional maintenance calendar intervals.
2. **Property Registration**:
   - Navigates to **Properties** and creates `Whitefield Villa`, a 2,800 sq ft two-story home built in 2021.
   - Designates the villa as the primary household residence.
3. **Room Spatial Hierarchy**:
   - In the **Rooms** manager, adds primary living zones: `Living Room`, `Kitchen`, `Master Bedroom`, `Utility Room`, and `Terrace`.
4. **First Critical Asset Registration**:
   - In **Assets**, registers the central HVAC equipment: `Daikin 2.0 Ton Inverter Split AC`.
   - Assigns the asset to `Living Room`, records purchase date, sets estimated lifespan (10 years), and enters replacement cost estimate (`₹65,000`).
   - Attaches manufacturer warranty details (`5-Year Comprehensive Warranty` expiring in 2028).
5. **Outcome**:
   - The Household Health Engine initializes the property baseline.
   - The asset appears in the dynamic relationship graph with `LOCATED_IN` and `COVERED_BY` edges established.

---

## Journey 2: Document Intelligence & Staged Ingestion

### Persona
**Sarah**, an apartment owner who receives monthly utility bills and appliance service invoices via email and paper mail.

### Workflow Steps
1. **Document Upload**:
   - Sarah receives her quarterly electricity statement (`BESCOM Electricity Bill - Q3.pdf`).
   - Navigates to **Documents** and uploads the file via drag-and-drop.
2. **Deterministic & Vision-Assisted Parsing**:
   - The document processing pipeline ingests the file, calculates a SHA-256 fingerprint to prevent duplicates, and runs OCR candidate extraction.
   - The pipeline extracts candidate fields:
     - Document Type: `Utility Bill`
     - Merchant/Provider: `BESCOM Electricity`
     - Billing Date: `2026-08-15`
     - Amount: `₹4,250`
     - Due Date: `2026-08-30`
3. **Two-Stage Human-in-the-Loop Review**:
   - The document enters the `pending_review` state.
   - The UI presents a split-screen review modal: extracted fields on the left, document preview on the right.
   - Sarah verifies the amount and changes the category from `General Expense` to `Utilities > Electricity`.
4. **Confirmation & Ledger Commitment**:
   - Sarah clicks **Confirm & Commit**.
   - The transaction is committed to the financial ledger as a confirmed `DEBIT` of `₹4,250`.
   - The system creates a calendar deadline for the payment due date.
5. **Outcome**:
   - No data is blindly committed without user approval.
   - The financial ledger updates monthly utility spending in real time.

---

## Journey 3: Asset Problem & The "Repair vs. Replace" Decision

### Persona
**Marcus**, a homeowner experiencing recurring cooling issues with his 9-year-old living room air conditioner.

### Workflow Steps
1. **Universal Issue Logging**:
   - Marcus notices the AC is blowing warm air and showing an error code.
   - Navigates to **Issues & Tickets** and clicks **New Ticket**.
   - Title: `Weak cooling & persistent refrigerant leak`.
   - Links the issue directly to the `Daikin Split AC` asset and marks severity as `High`.
2. **Automated Cross-Domain Risk Evaluation**:
   - HouseMind's Cross-Domain Intelligence engine immediately queries the asset's graph edges:
     - `COVERED_BY`: Warranty expired 14 months ago.
     - `SERVICED_BY`: Previous maintenance logs show 3 refrigerant top-ups and fan motor replacement totaling `₹24,500` over the past 2 years.
     - `CONDITION`: Asset is at 90% of its expected 10-year lifespan.
   - **Cross-Domain Insight Generated**: *"Repair costs over the last 24 months represent 38% of new replacement cost on an asset nearing end-of-life."*
3. **Contractor Estimate Ingestion**:
   - Marcus receives a repair quote of `₹18,000` from an HVAC technician and logs it against the ticket.
   - Total repair outlay now reaches `₹42,500` (65% of the `₹65,000` replacement cost).
4. **What-If Scenario Simulation**:
   - The system offers a one-click transition to the **What-If Simulator**: *"Simulate New AC Replacement vs. Emergency Repair"*.
   - Marcus simulates purchasing a new 5-star inverter unit for `₹65,000` financed over 12 months vs paying `₹18,000` now.
   - The engine projects a 12-month net cash flow impact, factoring in 22% estimated electricity efficiency savings on the new model.
5. **Outcome**:
   - Marcus makes an informed, mathematically grounded replacement decision backed by complete historical data rather than guessing.

---

## Journey 4: Financial Obligations, Debts & Cash Flow Runway

### Persona
**Elena & David**, managing a family budget with an active home mortgage, car loan, two credit cards, and multiple seasonal expenses.

### Workflow Steps
1. **Mortgage & Amortized Loan Tracking**:
   - Navigates to **Loans & Debts** and registers their home loan: `HDFC Home Loan` (`₹48,00,000` balance, 8.45% interest rate, `₹42,300` monthly EMI).
   - The platform calculates remaining amortization months, total lifetime interest, and annual principal payoff.
2. **Credit Cards & Utilization Safety**:
   - In **Credit Cards**, connects two household accounts:
     - `ICICI Coral Card`: Limit `₹3,00,000`, Current Balance `₹45,000` (15% utilization — Healthy).
     - `SBI SimplyClick`: Limit `₹1,50,000`, Current Balance `₹88,000` (58% utilization — **Warning: Above 30% threshold**).
3. **Recurring Household Expenses**:
   - In **Expenses**, maps fixed recurring commitments: Home insurance (`₹12,000/yr`), Society maintenance (`₹4,500/mo`), High-speed fiber internet (`₹1,199/mo`).
4. **Net Cash Flow Engine Execution**:
   - The transaction service processes monthly family salaries (Credits: `₹1,85,000`) against loan EMIs, fixed bills, and card payments (Debits: `₹1,24,000`).
   - Computes:
     - **Net Monthly Surplus**: `+₹61,000`
     - **Household Savings Rate**: `33.0%`
     - **Emergency Reserve Runway**: `5.8 months`
5. **Outcome**:
   - The Command Center displays clear financial runway metrics, warning the family to pay down the SBI card balance before incurring new discretionary liabilities.

---

## Journey 5: Proactive Morning Brief & Unified Action Approval

### Persona
**Vikram**, a busy professional who wants a 30-second daily briefing on his household status before starting his workday.

### Workflow Steps
1. **Accessing the Morning Brief**:
   - Vikram opens HouseMind at 8:00 AM on his mobile browser.
   - The top of the Command Center presents the **Morning Brief** card formatted into 4 clear operational quadrants:
     1. **Urgent Alerts**: Water filter cartridge is 14 days overdue for replacement.
     2. **Today's Deadlines**: Electricity bill (`₹3,400`) due today.
     3. **Household Health Index**: Score `82/100` (Stable, +2 pts from last week).
     4. **Proactive Recommendation**: Schedule annual solar inverter maintenance before monsoon season begins.
2. **Deep-Link Navigation**:
   - Vikram clicks the **Pay Electricity Bill** action deep-link.
   - The platform navigates directly to the bill's ledger record with provider payment link pre-filled.
3. **Agent Action Proposal Generation**:
   - Vikram opens the **Copilot** panel and types: *"Can you schedule the water filter replacement for Saturday morning?"*
   - Copilot checks tool permissions and issues a structured **Action Proposal**:
     ```json
     {
       "actionType": "CREATE_MAINTENANCE_TASK",
       "title": "Replace RO Water Purifier Cartridge",
       "assetId": "asset_ro_purifier_01",
       "scheduledDate": "2026-09-12",
       "estimatedCost": 1500
     }
     ```
4. **User Confirmation**:
   - The UI renders an interactive confirmation dialog with explicit **Approve** and **Reject** buttons.
   - Vikram reviews the details and clicks **Approve**.
   - The task is committed to the household calendar and maintenance schedule.
5. **Outcome**:
   - Zero autonomous unconfirmed writes occur; the user maintains full authority while benefiting from proactive assistance.

---

## Journey 6: Grounded Copilot Q&A & Cross-Domain Investigation

### Persona
**Ananya**, reviewing household expenditures to prepare for her family's annual financial planning session.

### Workflow Steps
1. **Conversational Inquiry**:
   - Ananya opens the Copilot chat drawer and asks:
     *"Which household appliances have cost us the most money in repairs this year, and are any of them still under warranty?"*
2. **Intent Classification & Minimal Context Gathering**:
   - The Agent Orchestrator detects the intent (`ASSET_REPAIR_FINANCE_INQUIRY`).
   - Executes deterministic read tools:
     - `get_assets`: Pulls all 8 registered home appliances.
     - `get_issues`: Pulls resolved and open tickets for the current year.
     - `get_warranties`: Pulls all active and expired coverage policies.
     - `get_cross_domain_insights`: Pulls multi-domain relationship links.
3. **Grounded Fact Assembly**:
   - The tool output indicates:
     - `Samsung French Door Refrigerator`: 2 repairs totaling `₹8,200` (Compressor relay & door gasket). Manufacturer warranty active until November 2027.
     - `IFB Front Load Washing Machine`: 1 repair totaling `₹2,100` (Drain pump). Warranty expired in 2024.
4. **Gemini Synthesis with Grounded Citations**:
   - The assembled factual context is passed to Gemini 2.5 Flash with strict grounding instructions.
   - Copilot returns a clear, structured response:
     > **Highest Repair Costs (2026)**:
     > 1. **Samsung French Door Refrigerator**: Total repairs of **₹8,200** across 2 service calls.  
     >    *Warranty Status*: **Covered** under Samsung 5-Year Compressor Warranty until November 2027. *(Note: Future compressor-related repairs may be eligible for warranty claims).*  
     > 2. **IFB Front Load Washing Machine**: Total repairs of **₹2,100** for drain pump replacement.  
     >    *Warranty Status*: **Expired** (Coverage ended August 2024).
5. **Outcome**:
   - Zero hallucinations; all figures, dates, and warranty statuses match the user's recorded database state exactly.
