'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { MapPin, Navigation, Plus, Zap, Shield, Database, LayoutGrid, ArrowRight, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useMousePosition } from '@/hooks/use-mouse-position'

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'
import SpotlightCard from '@/components/ui/spotlight-card'

const AdminMap = dynamic(() => import('@/components/admin/admin-map'), {
    loading: () => <div className="h-[400px] bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5" />,
    ssr: false
})

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black" />
})

export default function AdminPage() {
    const { x, y } = useMousePosition()
    const [name, setName] = useState('')
    const [status, setStatus] = useState('Available')
    const [costPerKwh, setCostPerKwh] = useState('12.0')
    const [address, setAddress] = useState('')
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const supabase = createClient()
    const router = useRouter()

    const [currency, setCurrency] = useState('₹')
    const [conversionRate, setConversionRate] = useState(1.0)
    const [isStaff, setIsStaff] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        const checkAuth = () => {
            const userStr = localStorage.getItem('user')
            if (userStr) {
                try {
                    const user = JSON.parse(userStr)
                    if (user.role === 'staff') {
                        setIsStaff(true)
                        fetch(`/api/currency-rate?country=${encodeURIComponent(user.country || 'India')}`)
                            .then(res => res.json())
                            .then(data => {
                                setCurrency(data.currency)
                                setConversionRate(data.rate)
                            })
                    }
                } catch (e) {
                    console.error("Auth check failed", e)
                }
            } else {
                router.push('/auth')
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [router])

    const handleGeocodeAddress = async () => {
        if (!address.trim()) {
            setMessage('Error: Address required')
            return
        }
        setLoading(true)
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            const data = await response.json()
            if (data?.length > 0) {
                const { lat, lon } = data[0]
                setLocation({ lat: parseFloat(lat), lng: parseFloat(lon) })
                setMessage('Coordinates locked.')
            } else {
                setMessage('Error: Link failed.')
            }
        } catch (error) {
            setMessage('Error: System fault.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !location) return
        setLoading(true)
        try {
            const userStr = localStorage.getItem('user')
            const user = JSON.parse(userStr!)
            const finalCost = parseFloat(costPerKwh) / conversionRate

            const response = await fetch('/api/chargers/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    location: { lat: location.lat, lng: location.lng },
                    status,
                    cost_per_kwh: finalCost,
                    user_id: String(user.id)
                })
            })

            if (response.ok) {
                setMessage('Station deployed successfully.')
                setName(''); setAddress(''); setLocation(null); setCostPerKwh('12.0'); setStatus('Available');
            }
        } catch (error) {
            setMessage('Error: Station setup failed.')
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return null

    if (!isStaff) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 relative">
            <AnimatedBackground />
            <motion.div
                className="glass-card p-12 max-w-md border-red-500/20 relative z-10 shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8 border border-red-500/20">
                    <Shield size={40} />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Access Forbidden</h2>
                <p className="text-gray-500 font-medium mb-10 leading-relaxed uppercase text-[10px] tracking-[0.2em]">Access Restricted: Staff Only</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full py-4 glass hover:bg-white/5 border-white/5 text-[10px] font-black tracking-[0.2em] text-white rounded-2xl transition-all uppercase"
                >
                    Back to Dashboard
                </button>
            </motion.div>
        </div>
    )

    return (
        <div className="relative min-h-screen">
            <AnimatedBackground />

            <div
                className="pointer-events-none fixed inset-0 z-30 transition duration-300 lg:absolute"
                style={{
                    background: `radial-gradient(1000px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.03), transparent 80%)`
                }}
            />

            <div className="p-6 md:p-10 max-w-7xl mx-auto relative z-40">
                <motion.div
                    className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Staff Management</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4">
                            <ShinyText className="text-white">Station Setup</ShinyText>
                        </h1>
                        <p className="text-gray-500 font-medium">Add new charging stations across the smart grid infrastructure.</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <motion.div
                        className="lg:col-span-5 h-fit"
                        variants={{ hidden: { x: -20 }, show: { x: 0 } }}
                    >
                        <TiltedCard>
                            <div
                                className="glass-card p-1 group border-white/5 relative"
                                style={{ '--mouse-x': `${x}px`, '--mouse-y': `${y}px` } as any}
                            >
                                <div className="spotlight group-hover:opacity-100 opacity-0 transition-opacity duration-500" />
                                <div className="p-8 relative z-10">
                                    <div className="flex items-center gap-3 mb-10">
                                        <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-primary border-white/5">
                                            <Database size={20} />
                                        </div>
                                        <h3 className="text-xl font-black text-white tracking-tight">Station Details</h3>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="group/input">
                                                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Station Name</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder-gray-600"
                                                    placeholder="Station-Alpha-01"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Station Status</label>
                                                    <select
                                                        value={status}
                                                        onChange={(e) => setStatus(e.target.value)}
                                                        className="w-full px-5 py-4 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option>Available</option>
                                                        <option>Occupied</option>
                                                        <option>Offline</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-1">Rate ({currency}/kWh)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={costPerKwh}
                                                        onChange={(e) => setCostPerKwh(e.target.value)}
                                                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 space-y-4">
                                                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Location Details</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        placeholder="Physical Address"
                                                        className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleGeocodeAddress}
                                                        disabled={loading}
                                                        className="glass p-4 rounded-2xl hover:bg-white/5 text-primary border-white/5 transition-all"
                                                    >
                                                        <Navigation size={20} />
                                                    </button>
                                                </div>
                                                <AnimatePresence>
                                                    {location && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Linked Coordinates</span>
                                                                <span className="text-xs font-mono text-primary font-bold">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                                                            </div>
                                                            <MapPin size={16} className="text-primary" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={loading || !name || !location}
                                            className="w-full py-5 rounded-3xl bg-primary text-black font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                            whileHover={{ boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)" }}
                                        >
                                            <Plus size={18} fill="currentColor" /> Deploy Station
                                        </motion.button>
                                    </form>

                                    {message && (
                                        <p className={clsx(
                                            "mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-center",
                                            message.includes('Error') ? "text-red-500" : "text-primary"
                                        )}>
                                            {message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </TiltedCard>
                    </motion.div>

                    <motion.div
                        className="lg:col-span-7 flex flex-col gap-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <SpotlightCard className="glass-card p-1 group border-white/5 flex-1 min-h-[500px] relative overflow-hidden">
                            <div className="absolute top-8 left-8 z-20 glass px-5 py-3 rounded-2xl border-white/10 flex items-center gap-3 pointer-events-none">
                                <LayoutGrid size={16} className="text-primary" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Station Map</span>
                            </div>
                            <AdminMap
                                onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
                                location={location}
                            />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 glass rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest border-white/10 backdrop-blur-3xl">
                                Interaction Layer: Enabled
                            </div>
                        </SpotlightCard>

                        <SpotlightCard className="glass-card p-8 group border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-primary shrink-0 relative">
                                    <Settings size={28} />
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full -z-10 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-white mb-2 tracking-tighter">System Diagnostics</h4>
                                    <p className="text-sm text-gray-500 font-medium">Optimized charging algorithms are active. Latency: <span className="text-primary">12ms</span></p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
