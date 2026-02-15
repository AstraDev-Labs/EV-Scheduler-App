
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Battery, Sun, Cloud, Zap, MapPin, X, Info } from 'lucide-react'
import { useEffect, useRef } from 'react'

export interface NotificationItem {
    id: string
    type: 'battery' | 'solar' | 'weather' | 'station' | 'schedule' | 'info'
    title: string
    message: string
    timestamp: Date
    priority: 'low' | 'medium' | 'high'
}

interface NotificationPanelProps {
    isOpen: boolean
    onClose: () => void
    notifications: NotificationItem[]
    onClear: (id: string) => void
}

export default function NotificationPanel({ isOpen, onClose, notifications, onClear }: NotificationPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

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

    const getIcon = (type: string) => {
        switch (type) {
            case 'battery': return <Battery className="text-red-400" size={18} />
            case 'solar': return <Sun className="text-yellow-400" size={18} />
            case 'weather': return <Cloud className="text-blue-400" size={18} />
            case 'station': return <MapPin className="text-green-400" size={18} />
            case 'schedule': return <Zap className="text-purple-400" size={18} />
            default: return <Info className="text-gray-400" size={18} />
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-16 right-0 md:right-10 w-80 md:w-96 z-50 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-primary" />
                            <h3 className="text-sm font-black text-white tracking-widest uppercase">Notifications</h3>
                            <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {notifications.length}
                            </span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-black/20">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-xs italic">
                                No new notifications.
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors relative group ${item.priority === 'high' ? 'bg-red-500/5' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 p-2 rounded-lg bg-white/5 border border-white/5 shrink-0 h-fit`}>
                                                {getIcon(item.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-sm font-bold text-white leading-tight">{item.title}</h4>
                                                    <span className="text-[9px] text-gray-500 whitespace-nowrap ml-2">
                                                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed mb-2">{item.message}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[9px] uppercase tracking-wider font-bold ${item.priority === 'high' ? 'text-red-400' : 'text-gray-600'
                                                        }`}>
                                                        {item.priority} Priority
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onClear(item.id); }}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
