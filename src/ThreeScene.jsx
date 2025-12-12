import React, { useMemo, useState, useEffect } from "react";
import { useSpring, animated } from "@react-spring/three";
import { Card3D } from "./components/Card3D";
import { PackOpener } from "./components/PackOpener";

const DEFAULT_CARDS = [
  { id: 1, color: "#ff4b81", label: "Mythic Meme", name: "Mythic Meme", clarity_index: 0.95 },
  { id: 2, color: "#4b9dff", label: "Rare Roast", name: "Rare Roast", clarity_index: 0.82 },
  { id: 3, color: "#5bff9d", label: "Common Cringe", name: "Common Cringe", clarity_index: 0.71 },
];

// Displays the 3D pack + optional cards after opening.
export default function ThreeScene({ cards = [], onOpen, opened, disabled = false }) {
  const [localOpened, setLocalOpened] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [tearStage, setTearStage] = useState("idle"); // idle -> tearing -> opened -> hidden
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedOrder, setRevealedOrder] = useState([]);
  const isControlled = opened !== undefined;
  const hasOpened = isControlled ? opened : localOpened;

  const rarityScore = (card) => {
    const weight = { Legendary: 3, Rare: 2, Common: 1, Uncommon: 1.5 };
    const rarity = weight[card.rarity] ?? 0;
    const clarity = typeof card.clarity_index === "number" ? card.clarity_index : 0;
    return rarity * 10 + clarity;
  };

  const cardsToRender = useMemo(() => {
    const list = cards.length === 0 ? DEFAULT_CARDS : cards;
    return [...list]
      .map((card, index) => ({
        ...card,
        id: card.id ?? index,
        color: card.color ?? "#c8ff9d",
        label: card.label ?? card.name ?? `Card ${index + 1}`,
      }))
      .sort((a, b) => rarityScore(a) - rarityScore(b)); // worst first, best last
  }, [cards]);

  useEffect(() => {
    // reset when card set changes or reopen
    setCurrentIndex(0);
    setRevealedOrder([]);
    setTearStage("idle");
  }, [cardsToRender.length, hasOpened]);

  const handleOpen = () => {
    if (hasOpened || disabled) return;
    if (!isControlled) setLocalOpened(true);
    setFlash(true);
    setTearStage("tearing");
    setTimeout(() => setFlash(false), 900); // linger the flash for suspense
    setTimeout(() => {
      setTearStage("opened");
      setCardsVisible(true);
    }, 1100); // delay card reveal for anticipation
    setTimeout(() => setTearStage("hidden"), 1600); // hide pack after tear
    onOpen?.();
  };

  const handleRevealCard = (idx) => {
    if (idx !== currentIndex) return;
    setRevealedOrder((prev) => [...prev, idx]);
    if (currentIndex < cardsToRender.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const { sparkleScale, sparkleOpacity } = useSpring({
    sparkleScale: 0,
    sparkleOpacity: 0,
  });

  const packSpring = useSpring({
    scale: tearStage === "tearing" ? 1.05 : 1,
    rotationY: tearStage === "tearing" ? 0.15 : 0,
    positionY: tearStage === "tearing" ? 0.05 : 0,
    opacity: tearStage === "hidden" ? 0 : 1,
    config: { tension: 180, friction: 16 },
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#111119" />
      </mesh>

      {tearStage !== "hidden" && (
        <animated.group
          scale={packSpring.scale}
          rotation-y={packSpring.rotationY}
          position-y={packSpring.positionY}
          onPointerOver={(e) => e.stopPropagation()}
        >
          <PackOpener
            position={[0, 0, 0]}
            onOpen={handleOpen}
            opened={hasOpened}
            disabled={disabled}
          />
        </animated.group>
      )}

      {flash && (
        <mesh>
          <sphereGeometry args={[3.5, 32, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      )}


      {cardsVisible &&
        cardsToRender.map((card, index) => {
          const revealedIndex = revealedOrder.indexOf(index);
          const isActive = index === currentIndex && revealedIndex < 0;

          const positionTarget = (() => {
            if (revealedIndex >= 0) {
              const spread = (revealedOrder.length - 1) / 2;
              return [
                (revealedIndex - spread) * 1.4,
                1.0,
                1.8 + revealedIndex * 0.05,
              ];
            }
            if (isActive) return [0, 1.0, 1.1]; // top of stack, ready to flip
            // stacked, slightly offset toward camera by index
            return [0, 0.4 + index * 0.02, 0.2 + index * 0.03];
          })();

          const rotationTarget = (() => {
            if (revealedIndex >= 0) {
              return [0, (revealedIndex - 1) * 0.25, 0];
            }
            if (isActive) return [-Math.PI / 2 + 0.15, 0, 0];
            return [-Math.PI / 2 + 0.05, 0, 0]; // face-down stack
          })();

          return (
            <Card3D
              key={card.id}
              card={card}
              index={index}
              interactive={isActive}
              positionTarget={positionTarget}
              rotationTarget={rotationTarget}
              delay={index * 80}
              onClick={() => handleRevealCard(index)}
            />
          );
        })}
    </>
  );
}
