import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/style.css";
import { registerSW } from "virtual:pwa-register";

// vite-plugin-pwa handles the service worker (precache + auto-update), replacing
// the hand-wired sw.js. autoUpdate pulls new builds without a manual bump.
registerSW({ immediate: true });

// no StrictMode: its dev-only double-invoke of effects double-inits the Pixi
// Application (two canvases). prod runs effects once regardless; keeping dev
// == prod here avoids that race.
createRoot(document.getElementById("root")).render(<App />);
