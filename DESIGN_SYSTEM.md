# PatchPilot Design System Specification

> **Version**: 1.0.0  
> **Target**: PatchPilot Autonomous SRE & DevSecOps Platform  
> **Framework**: Next.js 15, Tailwind CSS, shadcn/ui, Radix UI Primitives  

---

## 1. Design Philosophy & SRE Identity

PatchPilot is an **autonomous, mission-critical incident remediation platform**. SRE and DevOps engineers rely on it during high-stress production outages. The design system prioritizes:

1. **Information Density without Clutter**: High-speed triage requires glanceable status indicators, compact data tables, and structured telemetry cards.
2. **High-Contrast Legibility (WCAG AAA)**: Text, badges, and code diffs must remain legible under varying lighting conditions with no washed-out grays.
3. **Calm Authority**: Avoid chaotic alert fatigue. Use deliberate, functional colors: green for verified sandbox proofs, amber for human approval gates, rose for critical faults, and cyan/cobalt for automated agent telemetry.
4. **Standardized shadcn Spacing**: Built on the proven, accessible 4px grid of shadcn/ui to ensure seamless drop-in blocks and future extension.

---

## 2. Spacing & Layout Architecture

We adhere strictly to the standard **shadcn/ui 4px spacing scale** (Tailwind CSS defaults):

| Token | Size | Rem | Primary Usage |
| :--- | :--- | :--- | :--- |
| `0.5` | 2px | 0.125rem | Micro-offsets, border indicators, badge padding |
| `1` | 4px | 0.25rem | Compact item gap, badge horizontal padding |
| `1.5` | 6px | 0.375rem | Button icon spacing, table cell compact gap |
| `2` | 8px | 0.5rem | Input vertical padding, card sub-element gap |
| `2.5` | 10px | 0.625rem | Button vertical padding |
| `3` | 12px | 0.75rem | Card header gap, dropdown padding |
| `4` | 16px | 1.0rem | Standard card inner padding, grid gap |
| `5` | 20px | 1.25rem | Dashboard section spacing |
| `6` | 24px | 1.5rem | Page header padding, large card content |
| `8` | 32px | 2.0rem | Major section separation |

### Grid & Layout Rules
- **Sidebar Width**: `16rem` (`256px`) expanded, `3.25rem` (`52px`) icon-only collapsed.
- **Max Content Width**: `80rem` (`1280px` / `max-w-7xl`) for dashboard grids and data tables.
- **Card Radius**: `0.625rem` (`10px` / `rounded-xl`) with `1px` subtle border.

---

## 3. Typography & Contrast Hierarchy

### Font Families
- **Primary Sans**: `Geist Sans`, `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`
  - High x-height, clear differentiation between `0`/`O` and `1`/`l`/`I`.
  - Feature settings: `"rlig" 1, "calt" 1, "cv02", "cv03", "cv04"`.
- **Monospace Telemetry**: `JetBrains Mono`, `Geist Mono`, `Fira Code`, `monospace`
  - Used for incident fingerprints, commit hashes, code diffs, logs, timestamps, and metric values.
  - Tabular numbers enabled: `font-variant-numeric: tabular-nums`.

### Type Scale & Leading
| Role | Class | Size / Leading | Weight | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-2xl` | 24px / 32px | Bold (700) | `-0.025em` (tight) |
| **Section Title** | `text-base` | 16px / 24px | SemiBold (600) | `-0.015em` |
| **KPI Numbers** | `text-2xl font-mono` | 24px / 28px | Bold (700) | `-0.02em` |
| **Body Primary** | `text-sm` | 14px / 20px | Normal (400) | `normal` |
| **Subtext / Table** | `text-xs` | 12px / 16px | Medium (500) | `normal` |
| **Micro Labels** | `text-[10px]` | 10px / 14px | SemiBold (600) | `+0.05em` (uppercase) |

---

## 4. Curated Color Palettes for PatchPilot

Below are the 4 research-backed color palettes designed specifically for SRE incident response:

### Palette 1: "Obsidian & Electric Cobalt" (Default Recommended)
*The High-Tech Autonomous Operations Cockpit.* Deep obsidian slate background paired with electric cobalt and vibrant cyan accents. Highest legibility, calm dark mode feel.

- **Background**: `#080D1A` (`hsl(222, 47%, 7%)`)
- **Card Surface**: `#0D1527` (`hsl(222, 47%, 10%)`)
- **Primary**: `#3B82F6` (`hsl(217, 91%, 60%)`)
- **Primary Accent / PRs**: `#06B6D4` (`Cyan-500`)
- **Success / Verified**: `#10B981` (`Emerald-500`)
- **Warning / Review**: `#F59E0B` (`Amber-500`)
- **Critical / Fault**: `#EF4444` (`Rose-500`)
- **Borders**: `#1E293B` (`Slate-800 / hsl(217, 33%, 16%)`)

---

### Palette 2: "Zinc & Indigo Linear"
*Modern Minimalist Developer Tooling.* Warm deep zinc background with clean indigo and violet accents, mirroring modern developer workflow tools (Linear / Raycast style).

- **Background**: `#09090B` (`hsl(240, 10%, 4%)`)
- **Card Surface**: `#121215` (`hsl(240, 10%, 8%)`)
- **Primary**: `#6366F1` (`hsl(239, 84%, 67%)`)
- **Primary Accent / PRs**: `#8B5CF6` (`Violet-500`)
- **Success / Verified**: `#22C55E` (`Green-500`)
- **Warning / Review**: `#EAB308` (`Yellow-500`)
- **Critical / Fault**: `#F43F5E` (`Rose-500`)
- **Borders**: `#27272A` (`Zinc-800`)

---

### Palette 3: "Cyber Emerald & Mission Control"
*Classic Observability & SRE Terminal.* Deep carbon black with phosphor emerald and mint telemetry highlights, reminiscent of Datadog and high-reliability NOC displays.

- **Background**: `#040D09` (`hsl(150, 50%, 4%)`)
- **Card Surface**: `#081710` (`hsl(150, 45%, 7%)`)
- **Primary**: `#10B981` (`hsl(160, 84%, 39%)`)
- **Primary Accent / PRs**: `#14B8A6` (`Teal-500`)
- **Success / Verified**: `#059669` (`Emerald-600`)
- **Warning / Review**: `#F59E0B` (`Amber-500`)
- **Critical / Fault**: `#E11D48` (`Rose-600`)
- **Borders**: `#133022` (`hsl(150, 40%, 14%)`)

---

### Palette 4: "Graphite & Safety Amber"
*Industrial Reliability & Incident Command.* Slate graphite base with safety amber and high-visibility status cues, emphasizing human-in-the-loop safety and governance.

- **Background**: `#0F172A` (`Slate-900 / hsl(222, 47%, 11%)`)
- **Card Surface**: `#1E293B` (`Slate-800 / hsl(217, 33%, 17%)`)
- **Primary**: `#F59E0B` (`Amber-500 / hsl(38, 92%, 50%)`)
- **Primary Accent / PRs**: `#38BDF8` (`Sky-400`)
- **Success / Verified**: `#34D399` (`Emerald-400`)
- **Warning / Review**: `#FB923C` (`Orange-400`)
- **Critical / Fault**: `#F87171` (`Red-400`)
- **Borders**: `#334155` (`Slate-700`)

---

## 5. Semantic Color Mapping Reference

| Token Name | Obsidian Cobalt | Zinc Indigo | Cyber Emerald | Graphite Amber | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--background` | `222 47% 7%` | `240 10% 4%` | `150 50% 4%` | `222 47% 11%` | Page viewport canvas |
| `--card` | `222 47% 10%` | `240 10% 8%` | `150 45% 7%` | `217 33% 17%` | Container surfaces |
| `--primary` | `217 91% 60%` | `239 84% 67%` | `160 84% 39%` | `38 92% 50%` | Brand call-to-actions, active links |
| `--border` | `217 33% 16%` | `240 6% 16%` | `150 40% 14%` | `217 19% 27%` | Card, table, and divider lines |
| `--destructive` | `0 72% 51%` | `350 89% 60%` | `347 77% 50%` | `0 84% 60%` | Critical alerts, 500 errors |
| `--success` | `160 84% 39%` | `142 71% 45%` | `160 84% 39%` | `156 72% 67%` | Sandbox-proven patches, tests passed |
| `--warning` | `38 92% 50%` | `48 96% 53%` | `38 92% 50%` | `27 96% 61%` | Awaiting review, CI regressions |

---

## 6. Implementation Architecture

The color system is driven by standard CSS variables in [`src/app/globals.css`](file:///home/nebiyu/.gemini/antigravity/worktrees/PatchPilot/rebuild_ui_shard_scene/src/app/globals.css). Changing the active theme attribute (e.g. `data-theme="obsidian"` or `data-theme="zinc"`) instantaneously updates all shadcn components, tables, buttons, badges, and cards across the entire application without component-level style modifications.
