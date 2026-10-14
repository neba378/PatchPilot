# PatchPilot Design System Specification

> **Version**: 1.1.0  
> **Status**: Approved & Canonical  
> **Selected Palette**: **Graphite & Safety Amber** (Industrial SRE Reliability)  
> **Target**: PatchPilot Autonomous SRE & DevSecOps Platform  
> **Framework**: Next.js 15, Tailwind CSS, shadcn/ui, Radix UI Primitives  

---

## 1. Design Philosophy & SRE Identity

PatchPilot is an **autonomous, mission-critical incident remediation platform**. SRE and DevOps engineers rely on it during high-stress production outages. The design system prioritizes:

1. **Information Density without Clutter**: High-speed triage requires glanceable status indicators, compact data tables, and structured telemetry cards.
2. **High-Contrast Legibility (WCAG AAA)**: Text, badges, and code diffs maintain high contrast (`> 12:1` on headers, `> 8.5:1` on telemetry) against deep slate-graphite surfaces, avoiding alert fatigue and washed-out grays.
3. **Safety Amber Priority**: Amber is the primary action and focus color (`#F59E0B`), symbolizing human-in-the-loop governance, circuit breakers, and vigilant incident command.
4. **Calm Supporting Accents**:
   - Sky-Blue (`#38BDF8`) for automated PRs and agent workflows.
   - Precision Emerald (`#34D399`) for verified sandbox tests and passing mutations.
   - High-Salience Red/Rose (`#F87171`) for critical production 500 faults.
5. **Standardized shadcn Spacing**: Built on the proven, accessible 4px grid of shadcn/ui to ensure seamless drop-in blocks and future extension.

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
- **Card Radius**: `0.625rem` (`10px` / `rounded-xl`) with `1px` border (`border-border`).

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
| Role | Class | Size / Leading | Weight | Tracking | Contrast vs Surface |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-2xl` | 24px / 32px | Bold (700) | `-0.025em` (tight) | `14.8:1` (WCAG AAA) |
| **Section Title** | `text-base` | 16px / 24px | SemiBold (600) | `-0.015em` | `13.5:1` (WCAG AAA) |
| **KPI Numbers** | `text-2xl font-mono` | 24px / 28px | Bold (700) | `-0.02em` | `14.0:1` (WCAG AAA) |
| **Body Primary** | `text-sm` | 14px / 20px | Medium (500) | `normal` | `12.5:1` (WCAG AAA) |
| **Subtext / Table** | `text-xs` | 12px / 16px | Medium (500) | `normal` | `10.2:1` (WCAG AAA) |
| **Micro Labels** | `text-[10px]` | 10px / 14px | SemiBold (600) | `+0.05em` | `8.7:1` (WCAG AAA) |

---

## 4. Canonical Color Palette: "Graphite & Safety Amber"

### Core Tokens
| Role | CSS Token | Hex Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `hsl(222, 47%, 9%)` | `#0B1322` | Root app background |
| **Card Surface** | `hsl(217, 33%, 14%)` | `#172134` | Cards, table containers, modals |
| **Primary Action** | `hsl(38, 92%, 50%)` | `#F59E0B` | Buttons, active navigation, key focus rings |
| **Primary Foreground** | `hsl(38, 95%, 8%)` | `#261603` | Text on amber buttons (high contrast) |
| **Secondary Surface** | `hsl(217, 25%, 19%)` | `#222E44` | Inactive tabs, hover fills, inputs |
| **Muted Surface** | `hsl(217, 25%, 16%)` | `#1D273B` | Table headers, secondary badges |
| **Muted Text** | `hsl(215, 20%, 72%)` | `#A0AEC0` | Metadata, timestamps, secondary labels |
| **Borders & Dividers** | `hsl(217, 25%, 21%)` | `#28364F` | Card outlines, table rows, separators |

### Status Semantic Signals
- **Critical / Fault**: `#F87171` (`Red-400` / `bg-red-500/15 text-red-400 border-red-500/30`)
- **Awaiting Approval**: `#F59E0B` (`Amber-500` / `bg-amber-500/15 text-amber-400 border-amber-500/30`)
- **Verified / Passed**: `#34D399` (`Emerald-400` / `bg-emerald-500/15 text-emerald-400 border-emerald-500/30`)
- **Draft PR / Telemetry**: `#38BDF8` (`Sky-400` / `bg-sky-500/15 text-sky-400 border-sky-500/30`)
- **Abstained (Policy)**: `#C084FC` (`Purple-400` / `bg-purple-500/15 text-purple-400 border-purple-500/30`)

### Sidebar Tokens
- **Sidebar Background**: `hsl(222, 47%, 7.5%)` (`#09101C`)
- **Sidebar Foreground**: `hsl(215, 20%, 75%)` (`#A8B6C8`)
- **Sidebar Accent**: `hsl(217, 25%, 15%)` (`#1B2538`)
- **Sidebar Border**: `hsl(217, 25%, 17%)` (`#202C42`)
- **Sidebar Ring**: `hsl(38, 92%, 50%)` (`#F59E0B`)

---

## 5. Alternative Switcher Palettes Preserved

The platform maintains the theme engine allowing operators to toggle alternative calibrated palettes if desired:
1. **Obsidian & Electric Cobalt** (High-tech navy/cyan cockpit)
2. **Zinc & Indigo Linear** (Minimalist monochrome developer aesthetic)
3. **Cyber Emerald & NOC** (Phosphor terminal mission control)
4. **Graphite & Safety Amber** (Canonical default)

---

## 6. Implementation Architecture

All tokens map directly to CSS variables defined in [`src/app/globals.css`](file:///home/nebiyu/.gemini/antigravity/worktrees/PatchPilot/rebuild_ui_shard_scene/src/app/globals.css) and are consumed via standard Tailwind utility classes (`bg-background`, `bg-card`, `bg-primary`, `text-primary`, `border-border`).
