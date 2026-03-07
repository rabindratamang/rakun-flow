This Product Requirements Document (PRD) outlines the development of **Rakun Flow**, a professional-grade, web-based HLS media player.

---

# PRD: Rakun Flow (HLS Media Player)

**Version:** 1.0

**Status:** Draft / Ready for Implementation

**Lead:** Rakun

---

## 1. Product Overview

**Rakun Flow** is a high-performance, browser-based HLS (HTTP Live Streaming) player built on `hls.js`. It is designed to be a "shipping-ready" product—meaning it focuses on a polished UI/UX, cross-platform responsiveness, and seamless stream handling.

### Target Audience

* Developers needing a reliable stream tester.
* Users wanting a clean, ad-free interface for HLS playback.
* Content creators sharing live or VOD (Video on Demand) links.

---

## 2. Technical Stack

* **Engine:** `hls.js` (for MSE-enabled browsers).
* **Framework:** Next JS (Tailwind CSS for styling).
* **Icons:** Lucide-React or Phosphor Icons (for a modern, thin-stroke look).

---

## 3. Functional Requirements

### 3.1 Playback Features

* **Core Controls:** Play, Pause, Seek Forward (+10s), Seek Backward (-10s).
* **Volume:** Slider with mute/unmute toggle.
* **Quality Switcher:** Manual selection of bitrates/resolutions provided by the HLS manifest (Auto, 1080p, 720p, etc.).
* **Fullscreen:** Native browser fullscreen support.
* **Picture-in-Picture (PiP):** Allow users to float the video while browsing other tabs.

### 3.2 Input & Deep Linking

* **Manual Input:** A sleek, centered overlay or "URL Bar" that disappears once playback starts.
* **Query Parameter Support:** * The player must check the URL for the `?stream` parameter on load.
* **Logic:** `if (urlParams.has('stream')) { loadSource(urlParams.get('stream')); }`



### 3.3 Device Responsiveness

| Surface | Requirement |
| --- | --- |
| **Desktop** | Hover-state controls, keyboard shortcuts (Space for play/pause). |
| **Tablet** | Large touch targets for buttons, gesture support. |
| **Mobile** | Auto-hide controls, vertical orientation handling, "lock" orientation prompt. |

---

## 4. User Interface (UI) Design Specs

* **Theme:** "Nocturnal" by default (Dark mode). Deep grays `#121212` and "Rakun Teal" `#00f2ff` accents.
* **Transitions:** All UI elements (play button, progress bar) must use a 200ms ease-in-out transition.
* **Glassmorphism:** Control bar should feature a subtle backdrop blur:
> `backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.5);`



---

## 5. Success Metrics (KPIs)

1. **Time to First Frame (TTFF):** Stream should start within 1.5 seconds of URL input.
2. **Compatibility:** 99% playback success on Chrome, Safari, and Firefox.
3. **Responsiveness:** Zero UI "breakage" between 320px and 4K resolutions.

---

## 6. Development Roadmap

### Phase 1: Core Engine

* Integrate `hls.js`.
* Implement `?stream=` query logic.

### Phase 2: The "Flow" UI

* Build the custom control bar (Play/Pause/Seek).
* Implement the Quality Selector (pulling levels from `hls.levels`).

### Phase 3: Polish

* Add PiP and Fullscreen.
* Mobile touch-target optimization.

---
