"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, MeshDistortMaterial } from "@react-three/drei";
import type { Group, Points as ThreePoints, Mesh } from "three";

function AnswerSheet({
  position,
  rotation,
  accent = "#c8f169",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  accent?: string;
}) {
  return (
    <Float speed={1.6} rotationIntensity={0.35} floatIntensity={1.1}>
      <group position={position} rotation={rotation}>
        <RoundedBox args={[2.1, 2.8, 0.08]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#12171f" roughness={0.35} metalness={0.25} />
        </RoundedBox>
        {[-0.95, -0.55, -0.15, 0.25, 0.65, 1.05].map((y, i) => (
          <mesh key={i} position={[-0.08, y, 0.055]}>
            <boxGeometry args={[i === 0 ? 0.9 : 1.55, 0.1, 0.02]} />
            <meshStandardMaterial
              color={i === 2 ? accent : "#2a3442"}
              emissive={i === 2 ? accent : "#000000"}
              emissiveIntensity={i === 2 ? 1.4 : 0}
              roughness={0.4}
            />
          </mesh>
        ))}
        {/* option bubbles */}
        {[-0.15, 0.25].map((y, r) =>
          [0.45, 0.68, 0.91].map((x, c) => (
            <mesh key={`${r}-${c}`} position={[x - 0.4, y - 0.32, 0.06]}>
              <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
              <meshStandardMaterial
                color={(r === 0 && c === 1) || (r === 1 && c === 2) ? accent : "#39434f"}
                emissive={(r === 0 && c === 1) || (r === 1 && c === 2) ? accent : "#000"}
                emissiveIntensity={1.2}
              />
            </mesh>
          )),
        )}
      </group>
    </Float>
  );
}

function Core() {
  const blob = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (blob.current) blob.current.rotation.y += delta * 0.18;
    if (ring.current) {
      ring.current.rotation.x += delta * 0.35;
      ring.current.rotation.y -= delta * 0.22;
    }
  });
  return (
    <group>
      <Float speed={1.2} floatIntensity={0.7}>
        <mesh ref={blob}>
          <sphereGeometry args={[1.35, 64, 64]} />
          <MeshDistortMaterial
            color="#161c26"
            distort={0.42}
            speed={2.2}
            roughness={0.15}
            metalness={0.55}
          />
        </mesh>
      </Float>
      <mesh ref={ring}>
        <torusGeometry args={[2.35, 0.02, 12, 120]} />
        <meshStandardMaterial color="#c8f169" emissive="#c8f169" emissiveIntensity={1.6} />
      </mesh>
      <mesh rotation={[0.9, 0.4, 0.2]}>
        <torusGeometry args={[2.9, 0.015, 12, 120]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const ref = useRef<ThreePoints>(null);
  const { positions, colors } = useMemo(() => {
    const n = 700;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const cA = [0.78, 0.95, 0.41]; // lime
    const cB = [0.65, 0.55, 0.98]; // iris
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      const c = Math.random() > 0.75 ? cA : Math.random() > 0.6 ? cB : [0.45, 0.5, 0.58];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.014;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

function Rig() {
  const g = useRef<Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (typeof window !== "undefined") {
      const onMove = (e: MouseEvent) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      if (!window.__fcpMouseBound) {
        window.addEventListener("mousemove", onMove, { passive: true });
        window.__fcpMouseBound = true;
      }
    }
    const gEl = g.current;
    if (!gEl) return;
    const targetY = mouse.current.x * 0.22;
    const targetX = -mouse.current.y * 0.14;
    gEl.rotation.y += (targetY - gEl.rotation.y) * 0.05;
    gEl.rotation.x += (targetX - gEl.rotation.x) * 0.05;
    const s = typeof window !== "undefined" ? window.scrollY : 0;
    gEl.position.y = s * 0.0016;
    gEl.position.x = typeof window !== "undefined" && window.innerWidth > 900 ? 1.9 : 0;
  });

  return (
    <group ref={g}>
      <Core />
      <AnswerSheet position={[-3.4, 0.6, -1.2]} rotation={[0.1, 0.5, -0.14]} />
      <AnswerSheet position={[2.9, -1.5, -0.6]} rotation={[-0.06, -0.5, 0.12]} accent="#a78bfa" />
      <Float speed={1.4} floatIntensity={1.4}>
        <mesh position={[-2.2, -1.8, 0.4]}>
          <icosahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color="#c8f169" wireframe />
        </mesh>
      </Float>
      <Float speed={1.8} floatIntensity={1.6}>
        <mesh position={[3.3, 1.9, -0.8]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color="#a78bfa" wireframe />
        </mesh>
      </Float>
      <Starfield />
    </group>
  );
}

declare global {
  interface Window {
    __fcpMouseBound?: boolean;
  }
}

export default function Scene() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 9], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 6]} intensity={1.3} />
      <pointLight position={[-5, 3, 2]} intensity={40} color="#c8f169" />
      <pointLight position={[5, -3, -2]} intensity={30} color="#a78bfa" />
      <Suspense fallback={null}>
        <Rig />
      </Suspense>
    </Canvas>
  );
}
