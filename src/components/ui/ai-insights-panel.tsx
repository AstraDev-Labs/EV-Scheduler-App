'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Zap, Leaf, TrendingUp, AlertTriangle } from 'lucide-react'

interface AIInsightsPanelProps {
    isOpen: boolean
    onClose: () => void
    batteryLevel: number
    solarData: any[]
    efficiency: number
    cloudCover: number
    onAction: (action: string) => void
}

export default function AIInsightsPanel({ isOpen, onClose, batteryLevel, solarData, efficiency, cloudCover, onAction }: AIInsightsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    const generateInsights = () => {
        const insights = []

        // 1. Charging Optimization
        if (efficiency > 70) {
            insights.push({
                type: 'optimization',
                icon: <Zap className="text-yellow-400" size={20} />,
                title: "Prime Charging Window",
                description: "Solar efficiency is peaking (>70%). Charging now will utilize ~95% renewable energy.",
                action: "Start Charging"
            })
        } else if (efficiency < 30 && batteryLevel > 50) {
            insights.push({
                type: 'optimization',
                icon: <Leaf className="text-emerald-400" size={20} />,
                title: "Hold Charging",
                description: "Solar generation is low. Wait for the 2:00 PM window for better green energy mix.",
                action: "Schedule for 2 PM"
            })
        }

        // 2. Battery Health
        if (batteryLevel < 20) {
            insights.push({
                type: 'critical',
                icon: <AlertTriangle className="text-red-400" size={20} />,
                title: "Deep Discharge Risk",
                description: "Battery is critically low. Avoid deep discharge to prolong cell life.",
                action: "Charge Immediately"
            })
        } else if (batteryLevel > 80) {
            insights.push({
                type: 'health',
                icon: <TrendingUp className="text-blue-400" size={20} />,
                title: "Battery Health Optimal",
                description: "Staying between 20-80% extends battery lifespan by up to 2 years.",
                action: "Set Limit to 80%"
            })
        }

        // 3. Grid Intelligence
        insights.push({
            type: 'grid',
            icon: <Sparkles className="text-purple-400" size={20} />,
            title: "Grid Carbon Intensity: Low",
            description: "Community grid is currently powered by 60% wind/solar mix. Good time for heavy appliances.",
            action: null
        })

        return insights
    }

    const insights = generateInsights()

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-[60] p-6 shadow-2xl overflow-y-auto pointer-events-auto"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Nexus AI Insights</h2>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Real-time Optimization</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {insights.map((insight, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass p-5 rounded-2xl border-white/5 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300 ${insight.type === 'critical' ? 'bg-red-500/10 border-red-500/20' : ''
                                            }`}>
                                            {insight.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-lg mb-1">{insight.title}</h3>
                                            <p className="text-gray-400 text-sm leading-relaxed mb-4">{insight.description}</p>
                                            {insight.action && (
                                                <button
                                                    onClick={() => {
                                                        onAction(insight.action!)
                                                        onClose()
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-4 py-2 rounded-lg hover:bg-primary hover:text-black transition-colors cursor-pointer"
                                                >
                                                    {insight.action}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
                            <h4 className="text-white font-bold mb-2">Did you know?</h4>
                            <p className="text-sm text-gray-300">
                                Shifting your charging schedule by just 2 hours can reduce your carbon footprint by up to 25% annually.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
