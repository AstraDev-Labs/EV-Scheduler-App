'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useMousePosition } from '@/hooks/use-mouse-position'

function StarField() {
    const ref = useRef<THREE.Points>(null)
    const { x, y } = useMousePosition()

    // Generate random points
    const sphere = useMemo(() => {
        const positions = new Float32Array(8000 * 3)
        for (let i = 0; i < 8000; i++) {
            const r = 20
            const theta = 2 * Math.PI * Math.random()
            const phi = Math.acos(2 * Math.random() - 1)
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)
        }
        return positions
    }, [])

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10
            ref.current.rotation.y -= delta / 15

            // Mouse interaction parallax
            const targetX = (x - (typeof window !== 'undefined' ? window.innerWidth : 0) / 2) * 0.0001
            const targetY = (y - (typeof window !== 'undefined' ? window.innerHeight : 0) / 2) * 0.0001

            ref.current.rotation.x += (targetY - ref.current.rotation.x) * 0.05
            ref.current.rotation.y += (targetX - ref.current.rotation.y) * 0.05
        }
    })

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#10b981"
                    size={0.12}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
        </group>
    )
}

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 bg-[#030712] pointer-events-none">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <StarField />
            </Canvas>
        </div>
    )
}
