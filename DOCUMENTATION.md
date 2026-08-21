# AVUNK — Architecture, Technical Specifications & User Guide

**AVUNK** is an institutional internship accreditation, placement management, and AI fraud-detection ecosystem that bridges the tripartite relationship between **Higher Education Institutes (Training & Placement Cells)**, **Students**, and **Hiring Enterprises/Companies**.

---

## 1. Executive Summary & Vision

AVUNK solves three structural vulnerabilities in modern campus placements and internship tracking:
1. **Internship Fraud & Scam Proliferation**: Students frequently receive fake offers demanding upfront fees, registration deposits, or training charges. AVUNK embeds an automated AI Verification Engine analyzing corporate domains, legal clauses, and fee demands across 10 security dimensions.
2. **ATS Resume Rejection**: Students often lack actionable insights on why automated applicant tracking systems discard their profiles. AVUNK provides real-time ATS scoring, Google XYZ action-phrasing formulas, plus/worst points, and 10-point breakdowns.
3. **The 3-Way Tracking Vacuum**: Internships often lack direct, authenticated synchronization between the university, the intern, and the employer. AVUNK’s **3-Way Internship Tracker** synchronizes milestone assignment, deliverable submission, supervisor review workflows, and attendance logging in a single institutional ledger.

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

## 2. Technology Stack & System Architecture

### 2.1 Core Frameworks & Libraries
* **Frontend Core**: React 19, TypeScript, Vite 8
* **Styling & Design System**: Tailored Dark-Mode Glassmorphism Design System, Lucide Icons, Custom CSS Utilities
* **Routing**: React Router DOM v6 with Role-Based Route Guards & Protected Layouts
* **Backend as a Service (BaaS)**: Supabase (PostgreSQL 15, PostgREST, Realtime, Storage)
* **Authentication**: Supabase Auth (JWT session management, metadata forwarding, RLS role-binding)
* **Artificial Intelligence**: Google Gemini AI (`gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) with Deterministic Heuristic Fallback Engine
* **Deployment & CI/CD**: Vercel Single Page Application (SPA) with automatic rewrite proxying

---

## 3. Core Portals & Feature Breakdown

### 3.1 Student Portal (`/student/*`)

| Feature Route | Purpose & Capabilities |
| :--- | :--- |
| **`/student` (Dashboard)** | Overview of profile strength, active internships, application statuses, AI credit balances, and recommended company listings. |
| **`/student/resume`** | **AI Resume Analyzer & ATS Audit**: Computes ATS parser readability (0–100), letter grade (`A+`, `A`, `B+`, `B`), 4 Plus Points (Green Flags), 4 Worst Points (Red Flags), and a complete **10-Point Audit Breakdown**. |
| **`/student/offer-check`** | **AI Internship Offer Verifier & Scam Detector**: Audits offer letters for advance fee demands, corporate domain authenticity, realistic compensation benchmarks, and UGC/NCS compliance across a 10-point audit matrix. |
| **`/student/tracker`** | **3-Way Internship Tracker**: Live progress meter $\frac{\text{Completed}}{\text{Total Tasks}} \times 100$, dual-source task badges (College vs Company), submission modal (text, GitHub URL, demo link, attachments), reviewer feedback drawer, and attendance history. |
| **`/student/internships`** | **Active Companies & Listings**: Search verified hiring companies, filter by department and tech stack, and submit direct applications. |
| **`/student/plus`** | **Credit & Subscription Store**: View AI analysis credit balance, transaction logs, and upgrade packages. |

---

### 3.2 College / Training & Placement (T&P) Portal (`/tp/*`)

| Feature Route | Purpose & Capabilities |
| :--- | :--- |
| **`/tp` (Dashboard)** | Institutional overview: Total registered students, active internships, verified partner enterprises, and student placement rates. |
| **`/tp/internship-monitor`** | **3-Way College Monitor**: Master control panel to track every enrolled student, assign institutional milestones (to All Students, Company Batches, or Individuals), review deliverables with 1-click Approval/Changes Requested/Rejection, and generate printable institutional accreditation reports. |
| **`/tp/students`** | **Student Placement Directory**: Search and filter students by department, skills, graduation year, and discoverability status. |

---

### 3.3 Corporate / Company Portal (`/company/*`)

| Feature Route | Purpose & Capabilities |
| :--- | :--- |
| **`/company` (Dashboard)** | Corporate profile management, domain verification badge, active job postings summary, and total intern count. |
| **`/company/intern-tracker`** | **Company Intern Manager**: Verify active interns, assign company-specific engineering milestones, review submitted deliverables with direct technical feedback, and log daily presence (`Present`, `Absent`, `Half Day`, `Leave`). |
| **`/company/applicants`** | **Job Applicants Portal**: Review candidate applications, inspect candidate tech stacks and attached resumes, and perform 1-click hiring/shortlisting. |
| **`/company/requirements`** | **Requirement Creator**: Publish structured internship openings with stipend, duration, required skills, and seat counts. |

---

## 4. Database Schema & Architecture

The database is built on PostgreSQL with strict **Row Level Security (RLS)** policies ensuring multi-tenant data privacy.

```
                          ┌──────────────────────────┐
                          │         profiles         │
                          │  id, auth_user_id, role  │
                          └────────────┬─────────────┘
                                       │ 1:1
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│student_prof..│               │  tp_profiles │               │company_prof..│
└──────┬───────┘               └──────────────┘               └──────┬───────┘
       │                                                             │
       ├───────────────────────────────┬─────────────────────────────┤
       ▼                               ▼                             ▼
┌──────────────┐               ┌──────────────┐               ┌──────────────┐
│   resumes    │               │offer_analyses│               │internship_req│
└──────┬───────┘               └──────────────┘               └──────┬───────┘
       ▼                                                             ▼
┌──────────────┐                                              ┌──────────────┐
│resume_analys.│                                              │internship_app│
└──────────────┘                                              └──────┬───────┘
                                                                     ▼
                                                              ┌──────────────┐
                                                              │student_intern│
                                                              └──────┬───────┘
                                                                     ▼
                                                              ┌──────────────┐
                                                              │internship_tas│
                                                              └──────┬───────┘
                                                                     ▼
                                                              ┌──────────────┐
                                                              │task_submissi.│
                                                              └──────────────┘
```

### 4.1 Primary Relational Tables

1. **`profiles`**: Master user identity table linked to `auth.users` via `auth_user_id`. Roles: `'student' | 'tp' | 'company' | 'admin'`.
2. **`student_profiles`**: Academic credentials, department, institute name, skills array, discoverability flag, and phone.
3. **`tp_profiles`**: Higher education institution name, placement officer contact, and accreditation status.
4. **`company_profiles`**: Corporate entity name, domain, industry, size, website URL, and domain verification status (`'verified' | 'pending' | 'unverified'`).
5. **`internship_offers` & `offer_analyses`**: Storage for student-submitted offer letters, risk scores (0–100), risk levels (`Low | Medium | High`), veracity verdicts, and 10-point audit breakdowns.
6. **`resumes` & `resume_analyses`**: Versioned resume file records, computed ATS scores (0–100), detected skills, action plans, plus/worst points, and 10-point breakdowns.
7. **`student_internships`**: Active internship associations connecting student, company, start/end dates, stipend, and verification status.
8. **`internship_tasks`**: Milestones assigned by College T&P (`assigned_by_type: 'tp'`) or Company (`assigned_by_type: 'company'`), with deadlines, points, and target student filters.
9. **`task_submissions`**: Student submissions containing deliverable text, file URLs, repository links, submission timestamps, review status (`'pending' | 'approved' | 'changes_requested' | 'rejected'`), and reviewer comments.
10. **`internship_attendance`**: Date-stamped presence records (`'present' | 'absent' | 'half_day' | 'leave'`).
11. **`user_credits` & `credit_transactions`**: Atomic AI credit balance tracking managed via transactional PostgreSQL stored procedures (`consume_credit`, `refund_credit`).

---

## 5. AI Engine & Dual-Layer Heuristic Fallback

The intelligence pipeline in `src/lib/gemini.ts` operates in two resilient layers:

```
                  ┌─────────────────────────────────────────┐
                  │    User Triggers Analysis / Audit       │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │  Layer 1: Google Gemini Flash Model API │
                  │  (Tries 3.6-flash, 3.7-flash, 2.5-flash)│
                  └────────────────────┬────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
           [Success] │                                   │ [429 Quota / 503 / Offline]
                     ▼                                   ▼
          ┌───────────────────────┐           ┌───────────────────────┐
          │ Parse AI JSON Result  │           │ Layer 2: Deterministic│
          │ & Validate Structure  │           │ Heuristic 10-Pt Engine│
          └──────────┬────────────┘           └──────────┬────────────┘
                     │                                   │
                     └─────────────────┬─────────────────┘
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ Save to Supabase (offer/resume_analyses)│
                  │ & Render 10-Point Breakdown to Student  │
                  └─────────────────────────────────────────┘
```

### 5.1 The 10-Point Audit Dimensions

#### For Resumes:
1. Overall ATS Score & Single-Column Readability
2. Core Technical Skills Alignment
3. Quantifiable Impact & Project Metrics (Numbers / Percentages)
4. Project Architecture & Technical Scope
5. Live Repository & Hosted Deployment Links
6. Action Verbs & Google XYZ Phrasing
7. Section Completeness & Header Hierarchy
8. Cloud, DevOps & Automated Testing Keywords
9. Target Role & Internship Readiness
10. Actionable Roadmap to 90+ Score

#### For Internship Offers:
1. Overall Veracity & Risk Level
2. Advance Fees & Security Deposit Audit (Zero-tolerance scam trigger)
3. Corporate Domain & Email Authenticity
4. Corporate Registration & Physical Office Existence
5. Stipend & Compensation Benchmark
6. Selection Process & Interview Integrity
7. Role Deliverables & Learning Scope
8. Designated Mentorship & Supervision
9. Contractual Terms & Working Hours Clarity
10. Final Safety Recommendation & Action Steps

---

## 6. Installation, Configuration & Deployment

### 6.1 Prerequisites
* Node.js v18+ (tested on Node v20/v24)
* npm v9+
* Supabase Account & Project

### 6.2 Environment Configuration
Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini AI Configuration
VITE_GEMINI_API_KEY=your-gemini-api-key

# Optional Search API
VITE_SEARCH_API_KEY=your-search-key
```

### 6.3 Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript verification & production build
npm run build
```

### 6.4 Vercel Production Deployment
The project is configured for instant Vercel deployment with `vercel.json` SPA rewrite rules:
1. Connect your GitHub repository to Vercel.
2. In Vercel Project Settings $\rightarrow$ **Environment Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GEMINI_API_KEY`.
3. In **Settings $\rightarrow$ Deployment Protection**, ensure "Vercel Authentication" is disabled for public access.
4. Deploy!

---

## 7. Security, RLS & Authentication

1. **Role-Based Row Level Security (RLS)**:
   * Students can only read/write their own profiles, submissions, and analyses.
   * Companies can only access data of students who have applied to their requirements or are actively enrolled in their verified internship rosters.
   * T&P officers can access aggregate institutional student metrics and review institutional task submissions.
2. **Atomic AI Credit Consumption**:
   * Uses PostgreSQL RPC functions (`consume_credit`, `refund_credit`) with row-level transaction locks to prevent race conditions or balance tampering.
3. **Storage Bucket Safeguards**:
   * Isolated storage policies for `resumes` and `offer-letters` buckets with client-side guarded text extraction.

---

## 8. License & Accreditation
Developed for institutional placement departments and enterprise internship programs. Built with high-security standards for UGC/NCS fair internship accreditation.
