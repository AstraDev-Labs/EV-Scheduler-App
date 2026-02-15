'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Zap, DollarSign, Sparkles, TrendingDown, Leaf } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import clsx from 'clsx'

interface BookingModalProps {
    charger: any
    onClose: () => void
    onSuccess: () => void
    prefillTime?: string // ISO format string
    prefillDuration?: string
}

export default function BookingModal({ charger, onClose, onSuccess, prefillTime, prefillDuration }: BookingModalProps) {
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('09:00')

    useEffect(() => {
        if (prefillTime) {
            try {
                const prefilledDate = new Date(prefillTime)
                setDate(prefilledDate.toISOString().split('T')[0])
                setStartTime(prefilledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
            } catch (e) {
                console.error("Failed to parse prefillTime", e)
            }
        } else {
            // Default to today
            setDate(new Date().toISOString().split('T')[0])
        }

        if (prefillDuration) {
            setDuration(prefillDuration)
        }
    }, [prefillTime, prefillDuration])
    const [duration, setDuration] = useState('2')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    // Optimization State
    const [optimizing, setOptimizing] = useState(false)
    const [recommendations, setRecommendations] = useState<any[]>([])
    const [showRecommendations, setShowRecommendations] = useState(false)
    const [currency, setCurrency] = useState('₹') // Default to INR
    const [conversionRate, setConversionRate] = useState(1.0) // Default 1:1

    const supabase = createClient()

    // Fetch user country and rates on mount
    useEffect(() => {
        const fetchRates = async () => {
            const userStr = localStorage.getItem('user')
            console.log("BookingModal: Checking local storage user:", userStr)

            if (userStr) {
                const user = JSON.parse(userStr)
                const country = user.country || 'India'
                console.log("BookingModal: Fetching rates for country:", country)

                try {
                    const res = await fetch(`/api/currency-rate?country=${encodeURIComponent(country)}`)
                    if (res.ok) {
                        const data = await res.json()
                        console.log("BookingModal: Rates fetched:", data)
                        setCurrency(data.currency)
                        setConversionRate(data.rate)
                    } else {
                        console.error("BookingModal: Rate fetch failed", res.status)
                    }
                } catch (err) {
                    console.error("BookingModal: Failed to fetch rates:", err)
                }
            }
        }
        fetchRates()
    }, [charger]) // Re-fetch when charger changes (modal opens)

    const today = new Date().toISOString().split('T')[0]

    console.log("BookingModal Render: Currency:", currency, "Rate:", conversionRate)

    // ✨ Smart Schedule Logic
    const handleSmartSchedule = async () => {
        setOptimizing(true)
        setError('')
        try {
            const userStr = localStorage.getItem('user')
            if (!userStr) {
                setError('Please log in to use Smart Schedule')
                setOptimizing(false)
                return
            }
            const user = JSON.parse(userStr)

            // Use user's battery capacity or default to 50kWh
            // Safety Cap: Max 100kWh to prevent unrealistic schedules (e.g. if user entered 500)
            const capacity = Math.min(user.battery_capacity || 50, 100)
            const needed = capacity * 0.8 // Assume 80% charge needed

            // Use relative path (proxied by Next.js)
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id.toString(),
                    energy_needed: needed,
                    ready_by: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: ready by tomorrow same time
                    priority: 'Savings',
                    country: user.country || 'India'
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.currency) setCurrency(data.currency)
                if (data.rate) setConversionRate(data.rate)

                if (data.slots && data.slots.length > 0) {
                    setRecommendations(data.slots)
                    setShowRecommendations(true) // Keep this from original logic
                } else if (data.debug_info) {
                    console.error('No slots found:', data.debug_info)
                    toast.error(`Impossible Schedule: Needs ${parseFloat(data.debug_info.time_needed_hours).toFixed(1)}h charging, but only gave ${(new Date(data.debug_info.ready_by).getTime() - Date.now()) / 3600000 < 0 ? 0 : ((new Date(data.debug_info.ready_by).getTime() - Date.now()) / 3600000).toFixed(1)}h available.`)
                } else {
                    toast.error('No optimized slots found for this time window')
                }
            } else {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.detail || 'Failed to optimize schedule'
                setError(errorMessage)
                toast.error(errorMessage)
            }
        } catch (err: any) {
            console.error('Optimization error:', err)
            setError(err.message || 'Failed to fetch smart schedule')
            toast.error(err.message || 'Failed to fetch smart schedule')
        }
        setOptimizing(false)
    }

    const selectRecommendation = (slot: any) => {
        // Parse slot start time
        const slotDate = new Date(slot.start_time)
        setDate(slotDate.toISOString().split('T')[0])
        setStartTime(slotDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        setDuration(String(Math.ceil(slot.duration_hours)))
        setShowRecommendations(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Get current user
            const userStr = localStorage.getItem('user')
            if (!userStr) {
                setError('Please log in to book a slot')
                setLoading(false)
                return
            }
            const user = JSON.parse(userStr)

            // Calculate start and end times
            const startDateTime = new Date(`${date}T${startTime}`)
            const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 60 * 1000)

            // Calculate estimated cost
            const energyKwh = parseInt(duration) * 7 // Assume 7kW charging rate
            const totalCost = energyKwh * charger.cost_per_kwh

            // Create booking via Backend API (handles conflict checks)
            // Ensure IDs are strings for Pydantic validation
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: String(user.id),
                    charger_id: String(charger.id),
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    energy_kwh: energyKwh,
                    total_cost: totalCost
                })
            })

            const result = await response.json()

            if (!response.ok) {
                // Show conflict error or other backend errors
                let errorMsg = "Booking failed. Please try again."
                if (result.detail) {
                    if (typeof result.detail === 'string') {
                        errorMsg = result.detail
                    } else if (Array.isArray(result.detail)) {
                        // Handle Pydantic validation errors
                        errorMsg = result.detail.map((e: any) => e.msg).join(', ')
                    } else if (typeof result.detail === 'object') {
                        errorMsg = JSON.stringify(result.detail)
                    }
                }
                setError(errorMsg)
                setLoading(false)
                return
            }

            // Success!
            setSuccessMsg('Booking confirmed!')

            // Send confirmation email (already handled by backend? or trigger here?)
            // Backend returns success, so we can trigger email here to be safe if backend didn't
            // For now, let's stick to the previous flow where we trigger email separately 
            // OR if backend handles it (which we added in main.py), we can skip this.
            // Let's call email endpoint just to be sure as main.py had a "pass" block.
            try {
                await fetch('/api/send-booking-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: user.email,
                        user_name: user.user_metadata?.full_name || 'User',
                        charger_name: charger.name,
                        start_time: startDateTime.toLocaleString(),
                        end_time: endDateTime.toLocaleString(),
                        total_cost: totalCost,
                        energy_kwh: energyKwh
                    })
                })
            } catch (e) {
                console.error("Email trigger failed", e)
            }

            setTimeout(() => {
                onSuccess()
            }, 1500)
        } catch (err: any) {
            setError(err.message)
        }
        setLoading(false)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap className="text-green-400 fill-green-400/20" />
                            Book Slot
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full hover:bg-white/10">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mb-6 p-4 bg-white/5 border border-white/5 rounded-xl relative z-10">
                        <h3 className="font-semibold text-white text-lg">{charger.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-green-400 font-mono">
                                {currency}{(charger.cost_per_kwh * conversionRate).toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-sm">per kWh</span>
                        </div>
                    </div>

                    {/* ✨ Smart Schedule Button */}
                    {!showRecommendations && !successMsg && (
                        <motion.button
                            onClick={handleSmartSchedule}
                            disabled={optimizing}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mb-6 relative group overflow-hidden rounded-xl p-[1px]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-[#0f172a] rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-white font-medium group-hover:bg-[#0f172a]/90 transition-colors">
                                {optimizing ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Optimizing...
                                    </span>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-yellow-400 fill-yellow-400/20" />
                                        Run Smart Schedule AI
                                    </>
                                )}
                            </div>
                        </motion.button>
                    )}

                    {/* 🤖 AI Recommendations */}
                    <AnimatePresence>
                        {showRecommendations && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mb-6 overflow-hidden"
                            >
                                <div className="bg-gradient-to-b from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-blue-200 flex items-center gap-2">
                                            <Sparkles size={14} className="text-blue-400" />
                                            AI Recommendations
                                        </h4>
                                        <button
                                            onClick={() => setShowRecommendations(false)}
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {recommendations.map((slot, i) => (
                                            <button
                                                key={i}
                                                onClick={() => selectRecommendation(slot)}
                                                className="w-full text-left p-3 rounded-lg bg-black/40 hover:bg-white/10 border border-white/5 transition-all group relative overflow-hidden"
                                            >
                                                {slot.score === 1 && (
                                                    <div className="absolute top-0 right-0 bg-green-500/20 text-green-300 text-[10px] px-2 py-0.5 rounded-bl-lg">
                                                        Best Choice
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-gray-200 font-medium text-sm">
                                                        {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className={clsx(
                                                        "text-xs font-bold",
                                                        slot.color === 'green' ? 'text-green-400' :
                                                            slot.color === 'blue' ? 'text-blue-400' :
                                                                'text-yellow-400'
                                                    )}>
                                                        {currency}{slot.total_cost}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {slot.color === 'green' ? <Leaf size={12} className="text-green-500" /> : <TrendingDown size={12} />}
                                                    {slot.source}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                <Calendar className="inline-block mr-1.5 h-3.5 w-3.5" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={today}
                                required
                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 outline-none transition-all color-scheme-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                <Clock className="inline-block mr-1.5 h-3.5 w-3.5" />
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 outline-none transition-all color-scheme-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                Duration
                            </label>
                            <div className="relative">
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 outline-none transition-all appearance-none"
                                >
                                    <option value="1" className="bg-slate-900">1 hour</option>
                                    <option value="2" className="bg-slate-900">2 hours</option>
                                    <option value="3" className="bg-slate-900">3 hours</option>
                                    <option value="4" className="bg-slate-900">4 hours</option>
                                    <option value="6" className="bg-slate-900">6 hours</option>
                                    <option value="8" className="bg-slate-900">8 hours</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Estimated Energy</span>
                                <span className="font-semibold text-white">{parseInt(duration) * 7} kWh</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                                <span className="text-gray-400">Total Cost</span>
                                <span className="font-bold text-green-400 flex items-center">
                                    {currency}
                                    {(parseInt(duration) * 7 * charger.cost_per_kwh * conversionRate).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center justify-center gap-2">
                                <Zap size={16} /> {successMsg}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-white/5 text-gray-300 py-2.5 px-4 rounded-xl font-medium hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !!successMsg}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 px-4 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Booking...' : successMsg ? 'Confirmed' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
