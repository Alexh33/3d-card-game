import React, { useState } from "react";
import { Card3D } from "./components/Card3D";
import { PackOpener } from "./components/PackOpener";

export default function ThreeScene() {
  const [hasOpened, setHasOpened] = useState(false);

  const cards = [
    { id: 1, color: "#ff4b81", label: "Mythic Meme" },
    { id: 2, color: "#4b9dff", label: "Rare Roast" },
    { id: 3, color: "#5bff9d", label: "Common Cringe" },
  ];

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#111119" />
      </mesh>

      <PackOpener position={[0, 0, 0]} onOpen={() => setHasOpened(true)} />

      {hasOpened &&
        cards.map((card, index) => (
          <Card3D
            key={card.id}
            color={card.color}
            label={card.label}
            index={index}
          />
        ))}
    </>
  );
}
