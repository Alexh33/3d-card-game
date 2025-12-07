import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import ThreeScene from "./ThreeScene";

export default function App() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "radial-gradient(circle at top, #151520, #050509)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", zIndex: 10, padding: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>
          3D Card Pack Demo
        </h1>
        <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
          Drag to look around. Click the pack to open it.
        </p>
      </div>

      <Canvas camera={{ position: [0, 2.5, 6], fov: 50 }}>
        {/* Nice soft lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />

        {/* Simple 3D scene with cards + pack */}
        <ThreeScene />

        {/* Environment + controls */}
        <Environment preset="city" />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
