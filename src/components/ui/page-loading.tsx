'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

export default function PageLoadingTransition() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Trigger loading on mount and on route change
        setIsLoading(true)
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [pathname, searchParams])

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                >
                    <div className="relative flex flex-col items-center">
                        {/* Glow effect */}
                        <div className="absolute -inset-10 bg-primary/20 blur-[100px] rounded-full animate-pulse" />

                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-black shadow-[0_0_50px_rgba(16,185,129,0.5)]"
                        >
                            <Zap size={40} fill="currentColor" className="animate-pulse" />
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-6 flex flex-col items-center"
                        >
                            <span className="text-sm font-black text-white uppercase tracking-[0.3em]">SmartCharge</span>
                            <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.5em] mt-1">Initializing...</span>
                        </motion.div>

                        {/* Loading bar */}
                        <div className="mt-8 w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "0%" }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                className="w-full h-full bg-primary"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
