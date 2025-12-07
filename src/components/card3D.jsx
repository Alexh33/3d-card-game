import React from "react";
import { useSpring, animated } from "@react-spring/three";

// index is used to slightly offset cards from each other
export function Card3D({ color = "#ff4b81", label = "Card", index = 0 }) {
  const AnimatedMesh = animated.mesh;

  // Animate card flying out of the pack
  const { position, rotation } = useSpring({
    from: {
      position: [0, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    to: {
      position: [
        (index - 1) * 0.9, // spread cards left/right
        1.5 + Math.random() * 0.3,
        -1.5 - Math.random() * 0.6,
      ],
      rotation: [
        -0.2 - Math.random() * 0.2,
        (index - 1) * 0.4,
        (Math.random() - 0.5) * 0.5,
      ],
    },
    config: { tension: 120, friction: 18 },
    delay: index * 150,
  });

  return (
    <AnimatedMesh position={position} rotation={rotation} castShadow>
      {/* Card is a very thin box */}
      <boxGeometry args={[1.6, 2.3, 0.05]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      {/* You can later add a front texture with card art using meshStandardMaterial + map */}
    </AnimatedMesh>
  );
}
