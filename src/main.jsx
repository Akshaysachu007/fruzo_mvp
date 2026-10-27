import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import "./styles.css";
import "./tailwind.css";
import "./theme.css";

// Apply the saved palette before the first React render.
try {
    document.documentElement.dataset.theme = localStorage.getItem("fruzo-theme") === "dark" ? "dark" : "light";
} catch {
    document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")).render(
    <App />
);
