import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

// Generate a canvas texture with base skin + quality overlay.
const IMAGE_MAP = {
  doge: "/images/doge.jpg",
  "grumpy cat": "/images/grumpy-cat.jpg",
  "grumpy-cat": "/images/grumpy-cat.jpg",
  pepe: "/images/pepe.jpg",
  angrycat: "/images/angrycat.jpg",
  "angry cat": "/images/angrycat.jpg",
};

function resolveImage(card) {
  const fromCard = card.image;
  if (fromCard) {
    if (fromCard.startsWith("http")) return fromCard;
    if (fromCard.startsWith("/")) return fromCard;
    return `/images/${fromCard.replace(/^\//, "")}`;
  }

  const key = (card.name || card.label || card.id || "").toString().toLowerCase();
  if (IMAGE_MAP[key]) return IMAGE_MAP[key];
  return null;
}

function useCardTexture(card, index) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const imageUrl = resolveImage(card);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    const primary = card.color || "#a855f7";
    const secondary = "#0b0b18";
    const quality = Math.max(0, Math.min(1, card.clarity_index ?? 0.8));

    const draw = (img) => {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Optional card art
      if (img) {
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, dx, dy;
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgRatio;
          dx = (canvas.width - drawWidth) / 2;
          dy = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          dx = 0;
          dy = (canvas.height - drawHeight) / 2;
        }
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      }

      // Centering offset based on quality (worse quality => more offset)
      const maxOffset = 24;
      const offsetSeed = (index + 1) * 37;
      const offsetX = (1 - quality) * maxOffset * Math.sin(offsetSeed);
      const offsetY = (1 - quality) * maxOffset * Math.cos(offsetSeed);

      // Inner frame (acts like the printed area)
      const margin = 48;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(
        margin + offsetX,
        margin + offsetY,
        canvas.width - margin * 2,
        canvas.height - margin * 2
      );

      // Title text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px 'Space Grotesk', system-ui";
      ctx.textAlign = "center";
      ctx.fillText(card.label || card.name || "Card", canvas.width / 2 + offsetX, 120 + offsetY);

      // Rarity tag
      if (card.rarity) {
        ctx.font = "bold 28px 'Space Grotesk', system-ui";
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        const pillWidth = ctx.measureText(card.rarity).width + 32;
        ctx.fillRect(
          canvas.width / 2 - pillWidth / 2 + offsetX,
          150 + offsetY,
          pillWidth,
          46
        );
        ctx.fillStyle = "#ffe082";
        ctx.fillText(card.rarity, canvas.width / 2 + offsetX, 182 + offsetY);
      }

      // Surface wear / scratches if quality is lower
      if (quality < 0.9) {
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 2;
        const scratchCount = Math.round((1 - quality) * 12);
        for (let i = 0; i < scratchCount; i++) {
          const x1 = Math.random() * canvas.width;
          const y1 = Math.random() * canvas.height;
          const x2 = x1 + (Math.random() - 0.5) * 120;
          const y2 = y1 + (Math.random() - 0.5) * 120;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Corner wear based on quality
      if (quality < 0.95) {
        ctx.fillStyle = "rgba(0,0,0," + 0.35 * (1 - quality) + ")";
        const radius = 18 + 30 * (1 - quality);
        const corners = [
          [0, 0],
          [canvas.width - radius, 0],
          [0, canvas.height - radius],
          [canvas.width - radius, canvas.height - radius],
        ];
        corners.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, radius, radius, 0, 0, Math.PI / 2);
          ctx.fill();
        });
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      setTexture(tex);
    };

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      img.src = imageUrl;
    } else {
      draw(null);
    }

    return () => {
      if (texture) texture.dispose();
    };
  }, [card.image, card.color, card.label, card.name, card.rarity, card.clarity_index, index]);

  return texture;
}

// index is used to slightly offset cards from each other
export function Card3D({
  card = {},
  index = 0,
  interactive = false,
  positionTarget = [0, 0, 0],
  rotationTarget = [0, 0, 0],
  delay = 0,
  onClick,
}) {
  const AnimatedMesh = animated.mesh;
  const texture = useCardTexture(card, index);
  const [dragging, setDragging] = useState(false);

  const { position, rotation } = useSpring({
    to: {
      position: positionTarget,
      rotation: rotationTarget,
    },
    config: { tension: 110, friction: 20 },
    delay,
  });

  return (
    <AnimatedMesh
      position={position}
      rotation={rotation}
      castShadow
      onPointerDown={
        interactive
          ? (e) => {
              e.stopPropagation();
              setDragging(true);
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e) => {
              e.stopPropagation();
              setDragging(false);
              onClick?.();
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setDragging(false);
            }
          : undefined
      }
      onPointerMove={
        interactive && dragging
          ? (e) => {
      // rotate horizontally only; fixed vertical tilt
      // rotationTarget drives orientation; drag is ignored for now
    }
          : undefined
      }
    >
      {/* Card is a very thin box */}
      <boxGeometry args={[1.6, 2.3, 0.05]} />
      <meshStandardMaterial
        color={card.color || "#ffffff"}
        metalness={0.35}
        roughness={0.4}
        map={texture}
      />
    </AnimatedMesh>
  );
}
