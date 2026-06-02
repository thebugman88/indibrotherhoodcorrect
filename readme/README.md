# Indie Brotherhood App Directory & Page Guide

Welcome to the **Indie Brotherhood** application directory. This comprehensive guide outlines every page, view, and utility module in the system, explaining their specific roles, visual context, and functional mechanics.

---

## 🗺️ System Route Mapping

| Path | Component | Description / Purpose |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Premium authentication gate and custom tier selector. |
| `/dashboard` | `Dashboard` | Central command interface for brotherhood utilities. |
| `/profile` | `ProfilePage` | Digital identity manager and K7 Contract hub. |
| `/mastering` | `MasteringSuite` | Advanced browser-based track post-processing emulator. |
| `/analysis` | `HitAnalyzer` | Generative A&R track analyzer and feedback advisor. |
| `/lyrics` | `LyricPro` | Premium, zero-persistence AI lyric-writing lab. |
| `/collectives` | `CollectiveDashboard` | Team management workspace for collaborative creator squads. |
| `/judgment` | `JudgmentPage` | Community feedback arena with honest critique pools. |
| `/k7-syndicate` | `K7Pool` | Underground asset pool for stems, samples, and loops. |
| `/lounge` | `LoungePage` | Social hub featuring live feeds and creator discussions. |
| `/ibh` | `IBHMeetingRoom` | Meeting room for planning strategic launches. |
| `/store` | `StorePage` | Micro-transaction hub to purchase Brotherhood Credits (BC). |
| `/ml-lab` | `SemanticLab` | High-tech acoustic analysis engine and pattern mapping lab. |
| `/assistant` | `ArtistManager` | Interactive independent artist AI campaign planner. |
| `/control-room` | `AdminControlRoom`| Secure administrative operator terminal. |
| `/gatekeeper` | `VaultGatekeeper` | High-level secure biometric authentication checkpoint. |
| `/api/v1/vault/*` | `TrapRoom` | Cyber-security honeypot built to trap automated scrapers. |

---

## 🎨 Page-by-Page Descriptions & Functions

### 1. Landing Gate (`/`)
* **Component:** `LandingPage`
* **Function:** Serves as the high-contrast starting destination of the platform. It handles user login/registration via Secure Email and Google OAuth, features high-impact animated display typography, lists localized promotional items, and offers a flexible tier selection layout (ranging from Free to Supreme/Elite partnerships) with seamless invite-code validations.

### 2. Main Dashboard (`/dashboard`)
* **Component:** `Dashboard`
* **Function:** The primary visual command center. It offers instant telemetry on connected system users, current server status indicators, quick-launch layouts for primary features, and central metrics (such as current point balances, earned badges, and Brotherhood Credits (BC) counts).

### 3. Artist Profile (`/profile`)
* **Component:** `ProfilePage`
* **Function:** Allows independent creators to refine their public-facing digital profile elements. Users can modify account slogans, bios, layout preferences, and upload premium custom wallpapers. It also serves as the secure interface to verify active K7 artist distribution contracts.

### 4. Mastering Suite (`/mastering`)
* **Component:** `MasteringSuite`
* **Function:** An elite, browser-based digital mastering facility. Artists can load high-definition audio links to visualize advanced audio waveforms, run spectral analyses, adjust high/mid/low equalizer bands, and simulate professional-grade vintage tube, tape saturation, and solid-state mastering outputs.

### 5. Hit Analyzer (`/analysis`)
* **Component:** `HitAnalyzer`
* **Function:** A cutting-edge generative A&R dashboard. Artists submit lyric text or web audio links to receive a full breakdown, including an overall Market Viability Score, detailed critiques of lyrical depth and hook structure, and a customized "Reclamation Fix" providing strategic suggestions to refine and improve the track's impact.

### 6. Lyric Pro Studio (`/lyrics`)
* **Component:** `LyricPro`
* **Function:** An elite, zero-retention AI lyrical typewriter. Writers select genres (Hip Hop, Country, Drill, Trap, Rap, etc.), toggle safety settings (Clean vs. Unleashed mode), and describe their thematic ideas to generate multiple distinct styled drafts (Classic vs. Modern). Built-in options allow writers to instantly copy bars, claim rights, and download text files without any raw data persisting on server disks.

### 7. Collective Workspace (`/collectives`)
* **Component:** `CollectiveDashboard`
* **Function:** Dedicated portal for multi-artist crews and indie alliances. It provides collective roster trackers, shared goal checklists, joint release planners, and collaborative milestone charts designed to streamline team rollouts.

### 8. The Judgment (`/judgment`)
* **Component:** `JudgmentPage`
* **Function:** An unvarnished peer-review platform. Brotherhood members submit streaming URLs and track definitions, opening them to feedback from peers, transparent critiques, and detailed scoring matrices that foster hard creative improvements.

### 9. K7 Syndicate stems (`/k7-syndicate`)
* **Component:** `K7Pool`
* **Function:** An underground exchange pool for beats, samples, and loops. Stems and loops are uploaded with cryptographic metadata (BPM, key, and DNA Tracer IDs) to guarantee absolute track ownership and safe lineage detection down the production line.

### 10. The Lounge (`/lounge`)
* **Component:** `LoungePage`
* **Function:** A premium creator-focused social feed where artists discuss ongoing releases, share updates, embed web audio links, post critiques, and connect interactively within the brotherhood context.

### 11. IBH Briefing Room (`/ibh`)
* **Component:** `IBHMeetingRoom`
* **Function:** A secure terminal-inspired coordination office. Brotherhood leaders use this to establish high-level strategic agendas, schedule virtual conferences, update rolling system timelines, and coordinate synchronized web takeovers.

### 12. The 99¢ Store (`/store`)
* **Component:** `StorePage`
* **Function:** The commerce dashboard of the ecosystem. It provides direct, secure premium payment channels (integrated via advanced PayPal scripts) to purchase additional Brotherhood Credits (BC), buy specialized workflow templates, or request elite custom mastering audits.

### 13. ML Semantic Lab (`/ml-lab`)
* **Component:** `SemanticLab`
* **Function:** A diagnostics suite for music scientists. It provides an interface to scan production files, view real-time sonic frequency histograms, map harmonic matching coefficients, and execute acoustic calculations.

### 14. Artist Assistant (`/assistant`)
* **Component:** `ArtistManager`
* **Function:** A custom AI manager interface. Artists input their release targets, marketing spend limits, and genres to instantly map comprehensive, daily 30-day promotional schedules complete with recommended platforms, visual briefs, and budget guides.

### 15. Admin Control Room (`/control-room`)
* **Component:** `AdminControlRoom`
* **Function:** The command terminal for the platform's super administrators. It displays system telemetry logs, allows management of active user bases, performs instant balance operations, and governs background constants.

### 16. Vault Gatekeeper (`/gatekeeper`)
* **Component:** `VaultGatekeeper`
* **Function:** A high-end security interface built with futuristic biometric simulators and cipher entry fields, controlling access to restricted areas of the platform.

### 17. The Honeypot Room (`/api/v1/vault/*`)
* **Component:** `TrapRoom` (controlled by `SentinelBoundary`)
* **Function:** A defensive security layer. Designed to mimic sensitive file systems or auto-login portals to catch bad-faith bots and scrapers. Visitors accessing these paths are trapped in an elongated, recursive navigation path while their public connection metadata (Threat DNA Logs) is written to high-capacity local logs.
