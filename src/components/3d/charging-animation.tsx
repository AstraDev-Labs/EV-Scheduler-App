'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

export default function ChargingAnimation({ isCharging }: { isCharging: boolean }) {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Background Pulse */}
            <motion.div
                animate={{
                    scale: isCharging ? [1, 1.2, 1] : 1,
                    opacity: isCharging ? [0.1, 0.3, 0.1] : 0.05,
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute inset-0 bg-primary rounded-full blur-3xl"
            />

            {/* Main SVG Container */}
            <svg viewBox="0 0 200 200" className="w-64 h-64 relative z-10">
                <defs>
                    <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Orbit Path */}
                <circle
                    cx="100"
                    cy="100"
                    r="80"
                    className="stroke-white/5 fill-none"
                    strokeWidth="1"
                />

                {/* Animated Particles */}
                {isCharging && [0, 1, 2].map((i) => (
                    <motion.circle
                        key={i}
                        r="3"
                        cx="100"
                        cy="20"
                        fill="#10b981"
                        animate={{
                            rotate: 360,
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        style={{ originX: "100px", originY: "100px" }}
                    />
                ))}

                {/* Core Icon */}
                <foreignObject x="60" y="60" width="80" height="80">
                    <div className="w-full h-full flex items-center justify-center">
                        <motion.div
                            animate={{
                                scale: isCharging ? [0.9, 1.1, 0.9] : 1,
                                rotate: isCharging ? [0, 5, -5, 0] : 0,
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className={`p-6 rounded-3xl ${isCharging ? 'bg-primary text-black' : 'bg-white/5 text-gray-400'} transition-colors shadow-[0_0_50px_rgba(16,185,129,0.2)]`}
                        >
                            <Zap size={32} fill={isCharging ? "currentColor" : "none"} />
                        </motion.div>
                    </div>
                </foreignObject>
            </svg>

            {/* Dynamic Data Labels */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-black tracking-[0.3em] text-primary uppercase"
                >
                    {isCharging ? 'System Live' : 'System Standby'}
                </motion.div>
                <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">
                    Smart Sync Active
                </div>
            </div>
        </div>
    )
}
