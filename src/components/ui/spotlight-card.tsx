'use client'

import React, { useRef, useState, useEffect } from "react"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"

export default function SpotlightCard({
    children,
    className = "",
    spotlightColor = "rgba(16, 185, 129, 0.15)",
}: {
    children: React.ReactNode
    className?: string
    spotlightColor?: string
}) {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: React.MouseEvent) {
        let { left, top } = currentTarget.getBoundingClientRect()
        mouseX.set(clientX - left)
        mouseY.set(clientY - top)
    }

    return (
        <div
            className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl ${className}`}
            onMouseMove={handleMouseMove}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl transition duration-300 group-hover:opacity-100 opacity-0"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
                }}
            />
            <div className="relative z-10 h-full">{children}</div>
        </div>
    )
}
