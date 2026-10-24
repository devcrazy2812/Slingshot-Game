import React from "react";
import ReactDOM from "react-dom/client";
import { CardScene } from "./CardScene";
import "./shaders/threeui.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden", background: "#050404" }}>
        <CardScene />
      </div>
    </React.StrictMode>
  );
}
