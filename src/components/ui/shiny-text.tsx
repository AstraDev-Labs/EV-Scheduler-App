'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ShinyTextProps {
    children: ReactNode
    className?: string
    shimmerWidth?: number
}

export default function ShinyText({ children, className = "", shimmerWidth = 100 }: ShinyTextProps) {
    return (
        <div className={`relative inline-block overflow-hidden ${className}`}>
            <motion.span
                initial={{ backgroundPosition: "-200% 0" }}
                animate={{ backgroundPosition: "200% 0" }}
                transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                }}
                className="bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/50 to-white bg-[length:200%_100%] inline-block"
            >
                {children}
            </motion.span>
        </div>
    )
}
