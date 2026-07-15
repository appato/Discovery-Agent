'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size.width, size.height]
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec2 vUv;
    uniform float uTime;

    float softGlow(vec2 uv, vec2 center, float radius, float softness) {
      float d = length(uv - center);
      return 1.0 - smoothstep(radius - softness, radius + softness, d);
    }

    void main() {
      vec2 uv = vUv;
      vec3 color = vec3(0.03, 0.04, 0.12);

      // Orb 1 — slow, large, deep blue
      vec2 o1 = vec2(
        0.28 + sin(uTime * 0.17) * 0.12,
        0.55 + cos(uTime * 0.23) * 0.18
      );
      float r1 = 0.28 + sin(uTime * 0.31) * 0.06;
      float a1 = softGlow(uv, o1, r1, 0.32);
      color = mix(color, vec3(0.08, 0.25, 0.70), a1 * 0.32);

      // Orb 2 — medium, royal blue
      vec2 o2 = vec2(
        0.72 + cos(uTime * 0.21) * 0.16,
        0.38 + sin(uTime * 0.28) * 0.14
      );
      float r2 = 0.32 + cos(uTime * 0.38) * 0.07;
      float a2 = softGlow(uv, o2, r2, 0.36);
      color = mix(color, vec3(0.12, 0.35, 0.85), a2 * 0.28);

      // Orb 3 — large bottom-center, indigo
      vec2 o3 = vec2(
        0.52 + cos(uTime * 0.13) * 0.25,
        0.72 + sin(uTime * 0.19) * 0.20
      );
      float r3 = 0.38 + sin(uTime * 0.26) * 0.09;
      float a3 = softGlow(uv, o3, r3, 0.42);
      color = mix(color, vec3(0.05, 0.18, 0.55), a3 * 0.38);

      // Orb 4 — small top-left, bright
      vec2 o4 = vec2(
        0.18 + sin(uTime * 0.35) * 0.08,
        0.22 + cos(uTime * 0.42) * 0.09
      );
      float r4 = 0.18 + cos(uTime * 0.48) * 0.05;
      float a4 = softGlow(uv, o4, r4, 0.22);
      color = mix(color, vec3(0.18, 0.45, 0.92), a4 * 0.22);

      // Orb 5 — mid-right, cyan-tinged
      vec2 o5 = vec2(
        0.84 + cos(uTime * 0.27) * 0.10,
        0.62 + sin(uTime * 0.33) * 0.13
      );
      float r5 = 0.20 + sin(uTime * 0.44) * 0.04;
      float a5 = softGlow(uv, o5, r5, 0.26);
      color = mix(color, vec3(0.10, 0.32, 0.80), a5 * 0.26);

      // Orb 6 — small center accent, brightest
      vec2 o6 = vec2(
        0.46 + sin(uTime * 0.40) * 0.03,
        0.48 + cos(uTime * 0.50) * 0.03
      );
      float r6 = 0.10 + sin(uTime * 0.60) * 0.02;
      float a6 = softGlow(uv, o6, r6, 0.16);
      color = mix(color, vec3(0.25, 0.55, 1.0), a6 * 0.18);

      // Subtle vignette
      float vignette = 1.0 - length((uv - 0.5) * 1.4);
      vignette = smoothstep(0.0, 0.7, vignette);
      color *= mix(0.4, 1.0, vignette);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <Canvas
        gl={{ antialias: true, alpha: false, premultipliedAlpha: false }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
