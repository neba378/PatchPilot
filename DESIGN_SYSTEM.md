# PatchPilot Design System Specification

> **Version**: 1.2.0  
> **Status**: Approved & Canonical  
> **Default Theme**: **Cobalt Slate** (High-Contrast SRE Operations)  
> **Framework**: Next.js 15, Tailwind CSS, shadcn/ui, Radix UI Primitives  

---

## 1. Design Principles

1. **Information Density & Glanceability**: Engineers in an incident require immediate comprehension. Data is presented cleanly without unnecessary decoration or visual clutter.
2. **Restrained Color Distribution**: A single, refined primary accent (Cobalt `#3b82f6`) anchors interactive elements. Semantic colors (Emerald, Amber, Rose) are strictly reserved for communicating operational state—never as decorative rainbow accents.
3. **High-Contrast Legibility**: Deep dark slate surfaces (`#0a0d14` background, `#111622` card) paired with high-contrast foreground text (`#f8fafc`, `>14:1` contrast ratio) prevent eye fatigue during high-stress operations.
4. **Concise Product Copy**: Titles, subtitles, and labels use crisp, professional engineering terminology. Redundant labels, academic jargon, and obvious descriptions are eliminated.
5. **Standardized shadcn Spacing**: Strict adherence to the standard 4px Tailwind / shadcn spacing scale for seamless component integration.

---

## 2. Color Palette & Distribution

### Surface & Border Tokens
| Role | CSS Variable | Hex Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--background: 224 35% 6%` | `#0a0d14` | Root background |
| **Card Surface** | `--card: 224 30% 9.5%` | `#111622` | Cards, tables, modals |
| **Hover / Secondary** | `--secondary: 224 25% 15%` | `#1d2436` | Active filters, hovered items |
| **Muted Surface** | `--muted: 224 25% 13%` | `#181e2e` | Table headers, code blocks |
| **Subtle Border** | `--border: 224 20% 16%` | `#202738` | Dividers, card outlines |
| **Primary Text** | `--foreground: 210 40% 98%` | `#f8fafc` | Primary titles, values |
| **Muted Text** | `--muted-foreground: 215 20% 65%` | `#94a3b8` | Metadata, subtitles, column headers |

### Interactive & Brand Accent
| Role | CSS Variable | Hex Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Primary CTA** | `--primary: 217 91% 60%` | `#3b82f6` | Primary action buttons, active navigation indicator |
| **Focus Ring** | `--ring: 217 91% 60%` | `#3b82f6` | Keyboard focus outlines |

### Semantic State Tokens (Used Strictly for Status)
| State | Text & Border Class | Background Class | Typical Use |
| :--- | :--- | :--- | :--- |
| **Resolved / Healthy** | `text-emerald-400` | `bg-emerald-500/10 border-emerald-500/20` | Verified patches, 100% pass rates, active status |
| **Needs Review / Warning** | `text-amber-400` | `bg-amber-500/10 border-amber-500/20` | Incidents requiring human sign-off |
| **Remediating / Active** | `text-blue-400` | `bg-blue-500/10 border-blue-500/20` | Active sandbox runs, open draft PRs |
| **Critical / Fault** | `text-rose-400` | `bg-rose-500/10 border-rose-500/20` | 500 runtime exceptions, blocked paths |
| **Neutral / Abstained** | `text-muted-foreground` | `bg-muted border-border` | Abstained incidents, inactive monitors |

---

## 3. Typography & Contrast Hierarchy

### Font Families
- **Primary Sans**: `Geist Sans`, `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - High legibility, crisp letter rendering at small sizes (`11px` - `13px`).
  - Feature settings: `cv02`, `cv03`, `cv04`, `cv11`. Letter spacing: `-0.01em`.
- **Telemetry Monospace**: `Geist Mono`, `JetBrains Mono`, `Fira Code`, `monospace`
  - Used for code diffs, fingerprints, commit SHAs, timestamps, and metric figures.
  - Numeric alignment: `font-variant-numeric: tabular-nums`.

### Type Scale
| Role | Tailwind Classes | Size / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-xl font-bold tracking-tight` | 20px / 28px | 700 | Main header on each view |
| **Card Header** | `text-sm font-semibold` | 14px / 20px | 600 | Card titles, section headers |
| **Metric Figure** | `text-2xl font-bold font-mono` | 24px / 28px | 700 | KPI summary values |
| **Body / Row Text** | `text-xs font-medium` | 12px / 16px | 500 | Incident titles, table row items |
| **Metadata / Subtitle**| `text-xs text-muted-foreground` | 12px / 16px | 400 | Page subtitles, relative times |
| **Micro Monospace** | `text-[11px] font-mono text-muted-foreground`| 11px / 14px | 400 | Code paths, hashes, environments |

---

## 4. Spacing & Layout Architecture

Strict adherence to the standard **shadcn/ui 4px spacing scale**:

| Token | Pixels | Rem | Usage |
| :--- | :--- | :--- | :--- |
| `p-1` / `gap-1` | 4px | 0.25rem | Filter button gaps, badge inner padding |
| `p-1.5` / `gap-1.5` | 6px | 0.375rem | Button internal padding, inline badge spacing |
| `p-2` / `gap-2` | 8px | 0.5rem | Small control gaps, input vertical padding |
| `p-3` / `gap-3` | 12px | 0.75rem | Card sub-sections, compact list gaps |
| `p-4` / `gap-4` | 16px | 1.0rem | Standard card internal padding, table cell padding |
| `p-5` / `gap-5` | 20px | 1.25rem | Major card padding |
| `space-y-6` | 24px | 1.5rem | Vertical spacing between page sections |

### Layout Rules
- **Header**: Fixed `h-14` (56px) with breadcrumbs and live system status indicator.
- **Sidebar**: Collapsible `16rem` (256px) expanded, `3rem` (48px) collapsed.
- **Main Container**: `max-w-7xl` centered with `p-4 md:p-6` padding.
- **Card Corners**: `rounded-lg` (8px / `0.5rem`).

---

## 5. Product Copy & Tone Guidelines

1. **Short, Action-Oriented Titles**:
   - ✅ `Incidents` (not `Incident Operations & Autonomous Remediation Dashboard`)
   - ✅ `Benchmarks` (not `Evaluation Harness & Benchmark Results Suite`)
   - ✅ `Settings` (not `Governance & Safety Policy Configuration Management`)
   - ✅ `Integrations` (not `Repository & AI Model Setup Wizard`)
2. **Concise Subtitles**:
   - Maximum 1 line, describing the function without marketing buzzwords.
   - Example: `Automated triage, root cause analysis, and draft PRs.`
3. **No Redundant Subtitle Clutter on Cards**:
   - When a KPI card says `Total Incidents` and displays `14`, avoid adding redundant explanatory text like `All ingested signals across production`.
4. **Clear Action Triggers**:
   - Buttons use direct verbs: `Review`, `View`, `Apply Patch`, `Dismiss`, `Snooze`, `Run Benchmarks`.
