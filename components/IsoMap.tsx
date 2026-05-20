/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree, ThreeElements } from "@react-three/fiber";
import {
  MapControls,
  Environment,
  SoftShadows,
  Instance,
  Instances,
  Float,
  useTexture,
  Outlines,
  OrthographicCamera,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { MathUtils } from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  Grid,
  BuildingType,
  TileData,
  PlayerCharacter,
  NPC,
  GameSettings,
  CityStats,
} from "../types";
import { GRID_SIZE, BUILDINGS } from "../constants";

// Fix for TypeScript not recognizing R3F elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// --- Constants & Helpers ---
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) =>
  [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

// Deterministic random based on coordinates
const getHash = (x: number, y: number) =>
  Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
const getRandomRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

// --- 1. Advanced Procedural Buildings ---

// FIX: Wrap component in React.memo to ensure TypeScript recognizes it as a component that accepts a 'key' prop.
const WindowBlock = React.memo(
  ({
    position,
    scale,
    level = 1,
    isNight = false,
    color = "#fde047",
  }: {
    position: [number, number, number];
    scale: [number, number, number];
    level?: number;
    isNight?: boolean;
    color?: string;
  }) => (
    <mesh geometry={boxGeo} position={position} scale={scale}>
      <meshStandardMaterial
        color={isNight ? color : level > 1 ? color : "#bfdbfe"}
        emissive={isNight ? color : level > 1 ? color : "#bfdbfe"}
        emissiveIntensity={isNight ? 1.5 : level > 1 ? 0.5 : 0.2}
        roughness={0.1}
        metalness={0.8}
      />
    </mesh>
  ),
);

const PlayerMesh = ({ player }: { player: PlayerCharacter }) => {
  const [wx, _, wz] = gridToWorld(player.x, player.y);
  return (
    <group position={[wx, -0.2, wz]} rotation={[0, player.rotation, 0]}>
      {/* Simple character */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 4, 8]} />
        <meshStandardMaterial color={player.appearance.shirtColor} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color={player.appearance.skinColor} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 0.85, 0.05]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} scale={[1, 0.5, 1]} />
        <meshStandardMaterial color={player.appearance.hairColor} />
      </mesh>
      {/* Speech bubble placeholder */}
      {player.mood && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </Float>
      )}
    </group>
  );
};

const NPCMesh = ({ npc, settings }: { npc: NPC; settings: GameSettings }) => {
  const [wx, _, wz] = gridToWorld(npc.x, npc.y);
  return (
    <group position={[wx, -0.2, wz]}>
      <mesh position={[0, 0.4, 0]} castShadow={settings.shadowQuality !== "off"}>
        <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
        <meshStandardMaterial
          color={npc.type === "Advisor" ? settings.npcAppearance.advisorColor : settings.npcAppearance.citizenColor}
        />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow={settings.shadowQuality !== "off"}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color={settings.npcAppearance.skinColor} />
      </mesh>
      {npc.speech && (
        <Float speed={3} floatIntensity={0.2}>
          <group position={[0, 1.2, 0]}>
            <Html center distanceFactor={10}>
              <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-lg border border-gray-200">
                <p className="text-[10px] whitespace-nowrap font-bold text-gray-800">
                  {npc.speech}
                </p>
              </div>
            </Html>
          </group>
        </Float>
      )}
    </group>
  );
};

const SmokeStack = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const cloud = child as THREE.Mesh;
        cloud.position.y += 0.01 + i * 0.005;
        cloud.scale.addScalar(0.005);

        const material = cloud.material as THREE.MeshStandardMaterial;
        if (material) {
          material.opacity -= 0.005;
          if (cloud.position.y > 1.5) {
            cloud.position.y = 0;
            cloud.scale.setScalar(0.1 + Math.random() * 0.1);
            material.opacity = 0.6;
          }
        }
      });
    }
  });

  return (
    <group position={position}>
      <mesh
        geometry={cylinderGeo}
        castShadow
        receiveShadow
        position={[0, 0.5, 0]}
        scale={[0.2, 1, 0.2]}
      >
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <group ref={ref} position={[0, 1, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            geometry={sphereGeo}
            position={[Math.random() * 0.1, i * 0.4, Math.random() * 0.1]}
            scale={0.2}
          >
            <meshStandardMaterial
              color="#d1d5db"
              transparent
              opacity={0.6}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const WeatherParticles = ({ type }: { type: "rain" | "snow" }) => {
  const count = 1000;
  const meshRef = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = getRandomRange(-GRID_SIZE, GRID_SIZE);
      positions[i * 3 + 1] = getRandomRange(0, 15);
      positions[i * 3 + 2] = getRandomRange(-GRID_SIZE, GRID_SIZE);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const pos = meshRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        pos.setY(i, pos.getY(i) - (type === "rain" ? 30 : 5) * delta);
        if (pos.getY(i) < -1) {
          pos.setY(i, 15);
          pos.setX(i, getRandomRange(-GRID_SIZE, GRID_SIZE));
          pos.setZ(i, getRandomRange(-GRID_SIZE, GRID_SIZE));
        }
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef} geometry={geo}>
      <pointsMaterial
        size={type === "rain" ? 0.05 : 0.15}
        color={type === "rain" ? "#93c5fd" : "#ffffff"}
        transparent
        opacity={0.6}
      />
    </points>
  );
};

interface BuildingMeshProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  level: number;
  opacity?: number;
  transparent?: boolean;
  isNight?: boolean;
  settings: GameSettings;
  isSearched?: boolean;
}

const ProceduralBuilding = React.memo(
  ({
    type,
    baseColor,
    x,
    y,
    level,
    opacity = 1,
    transparent = false,
    isNight = false,
    settings,
    demolishing = false,
    justUpgraded = false,
    isSearched = false,
  }: BuildingMeshProps & { demolishing?: boolean; justUpgraded?: boolean }) => {
    const hash = getHash(x, y);
    const variant = Math.floor(hash * 100); // 0-99
    const rotation = Math.floor(hash * 4) * (Math.PI / 2);

    // Height multiplier based on level
    const levelHeightMult = (1 + (level - 1) * 0.3) * (demolishing ? 0.8 : 1);

    // Color variation
    const color = useMemo(() => {
      const c = new THREE.Color(baseColor);
      // Shift hue and lightness slightly based on hash
      c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
      if (demolishing) c.multiplyScalar(0.5);
      if (justUpgraded) c.lerp(new THREE.Color("#facc15"), 0.5);
      if (isSearched) c.lerp(new THREE.Color("#3b82f6"), 0.8);
      return c;
    }, [baseColor, hash, demolishing, justUpgraded, isSearched]);

    const mainMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color,
          flatShading: true,
          opacity: demolishing ? 0.6 : opacity,
          transparent: demolishing || transparent,
          roughness: 0.8,
          emissive:
            justUpgraded || isSearched
              ? isSearched
                ? "#3b82f6"
                : "#facc15"
              : "#000000",
          emissiveIntensity: isSearched ? 5 : (justUpgraded ? 1.5 : 0),
        }),
      [color, opacity, transparent, demolishing, justUpgraded, isSearched],
    );
    const accentMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).multiplyScalar(0.7),
          flatShading: true,
          opacity: demolishing ? 0.6 : opacity,
          transparent: demolishing || transparent,
        }),
      [color, opacity, transparent, demolishing],
    );
    const roofMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color)
            .multiplyScalar(0.5)
            .offsetHSL(0, 0, -0.1),
          flatShading: true,
          opacity: demolishing ? 0.6 : opacity,
          transparent: demolishing || transparent,
        }),
      [color, opacity, transparent, demolishing],
    );

    const commonProps = { castShadow: !demolishing, receiveShadow: true };

    const yOffset = -0.3;

    return (
      <group
        rotation={[0, rotation, 0]}
        position={[
          demolishing ? Math.sin(Date.now() * 0.02) * 0.05 : 0,
          yOffset,
          0,
        ]}
        scale={[demolishing ? 0.9 : 1, levelHeightMult, demolishing ? 0.9 : 1]}
      >
        {(() => {
          switch (type) {
            case BuildingType.Residential:
              if (variant < 33) {
                // Cozy Cottage
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[0, 0.3, 0]}
                      scale={[0.7, 0.6, 0.6]}
                    />
                    <mesh
                      {...commonProps}
                      material={roofMat}
                      geometry={coneGeo}
                      position={[0, 0.75, 0]}
                      scale={[0.6, 0.4, 0.6]}
                      rotation={[0, Math.PI / 4, 0]}
                    />
                    <WindowBlock
                      position={[0.2, 0.3, 0.31]}
                      scale={[0.15, 0.2, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                    <WindowBlock
                      position={[-0.2, 0.3, 0.31]}
                      scale={[0.15, 0.2, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={boxGeo}
                      position={[0, 0.1, 0.32]}
                      scale={[0.15, 0.2, 0.05]}
                    />
                  </>
                );
              } else if (variant < 66) {
                // Modern Boxy
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[-0.1, 0.35, 0]}
                      scale={[0.6, 0.7, 0.8]}
                    />
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={boxGeo}
                      position={[0.25, 0.25, 0.1]}
                      scale={[0.4, 0.5, 0.6]}
                    />
                    <WindowBlock
                      position={[-0.1, 0.5, 0.41]}
                      scale={[0.4, 0.2, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                  </>
                );
              } else {
                // Townhouse
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[0, 0.5, 0]}
                      scale={[0.5, 1, 0.6]}
                    />
                    <mesh
                      {...commonProps}
                      material={roofMat}
                      geometry={boxGeo}
                      position={[0, 1.05, 0]}
                      scale={[0.55, 0.1, 0.65]}
                    />
                    <WindowBlock
                      position={[0, 0.7, 0.31]}
                      scale={[0.3, 0.2, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                    <WindowBlock
                      position={[0, 0.3, 0.31]}
                      scale={[0.3, 0.2, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                  </>
                );
              }

            case BuildingType.Commercial:
              if (variant < 40) {
                // High-rise
                const height = 1.5 + hash * 1.5;
                const detailDensity =
                  settings.textureLevel === 0
                    ? 0.6
                    : settings.textureLevel === 1
                      ? 0.3
                      : 0.15;
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[0, height / 2, 0]}
                      scale={[0.7, height, 0.7]}
                    />
                    {Array.from({
                      length: Math.floor(height / detailDensity),
                    }).map((_, i) => (
                      <WindowBlock
                        key={i}
                        position={[0, 0.2 + i * detailDensity, 0]}
                        scale={[0.72, 0.1, 0.72]}
                        level={level}
                        isNight={isNight}
                        color={settings.secondaryColor}
                      />
                    ))}
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={boxGeo}
                      position={[0, height + 0.1, 0]}
                      scale={[0.5, 0.2, 0.5]}
                    />
                  </>
                );
              } else if (variant < 70) {
                // Shop
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[0, 0.4, 0]}
                      scale={[0.9, 0.8, 0.8]}
                    />
                    <WindowBlock
                      position={[0, 0.3, 0.41]}
                      scale={[0.8, 0.4, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                    <mesh
                      {...commonProps}
                      material={
                        new THREE.MeshStandardMaterial({
                          color: hash > 0.5 ? "#ef4444" : "#3b82f6",
                        })
                      }
                      geometry={boxGeo}
                      position={[0, 0.55, 0.5]}
                      scale={[0.9, 0.1, 0.2]}
                      rotation={[Math.PI / 6, 0, 0]}
                    />
                  </>
                );
              } else {
                // Corner store
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[-0.2, 0.5, -0.2]}
                      scale={[0.5, 1, 0.5]}
                    />
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={boxGeo}
                      position={[0.1, 0.3, 0.1]}
                      scale={[0.7, 0.6, 0.7]}
                    />
                    <WindowBlock
                      position={[0.1, 0.3, 0.46]}
                      scale={[0.6, 0.3, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                    <mesh
                      {...commonProps}
                      material={
                        new THREE.MeshStandardMaterial({ color: "#9ca3af" })
                      }
                      geometry={boxGeo}
                      position={[0.2, 0.65, 0.2]}
                      scale={[0.2, 0.1, 0.2]}
                    />
                  </>
                );
              }

            case BuildingType.Industrial:
              if (variant < 50) {
                // Factory
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[0, 0.4, 0]}
                      scale={[0.9, 0.8, 0.8]}
                    />
                    <mesh
                      {...commonProps}
                      material={roofMat}
                      geometry={boxGeo}
                      position={[-0.2, 0.9, 0]}
                      scale={[0.4, 0.2, 0.8]}
                      rotation={[0, 0, Math.PI / 4]}
                    />
                    <mesh
                      {...commonProps}
                      material={roofMat}
                      geometry={boxGeo}
                      position={[0.2, 0.9, 0]}
                      scale={[0.4, 0.2, 0.8]}
                      rotation={[0, 0, Math.PI / 4]}
                    />
                    <SmokeStack position={[0.3, 0.4, 0.3]} />
                  </>
                );
              } else {
                // Warehouse
                return (
                  <>
                    <mesh
                      {...commonProps}
                      material={mainMat}
                      geometry={boxGeo}
                      position={[-0.2, 0.3, 0]}
                      scale={[0.5, 0.6, 0.9]}
                    />
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={cylinderGeo}
                      position={[0.25, 0.4, -0.2]}
                      scale={[0.2, 0.8, 0.2]}
                    />
                    <mesh
                      {...commonProps}
                      material={accentMat}
                      geometry={cylinderGeo}
                      position={[0.25, 0.4, 0.25]}
                      scale={[0.2, 0.8, 0.2]}
                    />
                    <mesh
                      {...commonProps}
                      material={
                        new THREE.MeshStandardMaterial({ color: "#6b7280" })
                      }
                      geometry={boxGeo}
                      position={[0.25, 0.7, 0]}
                      scale={[0.05, 0.05, 0.5]}
                    />
                  </>
                );
              }

            case BuildingType.Mansion:
              return (
                <>
                  <mesh
                    {...commonProps}
                    material={mainMat}
                    geometry={boxGeo}
                    position={[0, 0.4, 0]}
                    scale={[0.8, 0.8, 0.8]}
                  />
                  <mesh
                    {...commonProps}
                    material={accentMat}
                    geometry={boxGeo}
                    position={[0, 0.9, 0]}
                    scale={[0.6, 0.2, 0.6]}
                  />
                  <WindowBlock
                    position={[0, 0.4, 0.41]}
                    scale={[0.6, 0.4, 0.05]}
                    level={level}
                    isNight={isNight}
                    color={settings.secondaryColor}
                  />
                </>
              );
            case BuildingType.Hotel:
              return (
                <>
                  <mesh
                    {...commonProps}
                    material={mainMat}
                    geometry={boxGeo}
                    position={[0, 1, 0]}
                    scale={[0.6, 2, 0.6]}
                  />
                  <mesh
                    {...commonProps}
                    material={accentMat}
                    geometry={boxGeo}
                    position={[0, 0.2, 0]}
                    scale={[0.9, 0.4, 0.9]}
                  />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <WindowBlock
                      key={i}
                      position={[0, 0.5 + i * 0.3, 0.31]}
                      scale={[0.4, 0.1, 0.05]}
                      level={level}
                      isNight={isNight}
                      color={settings.secondaryColor}
                    />
                  ))}
                </>
              );
            case BuildingType.Casino:
              return (
                <>
                  <mesh
                    {...commonProps}
                    material={mainMat}
                    geometry={boxGeo}
                    position={[0, 0.5, 0]}
                    scale={[0.9, 1, 0.9]}
                  />
                  <mesh
                    {...commonProps}
                    material={
                      new THREE.MeshStandardMaterial({
                        color: "#f43f5e",
                        emissive: "#f43f5e",
                        emissiveIntensity: isNight ? 1 : 0.2,
                      })
                    }
                    geometry={sphereGeo}
                    position={[0, 1.1, 0]}
                    scale={0.2}
                  />
                  <WindowBlock
                    position={[0, 0.3, 0.46]}
                    scale={[0.7, 0.3, 0.05]}
                    level={level}
                    isNight={isNight}
                    color={settings.secondaryColor}
                  />
                </>
              );
            case BuildingType.Wall:
              return (
                <mesh
                  {...commonProps}
                  material={mainMat}
                  geometry={boxGeo}
                  position={[0, 0.25, 0]}
                  scale={[0.1, 0.5, 1]}
                />
              );
            case BuildingType.Bridge:
              return (
                <group position={[0, 0, 0]}>
                  <mesh
                    {...commonProps}
                    material={mainMat}
                    geometry={boxGeo}
                    position={[0, -0.1, 0]}
                    scale={[1, 0.2, 1]}
                  />
                  <mesh
                    {...commonProps}
                    material={accentMat}
                    geometry={boxGeo}
                    position={[0.4, 0.2, 0]}
                    scale={[0.05, 0.4, 1]}
                  />
                  <mesh
                    {...commonProps}
                    material={accentMat}
                    geometry={boxGeo}
                    position={[-0.4, 0.2, 0]}
                    scale={[0.05, 0.4, 1]}
                  />
                </group>
              );
            case BuildingType.Park:
              const treeCount = 1 + Math.floor(hash * 3);
              const positions = [
                [-0.2, -0.2],
                [0.2, 0.2],
                [-0.2, 0.2],
                [0.2, -0.2],
              ];

              return (
                <group position={[0, -yOffset - 0.29, 0]}>
                  {" "}
                  {/* Adjust park base to sit exactly on top of ground tile */}
                  <mesh
                    receiveShadow
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.01, 0]}
                  >
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#86efac" />
                  </mesh>
                  {variant < 30 && (
                    <group position={[0, 0.05, 0]}>
                      <mesh
                        material={
                          new THREE.MeshStandardMaterial({ color: "#cbd5e1" })
                        }
                        geometry={cylinderGeo}
                        scale={[0.4, 0.1, 0.4]}
                        castShadow
                        receiveShadow
                      />
                      <mesh
                        material={
                          new THREE.MeshStandardMaterial({
                            color: "#3b82f6",
                            roughness: 0.1,
                          })
                        }
                        geometry={cylinderGeo}
                        position={[0, 0.06, 0]}
                        scale={[0.3, 0.05, 0.3]}
                      />
                    </group>
                  )}
                  {Array.from({ length: treeCount }).map((_, i) => {
                    const pos = positions[i % positions.length];
                    const scale = 0.5 + getHash(x + i, y - i) * 0.5;
                    const treeColor = new THREE.Color("#166534").offsetHSL(
                      0,
                      0,
                      getHash(x, y + i) * 0.2,
                    );
                    return (
                      <group
                        key={i}
                        position={[pos[0], 0, pos[1]]}
                        scale={scale}
                        rotation={[0, getHash(i, x) * Math.PI, 0]}
                      >
                        <mesh
                          castShadow
                          receiveShadow
                          material={
                            new THREE.MeshStandardMaterial({ color: "#78350f" })
                          }
                          geometry={cylinderGeo}
                          position={[0, 0.15, 0]}
                          scale={[0.1, 0.3, 0.1]}
                        />
                        <mesh
                          castShadow
                          receiveShadow
                          material={
                            new THREE.MeshStandardMaterial({
                              color: treeColor,
                              flatShading: true,
                            })
                          }
                          geometry={coneGeo}
                          position={[0, 0.4, 0]}
                          scale={[0.4, 0.5, 0.4]}
                        />
                        <mesh
                          castShadow
                          receiveShadow
                          material={
                            new THREE.MeshStandardMaterial({
                              color: treeColor,
                              flatShading: true,
                            })
                          }
                          geometry={coneGeo}
                          position={[0, 0.65, 0]}
                          scale={[0.3, 0.4, 0.3]}
                        />
                      </group>
                    );
                  })}
                </group>
              );
            case BuildingType.Road:
              return null;
            default:
              return null;
          }
        })()}
      </group>
    );
  },
);

// --- 2. Dynamic Systems (Traffic, Citizens, Environment) ---

const carColors = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#ffffff",
  "#1f2937",
  "#f97316",
];

const TrafficSystem = ({ grid, settings }: { grid: Grid, settings: GameSettings }) => {
  const roadTiles = useMemo(() => {
    const roads: { x: number; y: number }[] = [];
    grid.forEach((row) =>
      row.forEach((tile) => {
        if (tile.buildingType === BuildingType.Road)
          roads.push({ x: tile.x, y: tile.y });
      }),
    );
    return roads;
  }, [grid]);

  const carCount = Math.min(roadTiles.length, settings.maxVehicles ?? 20);
  const carsRef = useRef<THREE.InstancedMesh>(null);
  const carsState = useRef<Float32Array>(new Float32Array(0));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(0), []);

  useEffect(() => {
    if (roadTiles.length < 2) return;
    carsState.current = new Float32Array(carCount * 6);
    const newColors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
      const startNode = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      carsState.current[i * 6 + 0] = startNode.x;
      carsState.current[i * 6 + 1] = startNode.y;
      carsState.current[i * 6 + 2] = startNode.x;
      carsState.current[i * 6 + 3] = startNode.y;
      carsState.current[i * 6 + 4] = 1; // force pick new target
      carsState.current[i * 6 + 5] = getRandomRange(0.01, 0.03); // speed

      const color = new THREE.Color(
        carColors[Math.floor(Math.random() * carColors.length)],
      );
      newColors[i * 3] = color.r;
      newColors[i * 3 + 1] = color.g;
      newColors[i * 3 + 2] = color.b;
    }

    if (carsRef.current) {
      carsRef.current.instanceColor = new THREE.InstancedBufferAttribute(
        newColors,
        3,
      );
    }
  }, [roadTiles, carCount]);

  useFrame(() => {
    if (
      !carsRef.current ||
      roadTiles.length < 2 ||
      carsState.current.length === 0
    )
      return;

    for (let i = 0; i < carCount; i++) {
      const idx = i * 6;
      let curX = carsState.current[idx];
      let curY = carsState.current[idx + 1];
      let tarX = carsState.current[idx + 2];
      let tarY = carsState.current[idx + 3];
      let progress = carsState.current[idx + 4];
      const speed = carsState.current[idx + 5];

      // Collision avoidance: check car in front
      let inFrontCollision = false;
      for (let j = 0; j < carCount; j++) {
        if (i === j) continue;
        const jIdx = j * 6;
        const dist = Math.sqrt(
          Math.pow(carsState.current[jIdx] - curX, 2) +
            Math.pow(carsState.current[jIdx + 1] - curY, 2),
        );
        if (dist < 0.3 && carsState.current[jIdx + 4] < progress) {
          // Car ahead is slower or same
          inFrontCollision = true;
          break;
        }
      }

      if (!inFrontCollision) {
        progress += speed;
      }

      if (progress >= 1) {
        curX = tarX;
        curY = tarY;
        progress = 0;

        const neighbors = roadTiles.filter(
          (t) =>
            (Math.abs(t.x - curX) === 1 && t.y === curY) ||
            (Math.abs(t.y - curY) === 1 && t.x === curX),
        );

        if (neighbors.length > 0) {
          // Simple pathfinding: avoid going back immediately
          const valid =
            neighbors.length > 1
              ? neighbors.filter(
                  (n) =>
                    Math.abs(n.x - carsState.current[idx]) > 0.1 ||
                    Math.abs(n.y - carsState.current[idx + 1]) > 0.1,
                )
              : neighbors;

          const next =
            valid.length > 0
              ? valid[Math.floor(Math.random() * valid.length)]
              : neighbors[0];

          tarX = next.x;
          tarY = next.y;
        } else {
          const rnd = roadTiles[Math.floor(Math.random() * roadTiles.length)];
          curX = rnd.x;
          curY = rnd.y;
          tarX = rnd.x;
          tarY = rnd.y;
        }
      }

      carsState.current[idx] = curX;
      carsState.current[idx + 1] = curY;
      carsState.current[idx + 2] = tarX;
      carsState.current[idx + 3] = tarY;
      carsState.current[idx + 4] = progress;

      // Interpolate position
      const gx = MathUtils.lerp(curX, tarX, progress);
      const gy = MathUtils.lerp(curY, tarY, progress);

      // Determine driving side offset
      const dx = tarX - curX;
      const dy = tarY - curY;
      const angle = Math.atan2(dy, dx);

      // Offset to right side relative to movement
      const offsetAmt = 0.15;
      // Normals: (-dy, dx)
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offX = (-dy / len) * offsetAmt;
      const offY = (dx / len) * offsetAmt;

      const [wx, _, wz] = gridToWorld(gx + offX, gy + offY);

      // Road surface is approx -0.3. Car height 0.15.
      dummy.position.set(wx, -0.3 + 0.075, wz);
      dummy.rotation.set(0, -angle, 0);
      // Car dimensions (Length(X), Height(Y), Width(Z) assuming 0 rotation aligns with X)
      dummy.scale.set(0.5, 0.15, 0.3);

      dummy.updateMatrix();
      carsRef.current.setMatrixAt(i, dummy.matrix);
    }
    carsRef.current.instanceMatrix.needsUpdate = true;
  });

  if (roadTiles.length < 2) return null;

  return (
    <instancedMesh
      ref={carsRef}
      args={[boxGeo, undefined, carCount]}
      castShadow
    >
      <meshStandardMaterial roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
};

const clothesColors = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

const PopulationSystem = ({
  population,
  grid,
}: {
  population: number;
  grid: Grid;
}) => {
  const agentCount = Math.min(Math.floor(population / 2), 300);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Find tiles where people can walk (Roads, Parks, empty ground)
  const walkableTiles = useMemo(() => {
    const tiles: { x: number; y: number }[] = [];
    grid.forEach((row) =>
      row.forEach((tile) => {
        if (
          tile.buildingType === BuildingType.Road ||
          tile.buildingType === BuildingType.Park ||
          tile.buildingType === BuildingType.None
        ) {
          tiles.push({ x: tile.x, y: tile.y });
        }
      }),
    );
    return tiles;
  }, [grid]);

  const agentsState = useRef<Float32Array>(new Float32Array(0));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (agentCount === 0 || walkableTiles.length === 0) return;
    agentsState.current = new Float32Array(agentCount * 6);
    const newColors = new Float32Array(agentCount * 3);

    for (let i = 0; i < agentCount; i++) {
      const t = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
      // Spawn with random offset in tile
      const x = t.x + getRandomRange(-0.4, 0.4);
      const y = t.y + getRandomRange(-0.4, 0.4);

      agentsState.current[i * 6 + 0] = x;
      agentsState.current[i * 6 + 1] = y;

      // Initial target
      const tt =
        walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
      agentsState.current[i * 6 + 2] = tt.x + getRandomRange(-0.4, 0.4);
      agentsState.current[i * 6 + 3] = tt.y + getRandomRange(-0.4, 0.4);

      agentsState.current[i * 6 + 4] = getRandomRange(0.005, 0.015); // speed
      agentsState.current[i * 6 + 5] = Math.random() * Math.PI * 2; // anim

      const c = new THREE.Color(
        clothesColors[Math.floor(Math.random() * clothesColors.length)],
      );
      newColors[i * 3] = c.r;
      newColors[i * 3 + 1] = c.g;
      newColors[i * 3 + 2] = c.b;
    }

    if (meshRef.current) {
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(
        newColors,
        3,
      );
    }
  }, [agentCount, walkableTiles]);

  useFrame((state) => {
    if (
      !meshRef.current ||
      agentCount === 0 ||
      agentsState.current.length === 0
    )
      return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < agentCount; i++) {
      const idx = i * 6;
      let x = agentsState.current[idx];
      let y = agentsState.current[idx + 1];
      let tx = agentsState.current[idx + 2];
      let ty = agentsState.current[idx + 3];
      const speed = agentsState.current[idx + 4];
      const animOffset = agentsState.current[idx + 5];

      const dx = tx - x;
      const dy = ty - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) {
        // Pick new random target from walkable
        if (walkableTiles.length > 0) {
          const tt =
            walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
          tx = tt.x + getRandomRange(-0.4, 0.4);
          ty = tt.y + getRandomRange(-0.4, 0.4);
          agentsState.current[idx + 2] = tx;
          agentsState.current[idx + 3] = ty;
        }
      } else {
        x += (dx / dist) * speed;
        y += (dy / dist) * speed;
        agentsState.current[idx] = x;
        agentsState.current[idx + 1] = y;
      }

      const [wx, _, wz] = gridToWorld(x, y);

      // Walking bounce
      const bounce = Math.abs(Math.sin(time * 10 + animOffset)) * 0.03;

      // Person dimensions
      const height = 0.2;
      const width = 0.08;
      // Ground level approx -0.3 to -0.4
      const groundY = -0.35;

      dummy.position.set(wx, groundY + height / 2 + bounce, wz);
      dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
      dummy.scale.set(width, height, width);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (agentCount === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[boxGeo, undefined, agentCount]}
      castShadow
    >
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
};

// Clouds & Birds
const Cloud = ({
  position,
  scale,
  speed,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
}) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (group.current) {
      group.current.position.x += speed * delta;
      if (group.current.position.x > GRID_SIZE * 1.5)
        group.current.position.x = -GRID_SIZE * 1.5;
    }
  });

  const bubbles = useMemo(
    () =>
      Array.from({ length: 5 + Math.random() * 5 }).map(() => ({
        pos: [
          getRandomRange(-1, 1),
          getRandomRange(-0.5, 0.5),
          getRandomRange(-1, 1),
        ] as [number, number, number],
        scale: getRandomRange(0.5, 1.2),
      })),
    [],
  );

  return (
    <group ref={group} position={position} scale={scale}>
      {bubbles.map((b, i) => (
        <mesh
          key={i}
          geometry={sphereGeo}
          position={b.pos}
          scale={b.scale}
          castShadow
        >
          <meshStandardMaterial
            color="white"
            flatShading
            opacity={0.9}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

const Bird = ({
  position,
  speed,
  offset,
}: {
  position: [number, number, number];
  speed: number;
  offset: number;
}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.elapsedTime + offset;
      ref.current.position.x = position[0] + Math.sin(time * speed) * GRID_SIZE;
      ref.current.position.z =
        position[1] + (Math.cos(time * speed) * GRID_SIZE) / 2;
      ref.current.rotation.y = -time * speed + Math.PI;
      ref.current.scale.y = 1 + Math.sin(time * 15) * 0.3;
    }
  });

  return (
    <group ref={ref} position={[position[0], position[2], position[1]]}>
      <mesh
        geometry={boxGeo}
        scale={[0.2, 0.05, 0.05]}
        position={[0.1, 0, 0]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh
        geometry={boxGeo}
        scale={[0.2, 0.05, 0.05]}
        position={[-0.1, 0, 0]}
        rotation={[0, -Math.PI / 4, 0]}
      >
        <meshBasicMaterial color="#333" />
      </mesh>
    </group>
  );
};

const EnvironmentEffects = () => {
  return (
    <group raycast={() => null}>
      {/* Clouds */}
      <Cloud position={[-12, 8, 4]} scale={1.5} speed={0.3} />
      <Cloud position={[5, 9, -8]} scale={1.2} speed={0.5} />
      <Cloud position={[15, 7, 10]} scale={1.8} speed={0.2} />

      {/* Birds */}
      <group position={[0, 0, 0]} scale={0.8}>
        <Bird position={[0, 0, 10]} speed={0.6} offset={0} />
        <Bird position={[0, 0, 10]} speed={0.6} offset={1.2} />
        <Bird position={[0, 0, 10]} speed={0.6} offset={2.5} />
      </group>

      {/* Water */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[GRID_SIZE * 4, GRID_SIZE * 4]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.1}
          metalness={0.5}
          opacity={0.8}
          transparent
        />
      </mesh>
    </group>
  );
};

// --- 3. Main Map Component ---

const RoadMarkings = React.memo(
  ({
    x,
    y,
    grid,
    yOffset,
    level = 1,
  }: {
    x: number;
    y: number;
    grid: Grid;
    yOffset: number;
    level?: number;
  }) => {
    const lineMaterial = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: level > 1 ? "#fbef44" : "#fbbf24",
          emissive: level > 1 ? "#fbef44" : "#000000",
          emissiveIntensity: 0.5,
        }),
      [level],
    );
    const lineGeo = useMemo(() => new THREE.PlaneGeometry(0.1, 0.5), []);

    const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
    const hasDown =
      y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
    const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
    const hasRight =
      x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;

    const isJunction =
      [hasUp, hasDown, hasLeft, hasRight].filter(Boolean).length > 2;

    return (
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
        {isJunction && (
          <mesh
            position={[0, 0, 0.005]}
            material={
              new THREE.MeshStandardMaterial({
                color: "#fff",
                opacity: 0.5,
                transparent: true,
              })
            }
          >
            <planeGeometry args={[0.4, 0.4]} />
          </mesh>
        )}

        {/* Default line for empty/straight connections */}
        {!hasUp && !hasDown && !hasLeft && !hasRight && (
          <mesh geometry={lineGeo} material={lineMaterial} />
        )}

        {hasUp && (
          <mesh
            position={[0, 0.25, 0]}
            geometry={lineGeo}
            material={lineMaterial}
          />
        )}
        {hasDown && (
          <mesh
            position={[0, -0.25, 0]}
            geometry={lineGeo}
            material={lineMaterial}
          />
        )}
        {hasLeft && (
          <mesh
            position={[-0.25, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            geometry={lineGeo}
            material={lineMaterial}
          />
        )}
        {hasRight && (
          <mesh
            position={[0.25, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            geometry={lineGeo}
            material={lineMaterial}
          />
        )}
      </group>
    );
  },
);

interface GroundTileProps {
  type: BuildingType;
  x: number;
  y: number;
  grid: Grid;
  onHover: (x: number, y: number) => void;
  onLeave: () => void;
  onClick: (x: number, y: number) => void;
  settings: GameSettings;
  isNight?: boolean;
}

// Ground Tile: Handles pointer events and forms base terrain
const GroundTile = React.memo(
  ({
    type,
    x,
    y,
    grid,
    onHover,
    onLeave,
    onClick,
    settings,
    isNight = false,
  }: GroundTileProps) => {
    const [wx, _, wz] = gridToWorld(x, y);
    const tile = grid[y][x];
    const level = tile.level;

    const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
    const hasDown =
      y < grid.length - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
    const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
    const hasRight =
      x < grid[0].length - 1 &&
      grid[y][x + 1].buildingType === BuildingType.Road;

    let color = "#10b981";
    // Base level for tiles, slightly varying
    let topY = -0.3;
    let thickness = 0.5;

    if (type === BuildingType.None) {
      const noise = getHash(x, y);
      color = noise > 0.7 ? "#059669" : noise > 0.3 ? "#10b981" : "#34d399";
      topY = -0.3 - noise * 0.1; // Slight height variation for grass
    } else if (type === BuildingType.Road) {
      color = "#374151";
      topY = -0.29; // slightly higher
    } else {
      color = "#d1d5db"; // concrete base
      topY = -0.28;
    }

    const centerY = topY - thickness / 2;

    const showsTrafficLight =
      type === BuildingType.Road &&
      [hasUp, hasDown, hasLeft, hasRight].filter(Boolean).length >= 3;
    const showsStreetLight =
      type === BuildingType.Road &&
      !showsTrafficLight &&
      x % 3 === 0 &&
      y % 3 === 0;

    return (
      <mesh
        position={[wx, centerY, wz]}
        receiveShadow
        castShadow
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(x, y);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onLeave();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button === 0) onClick(x, y);
        }}
      >
        <boxGeometry args={[1, thickness, 1]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
        {type === BuildingType.Road && (
          <RoadMarkings
            x={x}
            y={y}
            grid={grid}
            yOffset={thickness / 2 + 0.001}
            level={level}
          />
        )}

        {showsTrafficLight && (
          <group position={[0.4, thickness / 2, 0.4]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.05, 0.6, 0.05]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, 0.1]} />
              <meshStandardMaterial
                color={
                  Math.floor(Date.now() / 2000) % 2 === 0
                    ? "#22c55e"
                    : "#ef4444"
                }
                emissive={
                  Math.floor(Date.now() / 2000) % 2 === 0
                    ? "#22c55e"
                    : "#ef4444"
                }
                emissiveIntensity={isNight ? 2 : 0.5}
              />
            </mesh>
          </group>
        )}

        {showsStreetLight && (
          <group position={[0.4, thickness / 2, 0.4]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[0.03, 0.8, 0.03]} />
              <meshStandardMaterial color="#444" />
            </mesh>
            <mesh
              position={[-0.05, 0.75, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <boxGeometry args={[0.03, 0.15, 0.03]} />
              <meshStandardMaterial color="#444" />
            </mesh>
            <mesh position={[-0.1, 0.73, 0]} castShadow>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial
                color={isNight ? settings.secondaryColor : "#333"}
                emissive={isNight ? settings.secondaryColor : "#000"}
                emissiveIntensity={isNight ? 2 : 0}
              />
            </mesh>
            {isNight && (
              <pointLight
                position={[-0.1, 0.6, 0]}
                intensity={0.5}
                distance={2}
                color={settings.secondaryColor}
              />
            )}
          </group>
        )}
      </mesh>
    );
  },
);

// Selection/Hover Cursor
const Cursor = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const [wx, _, wz] = gridToWorld(x, y);
  return (
    <mesh
      position={[wx, -0.25, wz]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthTest={false}
      />
      <Outlines thickness={0.05} color="white" />
    </mesh>
  );
};

interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  stats: CityStats;
  player: PlayerCharacter;
  npcs: NPC[];
  settings: GameSettings;
  gameTime: number;
  searchQuery?: string;
}

const MapScene = ({
  grid,
  onTileClick,
  hoveredTool,
  stats,
  player,
  npcs,
  settings,
  gameTime,
  hoveredTile,
  setHoveredTile,
  searchQuery,
}: any) => {
  const { camera } = useThree();
  const [zoom, setZoom] = useState(45);

  useFrame(() => {
    if ((camera as any).zoom !== zoom) {
      setZoom((camera as any).zoom);
    }
  });

  const detailLevel = !settings.lodEnabled
    ? 2
    : zoom > 80
      ? 2
      : zoom > 40
        ? 1
        : 0;
  const effectiveSettings = useMemo(
    () => ({
      ...settings,
      textureLevel: Math.min(settings.textureLevel, detailLevel),
    }),
    [settings, detailLevel, zoom],
  );

  // Day-Night Calc
  const time = gameTime % 2400;
  const isNightCycle = time > 1800 || time < 600;
  const ambientIntensity = isNightCycle ? 0.05 : 0.6;
  const lightIntensity = isNightCycle ? 0.02 : 1.5;
  const lightColor = isNightCycle ? "#4a3aff" : "#fffbeb";
  const fogColor = isNightCycle ? "#08001a" : "#bae6fd";
  const bgColor = isNightCycle ? "#020010" : "#1e293b";
  const isRainy = settings.weather === "rainy";
  const isSnowy = settings.weather === "cloudy";

  const handleHover = useCallback(
    (x: number, y: number) => {
      setHoveredTile({ x, y });
    },
    [setHoveredTile],
  );

  const handleLeave = useCallback(() => {
    setHoveredTile(null);
  }, [setHoveredTile]);

  const showPreview =
    hoveredTile &&
    grid[hoveredTile.y][hoveredTile.x].buildingType === BuildingType.None &&
    hoveredTool !== BuildingType.None;
  const previewColor = showPreview ? BUILDINGS[hoveredTool].color : "white";
  const isBulldoze = hoveredTool === BuildingType.None;
  const previewPos = hoveredTile
    ? gridToWorld(hoveredTile.x, hoveredTile.y)
    : [0, 0, 0];

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <OrthographicCamera
        makeDefault
        zoom={45}
        position={[20, 20, 20]}
        near={-100}
        far={400}
      />

      {settings.volumetricFog && (
        <fogExp2 attach="fog" args={[fogColor, (settings.fogDensity ?? 0.5) * 0.03]} />
      )}

      <MapControls
        enableRotate={!settings.camLocked}
        enableZoom={true}
        zoomSpeed={settings.cameraZoomSensitivity ?? 1}
        enablePan={!settings.panLocked}
        minZoom={10}
        maxZoom={150}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.1}
        target={[0, -0.5, 0]}
      />

      <ambientLight intensity={ambientIntensity * (settings.brightness ?? 1) * (isNightCycle ? (settings.nightLight ?? 1) : 1)} color="#cceeff" />
      <directionalLight
        castShadow={settings.shadowQuality !== "off"}
        position={[15, 20, 10]}
        intensity={lightIntensity * (1 - (settings.shadowDarkness ?? 0.5) * 0.5) * (settings.globalLight ?? 1) * (isNightCycle ? (settings.nightDarkness ?? 1) : 1) * (settings.brightness ?? 1)} 
        color={lightColor}
        shadow-mapSize={
          settings.shadowQuality === "high" ? [4096, 4096] : settings.shadowQuality === "med" ? [2048, 2048] : [512, 512]
        }
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {settings.reflections && <Environment preset={isNightCycle ? "night" : "city"} />}

      {settings.graphicsQuality !== "low" && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={1.2}
            mipmapBlur
            intensity={(isNightCycle ? 1.5 : 0.2) * (settings.bloomIntensity ?? 1)}
          />
        </EffectComposer>
      )}

      <EnvironmentEffects />

      {isRainy && <WeatherParticles type="rain" />}
      {isSnowy && <WeatherParticles type="snow" />}

      <group>
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const [wx, _, wz] = gridToWorld(x, y);
            const isSelected = hoveredTile?.x === x && hoveredTile?.y === y;

            return (
              <React.Fragment key={`${x}-${y}`}>
                <GroundTile
                  type={tile.buildingType}
                  x={x}
                  y={y}
                  grid={grid}
                  onHover={handleHover}
                  onLeave={handleLeave}
                  onClick={onTileClick}
                  settings={effectiveSettings}
                  isNight={isNightCycle}
                />

                <group position={[wx, 0, wz]} raycast={() => null}>
                  {tile.buildingType !== BuildingType.None &&
                    tile.buildingType !== BuildingType.Road && (
                      <group>
                        <ProceduralBuilding
                          type={tile.buildingType}
                          baseColor={BUILDINGS[tile.buildingType].color}
                          x={x}
                          y={y}
                          level={tile.level}
                          isNight={isNightCycle}
                          settings={effectiveSettings}
                          demolishing={tile.demolishing}
                          justUpgraded={tile.justUpgraded}
                          isSearched={
                            searchQuery
                              ? tile.buildingType
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                BUILDINGS[tile.buildingType].name
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                              : false
                          }
                        />
                        {settings.showLevelIndicators &&
                          (isSelected || tile.level > 1) && (
                            <group position={[0, 1.5, 0]}>
                              <mesh>
                                <boxGeometry args={[0.3, 0.3, 0.05]} />
                                <meshBasicMaterial color="white" />
                              </mesh>
                            </group>
                          )}
                      </group>
                    )}
                </group>
              </React.Fragment>
            );
          }),
        )}

        <group raycast={() => null}>
          <TrafficSystem grid={grid} settings={settings} />
          <PopulationSystem population={stats.population} grid={grid} />
          <PlayerMesh player={player} />
          {npcs && npcs.map((npc: any) => <NPCMesh key={npc.id} npc={npc} settings={settings} />)}

          {showPreview && hoveredTile && (
            <group position={[previewPos[0], 0, previewPos[2]]}>
              <Float
                speed={3}
                rotationIntensity={0}
                floatIntensity={0.1}
                floatingRange={[0, 0.1]}
              >
                <ProceduralBuilding
                  type={hoveredTool}
                  baseColor={previewColor}
                  x={hoveredTile.x}
                  y={hoveredTile.y}
                  level={1}
                  transparent
                  opacity={0.7}
                  settings={effectiveSettings}
                />
              </Float>
            </group>
          )}

          {hoveredTile && (
            <Cursor
              x={hoveredTile.x}
              y={hoveredTile.y}
              color={
                isBulldoze ? "#ef4444" : showPreview ? "#ffffff" : "#000000"
              }
            />
          )}
        </group>
      </group>

      {settings.shadowQuality !== "off" && settings.shadowQuality !== "low" && (
        <SoftShadows 
          size={10 * (settings.shadowDarkness ?? 0.5 * 2)} 
          samples={settings.shadowQuality === 'high' ? 16 : 8} 
        />
      )}
    </>
  );
};

const IsoMap: React.FC<IsoMapProps> = ({
  grid,
  onTileClick,
  hoveredTool,
  stats,
  player,
  npcs,
  settings,
  gameTime,
  searchQuery,
}) => {
  const [hoveredTile, setHoveredTile] = useState<{
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="absolute inset-0 bg-black touch-none">
      <Canvas
        shadows={settings.shadowQuality !== "off"}
        dpr={
          settings.display === "minimal"
            ? [0.5, 0.75]
            : settings.display === "high"
              ? [1, 2]
              : [1, 1.5]
        }
        gl={{
          antialias: settings.antiAliasing,
          powerPreference: "high-performance",
        }}
      >
        <MapScene
          grid={grid}
          onTileClick={onTileClick}
          hoveredTool={hoveredTool}
          stats={stats}
          player={player}
          npcs={npcs}
          settings={settings}
          gameTime={gameTime}
          hoveredTile={hoveredTile}
          setHoveredTile={setHoveredTile}
          searchQuery={searchQuery}
        />
      </Canvas>
    </div>
  );
};

export default IsoMap;
