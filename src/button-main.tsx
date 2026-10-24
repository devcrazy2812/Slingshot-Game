import React from "react";
import ReactDOM from "react-dom/client";
import { Scene } from "./Scene";
import "./shaders/threeui.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden", background: "#222225" }}>
        <Scene />
      </div>
    </React.StrictMode>
  );
}
