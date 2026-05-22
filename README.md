# 🎨 AI Inventory Management System

## 📌 Overview

This project demonstrates a production-ready AI powered Inventory Management System built using n8n workflow automation, Google Sheets, API integrations, and AI orchestration.

The system intelligently manages inventory operations through a modern web dashboard integrated with an AI Assistant capable of performing real time inventory actions using natural language commands.

The application automatically synchronizes frontend inventory data with Google Sheets and enables intelligent operations such as product updates, inventory analytics, stock management, product deletion, and audit tracking.

> **Live Preview:** https://paint-inventory-ai-hub.lovable.app
> **Stack:** · n8n · API Integration · Webhook · LLM · AI Orchestration · Google Sheets

---

## ❗ Problem Statement

Managing inventory manually for a paint or any store can be:

Time consuming
Difficult to maintain accurately
Error prone during updates
Hard to synchronize across systems
Difficult to monitor in real time
Inefficient for tracking low stock and inventory value

Traditional inventory systems often require manual spreadsheet updates and do not provide intelligent automation or natural language interaction.

There is a need for a smart inventory platform capable of:

Real time synchronization
AI assisted inventory operations
Automated stock monitoring
Inventory analytics
Safe product management
Audit tracking
Fast operational workflows

---

## 💡 Solution

This project automates the entire inventory management workflow using:

AI powered natural language processing
n8n workflow automation
Google Sheets as centralized inventory storage
Frontend dashboard for visualization
Webhook based API integration
Real time inventory synchronization

The system allows users to:

View live inventory metrics
Search and filter products
Add products using AI
Update stock quantities
Remove products safely
Generate inventory summaries
Track inventory analytics
Maintain audit logs automatically


## ✨ Features

- **Live dashboard** - Total SKUs, Units in Stock, Stock Value (INR), Active / Low / Out of Stock counts.
- **Inventory table** - Searchable, status-coloured, responsive, with refresh control.
- **AI Assistant chat** - Floating bottom-right glass overlay. Add / update / delete / query inventory in plain English.
- **Safe SKU-based deletion** - Confirm-then-delete by exact SKU (never by row index or name guess).
- **Optimistic UI** - Instant local updates with rollback on backend failure.
- **Smart sync** - Cached hydration (localStorage), `AbortController`-cancelled stale requests, 250 ms debounced refresh.
- **No stale data** - Each successful response fully replaces local state; cache is overwritten.
- **Dark, professional design** - Custom design tokens in `src/styles.css`, semantic colours only.

---

## 🏗 Architecture Overview

<img width="1536" height="1024" alt="Inventory Management AI Info chart" src="https://github.com/user-attachments/assets/4bcb3c13-29d2-499b-82f0-708cb1cce6a0" />

```text
┌────────────────────┐      HTTPS POST       ┌──────────────────────┐      Sheets API       ┌──────────────────┐
│                    │  ───────────────────▶ │   n8n Workflow       │ ───────────────────▶ │  Google Sheets   │
│   - Dashboard      │ ◀───────────────────  │  (AI + Logic Node)   │ ◀─────────────────── │  (Source of      │
│   - Inventory Table│   JSON {inventory,    │                      │                       │   Truth)         │
│   - Chat Panel     │    summary, output}   │  - Parses intent     │                       │                  │
│                    │                       │  - Calls Sheets      │                       │                  │
│                    │                       │  - Returns latest    │                       │                  │
└────────────────────┘                       └──────────────────────┘                       └──────────────────┘
```

**Single source of truth:** Google Sheets. The frontend never trusts its own state - every meaningful action is followed by a backend re-sync.

---

### 🔌 n8n Workflow

<img width="3121" height="1893" alt="image" src="https://github.com/user-attachments/assets/eb458b3f-07aa-4f8f-8d62-6caddce5d86a" />

### 🧠 Architecture Workflow

<img width="6135" height="1805" alt="Inventory Management System Mermaid Flow Chart" src="https://github.com/user-attachments/assets/47b1e624-3fbf-4c9a-9eb0-62753efbb145" />

---

## 🔁 End-to-End Data Flow

### 1. Initial Application Load

#### Dashboard loading state
<img width="1919" height="971" alt="image" src="https://github.com/user-attachments/assets/6a833bc2-4262-4a14-82d2-cfa760f44c57" />

	   a. User opens the Inventory Management System dashboard.
	   b. Frontend application loads cached inventory data.
	   c. Frontend sends synchronization request to n8n webhook.
	   d. n8n workflow fetches latest inventory from Google Sheets.
	   e. Inventory and summary data are returned to frontend.
	   f. Dashboard cards and inventory table update automatically.

### 2. Inventory Synchronization

#### Dashboard with sample live product data
<img width="1919" height="971" alt="image" src="https://github.com/user-attachments/assets/84e5ff18-5d3d-452a-abac-5740544e0932" />

      a. User clicks Refresh.
      b. Frontend sends inventory synchronization request.
      c. n8n reads latest inventory data.
      d. Frontend replaces old inventory state completely.
      e. Updated dashboard metrics are displayed.

### 3. AI Assistant Workflow

#### Interface integrated into the dashboard
<img width="1919" height="970" alt="image" src="https://github.com/user-attachments/assets/fc2d53ab-4fba-4243-abac-3b7ad449ee3f" />

      a. User enters natural language command.
      b. AI Assistant sends request to n8n webhook.
      c. AI Orchestrator processes user intent.
      d. OpenAI model interprets the inventory action.
      e. n8n performs required operation:
         * Read inventory
         * Update product
         * Delete product
         * Generate summary
      f. Google Sheets updates inventory records.
      g. Audit logs are recorded automatically.
      h. Frontend synchronizes latest inventory state.

### 4. Safe Product update and Deletion Flow

      a. User requests product removal.
      b. AI Assistant identifies exact product SKU.
      c. AI requests confirmation from user.
      d. n8n deletes only the matched SKU.
      e. Frontend removes only that product.
      f. Inventory dashboard refreshes automatically.

#### Inventory filtering and stock management

<img width="1919" height="973" alt="image" src="https://github.com/user-attachments/assets/568746ff-9008-44d2-b15e-e821778a4884" />
<img width="1919" height="969" alt="image" src="https://github.com/user-attachments/assets/5ac4e576-da8f-4104-bc54-8878a6a01afb" />
<img width="1919" height="969" alt="image" src="https://github.com/user-attachments/assets/ee60e3de-11cc-4f07-ad7f-bd935784bee4" />
<img width="1919" height="970" alt="image" src="https://github.com/user-attachments/assets/9db8f7a4-a08c-4c19-abeb-74b09a5bf2c6" />
<img width="1919" height="970" alt="image" src="https://github.com/user-attachments/assets/018f6c12-2549-4b6f-8435-c637aa66653a" />
<img width="1919" height="966" alt="image" src="https://github.com/user-attachments/assets/9bb940f1-e52f-456d-8d38-dbb142c94842" />
<img width="1919" height="971" alt="image" src="https://github.com/user-attachments/assets/affa8987-da29-4541-a267-bd54fe083fc7" />

---

## ✨ Features

### Live Inventory Dashboard

      * Total SKUs
      * Units in stock
      * Total stock value
      * Low stock alerts
      * Out of stock monitoring
      * Inventory analytics
      
### Inventory Table

      * Product search
      * Status filtering
      * Responsive table layout
      * Real time synchronization
      * Product categorization
      * Inventory valuation
      
### AI Assistant

      * Natural language inventory operations
      * Intelligent inventory queries
      * AI powered stock management
      * Product update operations
      * Safe deletion workflow
      * Inventory analytics generation
      
### Synchronization System

      * Live backend synchronization
      * Optimistic UI updates
      * Cached hydration
      * Fast refresh operations
      * AbortController based request management
      * Automatic dashboard updates
      
### Audit and Monitoring

      * Inventory activity logging
      * Operation tracking
      * AI action monitoring
      * Workflow traceability
---

## 🧩 Key Functionalities

### Real Time Inventory Synchronization

The frontend dashboard always reflects latest Google Sheets inventory state after every operation.

### Safe SKU Based Deletion

Products are deleted only using exact SKU matching to prevent accidental data removal.

### AI Powered Inventory Operations

Users interact with inventory using natural language instead of manual spreadsheet editing.

### Responsive Professional UI

The system supports desktop, tablet, and mobile interfaces with modern dark themed design.

---

## 🩺 Challenges Faced

### Several technical challenges were addressed during development:

      * Synchronizing frontend and backend inventory state
      * Parsing dynamic AI responses
      * Preventing stale inventory cache
      * Safe inventory deletion handling
      * Real time dashboard updates
      * Responsive UI optimization
      * Managing AI workflow orchestration
      * Handling live Google Sheets synchronization

---

## 📈 Future Enhancements

### Planned improvements include:

	* Login and authentication page
	* Role-based access for owner and staff
	* Voice listener for AI Chat Assistant
	* Payment mode for customer billing
	* Inventory analytics dashboard
	* Email and WhatsApp stock alerts
	* Advanced reporting
	* Cloud database migration

---

## ✅ Conclusion

The Inventory AI Management System demonstrates how AI, workflow automation, and modern frontend technologies can be combined to create a scalable and intelligent inventory platform.

The project successfully integrates AI powered operations, real time synchronization, workflow automation, and responsive frontend engineering into a production ready inventory management solution.


