'use client'

import { useState, useEffect } from 'react'
import { User, Car, Battery, Save, Mail, Globe, Shield, CreditCard, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useMousePosition } from '@/hooks/use-mouse-position'
import dynamic from 'next/dynamic'

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'
import SpotlightCard from '@/components/ui/spotlight-card'

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black" />
})

export default function ProfilePage() {
    const { x, y } = useMousePosition()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Form states
    const [fullName, setFullName] = useState('')
    const [vehicleModel, setVehicleModel] = useState('')
    const [batteryCapacity, setBatteryCapacity] = useState('')
    const [country, setCountry] = useState('India')

    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            const userData = JSON.parse(userStr)
            setUser(userData)
            setFullName(userData.full_name || '')
            setVehicleModel(userData.vehicle_model || '')
            setBatteryCapacity(userData.battery_capacity?.toString() || '')
            setCountry(userData.country || 'India')

            fetch('/api/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        const freshUser = data.user
                        setUser(freshUser)
                        setFullName(freshUser.full_name || '')
                        setVehicleModel(freshUser.vehicle_model || '')
                        setBatteryCapacity(freshUser.battery_capacity?.toString() || '')
                        setCountry(freshUser.country || 'India')
                        localStorage.setItem('user', JSON.stringify(freshUser))
                    }
                })
                .finally(() => setLoading(false))
        } else {
            window.location.href = '/auth'
        }
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    full_name: fullName,
                    vehicle_model: vehicleModel,
                    battery_capacity: parseFloat(batteryCapacity) || 0,
                    country: country
                })
            })

            const data = await response.json()
            if (response.ok) {
                setMessage('Profile updated successfully.')
                setUser(data.user)
                localStorage.setItem('user', JSON.stringify(data.user))
            } else {
                setMessage('Profile update failed.')
            }
        } catch (error) {
            setMessage('Communication error.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return null

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
                        <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Profile</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4">
                        <ShinyText className="text-white">Profile Settings</ShinyText>
                    </h1>
                    <p className="text-gray-500 font-medium">Manage your account details and vehicle charging parameters.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <motion.div
                        className="lg:col-span-8 space-y-8"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <TiltedCard>
                            <div className="glass-card p-1 group border-white/5 relative">
                                <div className="spotlight group-hover:opacity-100 opacity-0 transition-opacity duration-500" style={{ backgroundImage: `radial-gradient(600px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.15), transparent 80%)` }} />
                                <div className="p-10 relative z-10">
                                    <div className="flex items-center gap-8 mb-12">
                                        <div className="w-24 h-24 rounded-3xl glass-light flex items-center justify-center text-primary text-4xl font-black border border-white/5 shadow-2xl group-hover:rotate-6 transition-transform">
                                            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-3xl font-black text-white tracking-tight">{fullName || 'User Profile'}</h2>
                                                <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                                                    <Shield size={12} fill="currentColor" />
                                                </div>
                                            </div>
                                            <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">{user?.email}</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSave} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Full Legal Name</label>
                                                <div className="relative">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                    <input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                        placeholder="John Matrix"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Region & Currency</label>
                                                <div className="relative">
                                                    <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                    <select
                                                        value={country}
                                                        onChange={(e) => setCountry(e.target.value)}
                                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                                                    >
                                                        <option value="India">India (INR ₹)</option>
                                                        <option value="United States">United States (USD $)</option>
                                                        <option value="United Kingdom">United Kingdom (GBP £)</option>
                                                        <option value="European Union">European Union (EUR €)</option>
                                                        <option value="Canada">Canada (CAD C$)</option>
                                                        <option value="Australia">Australia (AUD A$)</option>
                                                        <option value="Japan">Japan (JPY ¥)</option>
                                                        <option value="China">China (CNY ¥)</option>
                                                        <option value="Russia">Russia (RUB ₽)</option>
                                                        <option value="Brazil">Brazil (BRL R$)</option>
                                                        <option value="South Africa">South Africa (ZAR R)</option>
                                                        <option value="UAE">UAE (AED AED)</option>
                                                        <option value="Singapore">Singapore (SGD S$)</option>
                                                        <option value="Switzerland">Switzerland (CHF Fr)</option>
                                                        <option value="New Zealand">New Zealand (NZD NZ$)</option>
                                                        <option value="Mexico">Mexico (MXN $)</option>
                                                        <option value="South Korea">South Korea (KRW ₩)</option>
                                                        <option value="Sweden">Sweden (SEK kr)</option>
                                                        <option value="Norway">Norway (NOK kr)</option>
                                                        <option value="Saudi Arabia">Saudi Arabia (SAR SR)</option>
                                                        <option value="Turkey">Turkey (TRY ₺)</option>
                                                        <option value="Thailand">Thailand (THB ฿)</option>
                                                        <option value="Malaysia">Malaysia (MYR RM)</option>
                                                        <option value="Indonesia">Indonesia (IDR Rp)</option>
                                                        <option value="Vietnam">Vietnam (VND ₫)</option>
                                                        <option value="Pakistan">Pakistan (PKR Rs)</option>
                                                        <option value="Sri Lanka">Sri Lanka (LKR Rs)</option>
                                                        <option value="Bangladesh">Bangladesh (BDT ৳)</option>
                                                        <option value="Nepal">Nepal (NPR Rs)</option>
                                                    </select>
                                                    <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 rotate-90" />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Vehicle Details</label>
                                                <div className="relative">
                                                    <Car size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                    <input
                                                        type="text"
                                                        value={vehicleModel}
                                                        onChange={(e) => setVehicleModel(e.target.value)}
                                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                        placeholder="Model-X Prime"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Charge Capacity (kWh)</label>
                                                <div className="relative">
                                                    <Battery size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                    <input
                                                        type="number"
                                                        value={batteryCapacity}
                                                        onChange={(e) => setBatteryCapacity(e.target.value)}
                                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                        placeholder="100"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <p className={clsx(
                                                "text-[10px] font-black uppercase tracking-[0.2em]",
                                                message.includes('successfully') ? "text-primary" : "text-gray-500"
                                            )}>
                                                {message || 'All systems synchronized'}
                                            </p>
                                            <motion.button
                                                type="submit"
                                                disabled={saving}
                                                className="px-10 py-4 rounded-2xl bg-primary text-black font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3"
                                                whileHover={{ boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)" }}
                                            >
                                                <Save size={16} /> Update Profile
                                            </motion.button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </TiltedCard>
                    </motion.div>

                    <motion.div
                        className="lg:col-span-4 space-y-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <SpotlightCard className="glass-card p-8 border-white/5">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6 px-1">Identity Verification</h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all">
                                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary">
                                        <Mail size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-white uppercase tracking-tight">Email Verified</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Multi-factor Active</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all">
                                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary">
                                        <CreditCard size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-white uppercase tracking-tight">Payment Methods</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Visa •••• 4242</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard className="glass-card p-8 border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Prime Member</h3>
                            <p className="text-xs text-gray-300 font-medium leading-relaxed mb-6">You are currently operating on the highest tier of the SmartCharge network. Priority charging enabled.</p>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: '85%' }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Efficiency Rating</span>
                                <span className="text-[8px] font-black text-primary uppercase tracking-widest">85%</span>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
