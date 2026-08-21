# AVUNK — Higher Education Placement, Internship Tracker & AI Fraud-Proof Ecosystem

<div align="center">

![AVUNK Banner](https://img.shields.io/badge/AVUNK-Institutional%20Internship%20Platform-000000?style=for-the-badge&logo=shield&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Flash%20AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**An institutional internship accreditation and verification platform bridging College / T&P Cells ⇄ Students ⇄ Enterprises.**

[Full Documentation (DOCUMENTATION.md)](./DOCUMENTATION.md) • [Features](#key-features) • [Architecture](#architecture) • [Getting Started](#quick-start)

</div>

---

## 🌟 Key Features

### 🎓 1. Student Portal (`/student/*`)
* **ATS Resume Analyzer**: 10-point audit matrix, readability scores (0–100), letter grades (`A+` to `B`), Plus Points, Worst Points, and Google XYZ action plans.
* **Internship Offer Verifier (Scam / Fraud Shield)**: Detects advance fee demands, corporate domain validity, and calculates comprehensive risk scores before students accept offers.
* **3-Way Active Internship Tracker**: Real-time progress meter $\frac{\text{Completed}}{\text{Total Tasks}} \times 100$, dual-source task badges (College vs Company), deliverable submissions (code/demo/attachments), and supervisor feedback drawers.
* **Job & Company Directory**: Filter verified companies, explore live requirements, and submit applications.

### 🏛️ 2. College / Training & Placement (T&P) Portal (`/tp/*`)
* **Internship Monitor**: Unified master view across all enrolled students and partner companies.
* **Task Assignment Engine**: Assign institutional milestones to *All Students*, *Company Batches*, or *Specific Individuals*.
* **Review & Verification Queue**: 1-click Approval, Changes Requested, or Rejection with direct comments.
* **Accredited Reports**: Print institutional progress reports for university audits.

### 🏢 3. Corporate / Company Portal (`/company/*`)
* **Domain Authentication**: Automated AI verification of corporate email domains and web legitimacy.
* **Job Applicants Portal**: Inspect candidate profiles, verified tech stacks, attached resumes, and hire candidates with 1 click.
* **Company Intern Tracker**: Verify incoming interns, assign engineering sprint tasks, review pull requests/deliverables, and mark daily attendance (`Present`, `Absent`, `Half Day`, `Leave`).
* **Requirements Publisher**: Post internship openings with specific stipends, durations, and skill requisites.

---

## 🏗️ Architecture

```
                  ┌─────────────────────────────────────┐
                  │       College / T&P Cell            │
                  │  • Assign Academic Tasks / Milestones│
                  │  • Review Institutional Deliverables│
                  │  • Generate Accredited Reports      │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│             Student              │   │        Corporate Enterprise      │
│ • Submit Task Deliverables       │◄──┤ • Verify Intern Roster           │
│ • Live Progress & Feedback Meter │   │ • Assign Engineering Tasks       │
│ • ATS Audit & Offer Verification │   │ • Review Code / Mark Attendance  │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/KrishnaBhadane/Avunk3.git
cd Avunk3
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
```

---

## 📖 In-Depth Documentation

For complete technical specifications, database schemas, Row Level Security (RLS) policies, and AI prompt engineering details, read **[DOCUMENTATION.md](./DOCUMENTATION.md)**.
