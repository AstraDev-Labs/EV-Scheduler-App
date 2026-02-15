'use client'

import { Bell, Calendar, MapPin, Sun, ArrowRight, Battery, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocation } from '@/context/LocationContext'
import dynamic from 'next/dynamic'
import { useMousePosition } from '@/hooks/use-mouse-position'
import { toast } from 'sonner'

const DashboardNav = dynamic(() => import('@/components/dashboard/nav'), { ssr: false })
const ChargingAnimation = dynamic(() => import('@/components/3d/charging-animation'), { ssr: false })

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'
import SpotlightCard from '@/components/ui/spotlight-card'
import NotificationPanel, { NotificationItem } from '@/components/ui/notification-panel'
import AIInsightsPanel from '@/components/ui/ai-insights-panel'

export default function Dashboard() {
    const { userLocation, locationName } = useLocation()
    const { x, y } = useMousePosition()
    const router = useRouter()
    const [userData, setUserData] = useState<any>(null)
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [solarData, setSolarData] = useState<any[]>([])
    const [currentEfficiency, setCurrentEfficiency] = useState(0)
    const [currentWeather, setCurrentWeather] = useState<any>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [headerBatteryLevel, setHeaderBatteryLevel] = useState(45)
    const [isCharging, setIsCharging] = useState(false)
    const [chargingSession, setChargingSession] = useState<any>(null)
    const [mounted, setMounted] = useState(false)

    // Notification State
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [showNotifications, setShowNotifications] = useState(false)

    // AI Insights State
    const [showInsights, setShowInsights] = useState(false)

    // Tooltip State
    const [hoveredSolarIndex, setHoveredSolarIndex] = useState<number | null>(null)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Generate Notifications Effect
    useEffect(() => {
        if (!mounted) return

        const newNotifications: NotificationItem[] = []

        // 1. Battery Check
        if (headerBatteryLevel < 20) {
            newNotifications.push({
                id: 'bat-low',
                type: 'battery',
                title: 'Critical Battery Level',
                message: `Battery is at ${headerBatteryLevel}%. Charge immediately to preserve battery health.`,
                timestamp: new Date(),
                priority: 'high'
            })
        }

        // 2. Solar Efficiency
        if (currentEfficiency > 80) {
            newNotifications.push({
                id: 'solar-high',
                type: 'solar',
                title: 'High Solar Efficiency',
                message: 'Perfect conditions! Solar output is optimized for green charging.',
                timestamp: new Date(),
                priority: 'medium'
            })
        }

        // 3. Weather Alerts
        if (currentWeather) {
            if (currentWeather.uv_index > 6) {
                newNotifications.push({
                    id: 'uv-high',
                    type: 'weather',
                    title: 'High UV Alert',
                    message: `UV Index is ${currentWeather.uv_index.toFixed(1)}. Wear protection if heading out.`,
                    timestamp: new Date(),
                    priority: 'medium'
                })
            }
            if (currentWeather.cloud_cover < 20) {
                newNotifications.push({
                    id: 'cloud-low',
                    type: 'weather',
                    title: 'Clear Skies Verified',
                    message: 'Low cloud coverage detected. Maximizing solar panel intake.',
                    timestamp: new Date(),
                    priority: 'low'
                })
            }
        }

        // 4. Booking
        if (upcomingBookings.length > 0) {
            newNotifications.push({
                id: 'booking-next',
                type: 'schedule',
                title: 'Upcoming Session',
                message: `Scheduled at ${upcomingBookings[0].charger_name} in various hours.`,
                timestamp: new Date(),
                priority: 'medium'
            })
        }

        // 5. General Info (Mocked New Station)
        newNotifications.push({
            id: 'dev-station',
            type: 'station',
            title: 'New Station Development',
            message: '3 new Supercharger nodes added to the Koramangala Grid.',
            timestamp: new Date(),
            priority: 'low'
        })

        // Filter duplicates by checking ID (simple dedupe for this demo)
        setNotifications(prev => {
            const existingIds = prev.map(n => n.id)
            const uniqueNew = newNotifications.filter(n => !existingIds.includes(n.id))
            return [...uniqueNew, ...prev]
        })

    }, [mounted, headerBatteryLevel, currentEfficiency, currentWeather, upcomingBookings])

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    useEffect(() => {
        const getSolarForecast = async () => {
            try {
                const url = userLocation ? `/api/solar-forecast?lat=${userLocation.lat}&lng=${userLocation.lng}` : '/api/solar-forecast'
                const res = await fetch(url)
                const json = await res.json()
                if (json.status === 'success') {
                    setSolarData(json.forecast)
                    const currentHour = new Date().getHours()
                    const current = json.forecast.find((f: any) => f.hour === currentHour)
                    if (current) {
                        setCurrentEfficiency(current.efficiency)
                        setCurrentWeather(current.weather)
                    }
                }
            } catch (err) {
                console.error("Failed to fetch solar forecast", err)
            }
        }

        if (userLocation || locationName.includes('Default')) {
            getSolarForecast()
        }
    }, [userLocation, locationName])


    useEffect(() => {
        const fetchData = async () => {
            const userStr = localStorage.getItem('user')
            if (userStr) {
                setUserData(JSON.parse(userStr))
            }

            try {
                if (userStr) {
                    const user = JSON.parse(userStr)
                    const bookingsRes = await fetch('/api/bookings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, limit: 1 })
                    })
                    const bookingData = await bookingsRes.json()
                    if (bookingData.status === 'success') {
                        setUpcomingBookings(bookingData.bookings)
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error)
            }
            setLoading(false)
        }

        fetchData()
    }, [])

    const handleOptimize = async () => {
        if (!userLocation) {
            toast.error("Location access required to find nearest charger.")
            return
        }

        try {
            const res = await fetch('/api/smart-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    energy_needed: (userData?.battery_capacity || 50) * 0.8
                })
            })

            const data = await res.json()
            if (data.status === 'success') {
                const { charger, best_slot } = data
                const params = new URLSearchParams({
                    chargerId: charger.id.toString(),
                    startTime: best_slot.start_time,
                    duration: '2'
                })
                router.push(`/dashboard/map?${params.toString()}`)
            } else {
                toast.error(data.detail || "Optimization failed.")
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to connect to AI optimizer.")
        }
    }

    const toggleCharge = async () => {
        const userStr = localStorage.getItem('user')
        if (!userStr || !userData) return
        const user = JSON.parse(userStr)
        if (!user.id) {
            alert("Session invalid. Please Log In again.")
            return
        }

        const newStatus = !isCharging
        setIsCharging(newStatus)

        if (newStatus) {
            setChargingSession({
                id: 'mock-session',
                start_time: new Date().toISOString(),
                status: 'Confirmed'
            })
        } else {
            setChargingSession(null)
        }
    }

    const vehicleModel = userData?.vehicle_model || 'EV-Nexus Model X'
    const batteryCapacity = userData?.battery_capacity || 75

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    const nextBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="relative min-h-screen">
            {/* Spotlight Overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-30 transition duration-300 lg:absolute"
                style={{
                    background: `radial-gradient(1000px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.03), transparent 80%)`
                }}
            />

            <motion.div
                className="p-6 md:p-10 max-w-7xl mx-auto relative z-40"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* Header Section */}
                <motion.div className="flex flex-col md:flex-row items-baseline justify-between mb-12 gap-6" variants={itemVariants}>
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 mb-2"
                        >
                            <span className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Dashboard Overview</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
                            {loading ? 'Scanning Status' : (
                                <>Hi, <ShinyText>{userData?.full_name?.split(' ')[0] || 'Explorer'}</ShinyText></>
                            )}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block mr-2">
                            <div className="text-2xl font-black text-white leading-none tracking-tight">
                                {mounted ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {mounted ? currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '...'}
                            </div>
                        </div>

                        <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border-white/5 shadow-2xl">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full pulse-glow" />
                            <span className="text-white font-black text-xs tracking-[0.2em] uppercase">Status: Optimal</span>
                        </div>
                        <div className="relative">
                            <div
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="glass p-3 rounded-2xl text-gray-400 hover:text-white transition-colors cursor-pointer border-white/5 relative"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                )}
                            </div>
                            <NotificationPanel
                                isOpen={showNotifications}
                                onClose={() => setShowNotifications(false)}
                                notifications={notifications}
                                onClear={clearNotification}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* 1. Primary Vehicle Card */}
                    <motion.div
                        className="lg:col-span-8 flex flex-col gap-6"
                        variants={itemVariants}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <TiltedCard>
                            <div className="glass-card p-1 lg:p-12 relative overflow-hidden flex flex-col justify-between min-h-[500px] border-white/5">
                                <div className="p-8 lg:p-0 relative z-10 flex flex-col h-full justify-between">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                        <div>
                                            <h3 className="text-gray-500 font-black text-[10px] tracking-[0.3em] uppercase mb-4">Primary Vehicle</h3>
                                            <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter mb-4">{vehicleModel}</h2>
                                            <div className="flex flex-wrap gap-3">
                                                <div className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest border transition-all ${isCharging ? 'bg-primary text-black border-primary' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                                    {isCharging ? 'CHARGING IN PROGRESS' : 'VEHICLE CONNECTED'}
                                                </div>
                                                <div className="px-5 py-2 rounded-full text-[10px] font-black tracking-widest border bg-white/5 text-gray-400 border-white/10 italic">
                                                    {batteryCapacity} kWh CAPACITY
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="relative">
                                                <span className="text-8xl lg:text-[10rem] font-black text-white leading-none block tracking-tighter gradient-text">
                                                    {headerBatteryLevel}
                                                </span>
                                                <span className="absolute -top-4 -right-8 text-primary font-black text-4xl">%</span>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2 mr-2">Current Battery Level</span>
                                        </div>
                                    </div>

                                    <div className="mt-12">
                                        <div className="flex justify-between items-end mb-4 px-2">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Power Efficiency</span>
                                            <span className="text-primary font-bold text-xs">{isCharging ? '+2.4kW Charging' : 'Optimized'}</span>
                                        </div>
                                        <div className="relative h-6 glass rounded-full overflow-hidden border border-white/5 p-1 bg-black/20">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-primary to-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] relative shimmer"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${headerBatteryLevel}%` }}
                                                transition={{ duration: 1.5, ease: "circOut" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-12 flex flex-col md:flex-row gap-6">
                                        <button
                                            onClick={toggleCharge}
                                            className={`flex-1 py-6 rounded-3xl font-black text-sm tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 ${isCharging
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                                                : 'bg-primary text-black shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:scale-[1.02]'
                                                }`}
                                        >
                                            {isCharging ? (<>STOP CHARGING</>) : (<>START CHARGING <ArrowRight size={20} /></>)}
                                        </button>
                                        <Link
                                            href="/dashboard/map"
                                            className="px-8 py-6 glass rounded-3xl hover:bg-white/5 transition-all border-white/5 flex items-center justify-center group"
                                        >
                                            <MapPin className="text-gray-400 group-hover:text-primary transition-colors" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </TiltedCard>
                    </motion.div>

                    {/* 2. Solar Intelligence Card */}
                    <motion.div
                        className="lg:col-span-4"
                        variants={itemVariants}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <SpotlightCard className="h-full">
                            <div className="p-10 relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-yellow-400 shadow-2xl border border-yellow-400/10 float">
                                            <Sun size={32} />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Solar Conditions</div>
                                            <div className="text-[9px] font-bold text-gray-500 mb-1 truncate max-w-[120px]">{locationName}</div>
                                            <div className="text-4xl font-black text-white">{Math.round(currentEfficiency)}%</div>
                                        </div>
                                    </div>
                                    <h4 className="text-2xl font-black text-white mb-4 tracking-tight">Solar ML Analysis</h4>
                                    <p className="text-gray-500 font-medium text-sm leading-relaxed mb-6">
                                        Strategic window identified at <span className="text-primary">
                                            {solarData.length > 0
                                                ? (() => {
                                                    const peak = solarData.reduce((max, curr) => curr.efficiency > max.efficiency ? curr : max, solarData[0]);
                                                    return `${peak.hour}:00`;
                                                })()
                                                : '--:--'}
                                        </span>. Peak photon efficiency available for <span className="text-white">
                                            {solarData.filter((d: any) => d.is_peak).length || 3.2} hours
                                        </span>.
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div className="glass p-3 rounded-xl border-white/5 bg-white/5">
                                            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Cloud Coverage</div>
                                            <div className="text-xl font-black text-white">{currentWeather ? Math.round(currentWeather.cloud_cover) : '--'}<span className="text-xs align-top text-gray-500">%</span></div>
                                        </div>
                                        <div className="glass p-3 rounded-xl border-white/5 bg-white/5">
                                            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">UV Index</div>
                                            <div className="text-xl font-black text-white leading-none">
                                                {currentWeather ? currentWeather.uv_index.toFixed(1) : '--'}
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ml-1 align-middle ${(currentWeather?.uv_index || 0) > 6 ? 'bg-purple-500/20 text-purple-400' :
                                                    (currentWeather?.uv_index || 0) > 3 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {(currentWeather?.uv_index || 0) > 6 ? 'HIGH' : (currentWeather?.uv_index || 0) > 3 ? 'MOD' : 'LOW'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <div className="h-32 flex items-end gap-2 px-1">
                                        {solarData.slice(0, 10).map((data, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 group relative flex flex-col justify-end items-center h-full"
                                                onMouseEnter={() => setHoveredSolarIndex(i)}
                                                onMouseLeave={() => setHoveredSolarIndex(null)}
                                            >
                                                {/* Tooltip */}
                                                <AnimatePresence>
                                                    {hoveredSolarIndex === i && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                                            className="absolute bottom-full mb-3 w-32 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-3 shadow-2xl z-50 pointer-events-none"
                                                        >
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">
                                                                Today {data.hour}:00
                                                            </div>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] text-gray-500 uppercase">Eff:</span>
                                                                <span className={`text-xs font-black ${data.efficiency > 70 ? 'text-primary' : data.efficiency > 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                                    {data.efficiency}%
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] text-gray-500 uppercase">UV:</span>
                                                                <span className="text-[10px] text-white font-bold">{data.weather?.uv_index?.toFixed(1) || '0.0'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] text-gray-500 uppercase">Cloud:</span>
                                                                <span className="text-[10px] text-white font-bold">{data.weather?.cloud_cover || 0}%</span>
                                                            </div>
                                                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45 border-r border-b border-white/10"></div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <motion.div
                                                    className={`w-full rounded-t-lg transition-all border-t border-x ${data.is_peak ? 'bg-primary border-primary/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5'
                                                        }`}
                                                    style={{ height: `${Math.max(data.efficiency, 15)}%` }}
                                                    whileHover={{ height: '90%', backgroundColor: '#10b981' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">
                                        <span>Off-Peak</span>
                                        <span>Peak Hours</span>
                                    </div>
                                    <button
                                        onClick={handleOptimize}
                                        className="w-full mt-6 py-4 glass hover:bg-white/5 border-white/5 rounded-2xl text-[10px] font-black tracking-[0.2em] text-white transition-all uppercase"
                                    >
                                        Optimize Schedule
                                    </button>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    {/* 3. Assistant / AI Insight */}
                    <motion.div
                        className="lg:col-span-7"
                        variants={itemVariants}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <SpotlightCard>
                            <div className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-6">
                                <div className="relative w-40 h-40 shrink-0">
                                    <ChargingAnimation isCharging={isCharging} />
                                </div>
                                <div className="flex-1 text-center md:text-left min-w-0">
                                    <h4 className="text-2xl md:text-3xl font-black text-white mb-2 italic tracking-tight leading-tight">
                                        "{currentEfficiency > 50 ? 'Optimal charging conditions detected.' : 'Grid load is high. Smart Sync Active.'}"
                                    </h4>
                                    <p className="text-gray-500 font-medium text-sm md:text-base">Nexus AI is monitoring the community grid and renewable availability in real-time.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        console.log("AI Insights Clicked")
                                        setShowInsights(true)
                                    }}
                                    className="relative z-50 bg-white text-black font-black px-6 py-4 rounded-[1.5rem] text-[10px] tracking-[0.2em] uppercase hover:scale-105 transition-all shadow-xl active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
                                >
                                    AI Insights
                                </button>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    {/* 4. Upcoming Node Tracking */}
                    <motion.div
                        className="lg:col-span-5 cursor-pointer"
                        variants={itemVariants}
                        onClick={() => router.push('/dashboard/schedule')}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <SpotlightCard className="h-full">
                            <div className="p-10 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-primary border-white/5 shadow-xl">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-white tracking-tight">Next Session</h4>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Charging Station</p>
                                    </div>
                                </div>

                                {nextBooking ? (
                                    <div>
                                        <h5 className="text-2xl font-black text-white mb-1">{nextBooking.charger_name}</h5>
                                        <p className="text-primary font-bold text-sm mb-4">{formatDate(nextBooking.start_time)}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Session Confirmed</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 font-medium text-sm italic py-4">No upcoming sessions.</p>
                                )}
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>
            </motion.div>

            <AIInsightsPanel
                isOpen={showInsights}
                onClose={() => setShowInsights(false)}
                batteryLevel={userData?.battery_capacity || 50}
                solarData={solarData}
                efficiency={currentEfficiency}
                cloudCover={currentWeather?.cloud_cover || 0}
                onAction={(action) => {
                    if (action === 'Start Charging' || action === 'Charge Immediately') {
                        if (!isCharging) toggleCharge()
                    } else if (action === 'Schedule for 2 PM') {
                        router.push('/dashboard/map')
                        toast.success("Redirecting to schedule for optimal time...")
                    } else if (action === 'Set Limit to 80%') {
                        toast.success("Battery charge limit set to 80%")
                    }
                }}
            />
        </div>
    )
}
