'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, X, Zap, ChevronRight, Hash, ArrowUpRight, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useMousePosition } from '@/hooks/use-mouse-position'
import dynamic from 'next/dynamic'

import ShinyText from '@/components/ui/shiny-text'
import SpotlightCard from '@/components/ui/spotlight-card'

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black" />
})

interface Booking {
    id: number
    charger_id: number
    start_time: string
    end_time: string
    energy_kwh: number
    total_cost: number
    status: string
    charger: {
        name: string
        location: any
    }
}

export default function SchedulePage() {
    const { x, y } = useMousePosition()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [cancelling, setCancelling] = useState<number | null>(null)
    const supabase = createClient()

    const [currency, setCurrency] = useState('₹')
    const [conversionRate, setConversionRate] = useState(1.0)

    const fetchBookings = async () => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                const user = JSON.parse(userStr)

                fetch(`/api/currency-rate?country=${encodeURIComponent(user.country || 'India')}`)
                    .then(res => res.json())
                    .then(data => {
                        setCurrency(data.currency)
                        setConversionRate(data.rate)
                    })
                    .catch(err => console.error('Failed to fetch currency:', err))

                const { data } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        charger:chargers(name, location)
                    `)
                    .eq('user_id', user.id)
                    .order('start_time', { ascending: true })

                if (data) {
                    setBookings(data as any)
                }
            } catch (e) {
                console.error('Error parsing user data:', e)
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchBookings()
    }, [])

    const handleCancelBooking = async (bookingId: number) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return

        setCancelling(bookingId)
        try {
            const response = await fetch('/api/cancel-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId })
            })

            if (response.ok) {
                await fetchBookings()
            }
        } catch (error) {
            console.error('Error cancelling booking:', error)
        } finally {
            setCancelling(null)
        }
    }

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear your booking history? This will remove all Completed and Cancelled sessions.')) return

        try {
            const userStr = localStorage.getItem('user')
            if (!userStr) return
            const user = JSON.parse(userStr)

            const response = await fetch('/api/clear-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: String(user.id) })
            })

            if (response.ok) {
                await fetchBookings()
                alert('History cleared successfully')
            } else {
                const errorText = await response.text()
                alert(`Failed: ${response.status} ${response.statusText}\n${errorText}`)
            }
        } catch (error) {
            console.error('Error clearing history:', error)
            alert('Error: ' + error)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'text-primary border-primary/20 bg-primary/10'
            case 'Pending': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10'
            case 'Completed': return 'text-blue-400 border-blue-400/20 bg-blue-400/10'
            case 'Cancelled': return 'text-red-400 border-red-400/20 bg-red-400/10'
            default: return 'text-gray-400 border-white/10 bg-white/5'
        }
    }

    return (
        <div className="relative min-h-screen">
            <AnimatedBackground />

            {/* Spotlight Overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-30 transition duration-300 lg:absolute"
                style={{
                    background: `radial-gradient(1000px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.03), transparent 80%)`
                }}
            />

            <div className="p-6 md:p-10 max-w-5xl mx-auto relative z-40">
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-1 bg-primary rounded-full" />
                        <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Timeline</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                            <ShinyText className="text-white">Charging Sessions</ShinyText>
                        </h1>
                        {bookings.some(b => ['Completed', 'Cancelled'].includes(b.status)) && (
                            <button
                                onClick={handleClearHistory}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <Trash2 size={14} />
                                Clear History
                            </button>
                        )}
                    </div>
                    <p className="text-gray-500 font-medium">Coordinate and manage your future charging sessions across the network.</p>
                </motion.div>

                {loading ? (
                    <div className="grid gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card h-40 animate-pulse bg-white/5 border-white/5" />
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <motion.div
                        className="glass-card p-16 text-center border-white/5 flex flex-col items-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 text-gray-500">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4">No Upcoming Sessions</h3>
                        <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
                            Your itinerary is currently clear. Navigate the map to book your next charging session.
                        </p>
                        <motion.a
                            href="/dashboard/map"
                            className="bg-primary text-black px-10 py-5 rounded-[2rem] font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-primary/30"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Explore Map
                        </motion.a>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {bookings.map((booking, index) => (
                                <motion.div
                                    key={booking.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <SpotlightCard className="glass-card p-1 group border-white/5 relative">
                                        <div className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
                                            <div className="flex-1 w-full">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-primary border-white/5 shadow-xl group-hover:rotate-6 transition-transform">
                                                            <Zap size={24} fill="currentColor" className="opacity-20" />
                                                            <Zap size={24} className="absolute" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-white tracking-tight">{booking.charger.name}</h3>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                                                <MapPin size={10} />
                                                                Station ID: {booking.charger_id}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 self-start md:self-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border font-mono ${getStatusColor(booking.status)}`}>
                                                            {booking.status.toUpperCase()}
                                                        </span>
                                                        {['Confirmed', 'Pending'].includes(booking.status) && (
                                                            <button
                                                                onClick={() => handleCancelBooking(booking.id)}
                                                                disabled={cancelling === booking.id}
                                                                className="p-3 glass hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-2xl transition-all border-white/5 hover:border-red-500/20"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/5 rounded-3xl p-6 border border-white/5">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Start At</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-white">{formatTime(booking.start_time)}</span>
                                                            <span className="text-[10px] font-bold text-gray-500">{formatDate(booking.start_time)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">End Time</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-white">{formatTime(booking.end_time)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Energy (kWh)</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-primary">{booking.energy_kwh}</span>
                                                            <span className="text-[10px] font-bold text-gray-400">kWh</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Session Cost</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-[10px] font-bold text-gray-500">{currency}</span>
                                                            <span className="text-xl font-black text-white">{(booking.total_cost * conversionRate).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex md:flex-col gap-3 w-full md:w-auto">
                                                <button className="flex-1 md:flex-none p-4 glass hover:bg-white/5 border-white/5 rounded-2xl text-white transition-all group/btn">
                                                    <ArrowUpRight size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </SpotlightCard>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    )
}
