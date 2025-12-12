import React, { useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/three";
import { useCursor, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

const PACK_MODEL_PATH = "/models/scene.gltf"; // current model in public/models/

export function PackOpener({ position = [0, 0, 0], onOpen, opened = false, disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(PACK_MODEL_PATH);
  const { baseColor, normal } = useTexture({
    baseColor: "/models/body_baseColor.png",
    normal: "/models/body_normal.png",
  });

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (baseColor) {
          baseColor.wrapS = baseColor.wrapT = THREE.RepeatWrapping;
          baseColor.repeat.set(1.05, 1.05); // slightly reduced coverage
          baseColor.offset.set(-0.02, 0.06); // gentle upward nudge
          baseColor.colorSpace = THREE.SRGBColorSpace;
          child.material.map = baseColor;
        }
        if (normal) {
          normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
          normal.repeat.set(1.05, 1.05);
          normal.offset.set(-0.02, 0.06);
          child.material.normalMap = normal;
          child.material.normalScale = new THREE.Vector2(0.22, 0.22);
        }
        child.material.needsUpdate = true;
      }
    });
  }, [scene, baseColor, normal]);

  const canInteract = hovered && !opened && !disabled;

  // change cursor to pointer on hover
  useCursor(canInteract);

  // Hover animation (scale + subtle rotation)
  const { scale, rotationY } = useSpring({
    scale: canInteract ? 1.05 : 1,
    rotationY: canInteract ? 0.08 : 0,
    config: { tension: 200, friction: 15 },
  });

  const handleClick = () => {
    if (opened || disabled) return;
    onOpen?.();
  };

  const MODEL_SCALE = 1.6;

  return (
    <group position={position}>
      <animated.group
        scale={scale}
        rotation-y={rotationY}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
        castShadow
      >
        {scene ? (
          <primitive
            object={scene}
            scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]}
            rotation={[Math.PI / 2 + Math.PI, Math.PI + Math.PI / 2, Math.PI]} // upright, rotate facing 90° clockwise, flip on X and Z
            position={[0, 0.2, 0.2]} // lower in frame, slight forward nudge
          />
        ) : (
          <mesh>
            <boxGeometry args={[1.8, 2.8, 0.2]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        )}
      </animated.group>
    </group>
  );
}

useGLTF.preload(PACK_MODEL_PATH);
