'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight, Github } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useMousePosition } from '@/hooks/use-mouse-position'

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black" />
})

export default function LoginPage() {
    const router = useRouter()
    const { x, y } = useMousePosition()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [adminCode, setAdminCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const cardRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        if (mode === 'login') {
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })

                const data = await response.json()

                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user))
                    window.location.href = '/dashboard'
                } else {
                    setMessage(data.detail || 'Login failed')
                }
            } catch (err) {
                setMessage('Failed to connect to server')
            }
        } else {
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: fullName || email.split('@')[0],
                        admin_code: adminCode
                    })
                })

                const data = await response.json()

                if (response.ok && data.status === 'success') {
                    setMessage('Success! ' + data.message)
                    setEmail('')
                    setPassword('')
                    setFullName('')
                    setTimeout(() => setMode('login'), 2000)
                } else {
                    setMessage(data.detail || data.error || 'Registration failed')
                }
            } catch (err) {
                setMessage('Failed to connect to server')
            }
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
            <AnimatedBackground />

            {/* Spotlight Overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-30 transition duration-300 lg:absolute"
                style={{
                    background: `radial-gradient(600px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.05), transparent 80%)`
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg z-40 relative"
            >
                <div className="text-center mb-10">
                    <motion.div
                        className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] glass-card text-primary p-4 shadow-2xl float shimmer"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                    >
                        <Zap size={56} className="fill-primary" />
                    </motion.div>
                    <motion.h1
                        className="mt-8 text-5xl font-black tracking-tighter text-white"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <ShinyText className="text-white">SmartCharge</ShinyText>
                    </motion.h1>
                    <motion.p
                        className="mt-3 text-gray-500 font-medium text-lg uppercase tracking-[0.2em] text-[10px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Intelligent AI EV Ecosystem
                    </motion.p>
                </div>

                <TiltedCard>
                    <div className="glass-card p-1 lg:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5 relative group">
                        <div className="spotlight group-hover:opacity-100 opacity-0 transition-opacity duration-500" style={{ backgroundImage: `radial-gradient(600px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.15), transparent 80%)` }} />

                        <div className="p-8 relative z-10">
                            <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-10 border border-white/5">
                                <button
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${mode === 'login' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'
                                        }`}
                                    onClick={() => setMode('login')}
                                >
                                    Sign In
                                </button>
                                <button
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${mode === 'signup' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'
                                        }`}
                                    onClick={() => setMode('signup')}
                                >
                                    Register
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.form
                                    key={mode}
                                    initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                    onSubmit={handleAuth}
                                >
                                    {mode === 'signup' && (
                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                                    <UserIcon size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                                    placeholder="Full Legal Name"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                                    <ShieldCheck size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                                    placeholder="Access Code (Optional)"
                                                    value={adminCode}
                                                    onChange={(e) => setAdminCode(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                                placeholder="Email Address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-emerald-400 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs active:scale-[0.98] disabled:opacity-50 group"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                Connecting...
                                            </div>
                                        ) : (
                                            <>
                                                {mode === 'login' ? 'Sign In Now' : 'Register Now'}
                                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </motion.form>
                            </AnimatePresence>

                            <div className="relative my-10">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/5"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-black tracking-widest uppercase">
                                    <span className="bg-[#0b1221] px-4 text-gray-600">Social Authentication</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="w-full glass hover:bg-white/5 text-gray-400 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-bold text-sm border border-white/5 group"
                                onClick={() => alert("Google connectivity pending...")}
                            >
                                <Github size={20} className="group-hover:text-white transition-colors" />
                                continue with Google
                            </button>

                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-8 p-4 rounded-2xl text-center text-sm font-bold border ${message.includes('Success')
                                        ? 'bg-primary/10 text-primary border-primary/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}
                                >
                                    {message}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </TiltedCard>

                <p className="mt-10 text-center text-gray-600 text-[10px] font-bold tracking-[0.3em] uppercase">
                    Secure Cloud • © 2026 SmartCharge EV
                </p>
            </motion.div>
        </div>
    )
}

