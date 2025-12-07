import React, { useState } from "react";
import { useSpring, animated } from "@react-spring/three";
import { useCursor } from "@react-three/drei";

export function PackOpener({ position = [0, 0, 0], onOpen }) {
  const AnimatedMesh = animated.mesh;
  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(false);

  useCursor(hovered && !opened); // change cursor to pointer on hover

  // Hover animation (scale + subtle rotation)
  const { scale, rotationY } = useSpring({
    scale: hovered && !opened ? 1.1 : 1,
    rotationY: hovered && !opened ? 0.2 : 0,
    config: { tension: 200, friction: 15 },
  });

  // Lid animation when opened
  const { lidRotation } = useSpring({
    lidRotation: opened ? -Math.PI / 2.8 : 0,
    config: { tension: 220, friction: 25 },
  });

  const handleClick = () => {
    if (opened) return;
    setOpened(true);
    if (onOpen) onOpen();
  };

  return (
    <group position={position}>
      {/* Main pack body */}
      <AnimatedMesh
        scale={scale}
        rotation-y={rotationY}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
        castShadow
      >
        {/* body */}
        <boxGeometry args={[2, 3, 0.8]} />
        <meshStandardMaterial
          color={opened ? "#ffcc00" : "#a020f0"}
          metalness={0.6}
          roughness={0.3}
        />
      </AnimatedMesh>

      {/* Lid, slightly offset on top */}
      <AnimatedMesh
        position={[0, 1.6, 0.2]}
        rotation-x={lidRotation}
        castShadow
      >
        <boxGeometry args={[2.05, 0.4, 0.9]} />
        <meshStandardMaterial
          color={opened ? "#ffe066" : "#c040ff"}
          metalness={0.6}
          roughness={0.35}
        />
      </AnimatedMesh>
    </group>
  );
}
