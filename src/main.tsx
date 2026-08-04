// Initialize Eruda mobile console (DEV only)
import eruda from 'eruda';
if (import.meta.env.DEV) {
  eruda.init();
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
