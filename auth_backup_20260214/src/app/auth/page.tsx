'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
})

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    const supabase = createClient()

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        if (mode === 'login') {
            // Use backend API for login
            try {
                console.log('Attempting login with:', email)
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })

                console.log('Login response status:', response.status)
                const data = await response.json()
                console.log('Login response data:', data)

                if (response.ok) {
                    console.log('Login successful, redirecting...')
                    // Save user data to localStorage
                    localStorage.setItem('user', JSON.stringify(data.user))
                    // Force redirect to dashboard
                    window.location.href = '/dashboard'
                } else {
                    console.error('Login failed:', data)
                    setMessage('❌ ' + (data.detail || 'Login failed'))
                }
            } catch (err) {
                console.error('Login error:', err)
                setMessage('❌ Failed to connect to server')
            }
        } else {
            // Use ONLY backend API for registration (no Supabase Auth)
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: fullName || email.split('@')[0]
                    })
                })

                const data = await response.json()

                if (response.ok && data.status === 'success') {
                    setMessage('✅ ' + data.message)
                    // Clear form
                    setEmail('')
                    setPassword('')
                    setFullName('')
                } else {
                    setMessage('❌ ' + (data.detail || data.error || 'Registration failed'))
                }
            } catch (err) {
                console.error('Registration error:', err)
                setMessage('❌ Failed to connect to server. Is the backend running?')
            }
        }
        setLoading(false)
    }


    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
            <AnimatedBackground />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                <motion.div
                    className="glass rounded-2xl p-8 shadow-2xl card-3d"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <div className="text-center">
                        <motion.div
                            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full glass-light text-green-400 p-2 glow-green-sm float"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Sun size={48} />
                        </motion.div>
                        <motion.h2
                            className="mt-6 text-4xl font-bold tracking-tight gradient-text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Smart Charge
                        </motion.h2>
                        <motion.p
                            className="mt-2 text-sm text-gray-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Intelligent EV Charging Scheduler
                        </motion.p>
                    </div>

                    <div className="flex border-b border-white/10 mt-8">
                        <motion.button
                            className={`flex-1 pb-3 text-sm font-medium transition-smooth ${mode === 'login'
                                ? 'border-b-2 border-green-400 text-green-400 glow-green-sm'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                            onClick={() => setMode('login')}
                            whileTap={{ scale: 0.95 }}
                        >
                            Log In
                        </motion.button>
                        <motion.button
                            className={`flex-1 pb-3 text-sm font-medium transition-smooth ${mode === 'signup'
                                ? 'border-b-2 border-green-400 text-green-400 glow-green-sm'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                            onClick={() => setMode('signup')}
                            whileTap={{ scale: 0.95 }}
                        >
                            Sign Up
                        </motion.button>
                    </div>

                    <motion.form
                        className="mt-8 space-y-5"
                        onSubmit={handleAuth}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="space-y-4">
                            {mode === 'signup' && (
                                <motion.div
                                    whileFocus={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <label htmlFor="full-name" className="block text-sm font-medium text-gray-300 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        id="full-name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        className="glass-light block w-full rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-smooth"
                                        placeholder="Sorna Deepa"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </motion.div>
                            )}
                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-2">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="glass-light block w-full rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-smooth"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </motion.div>
                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="glass-light block w-full rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-smooth"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </motion.div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg glow-green hover:from-green-600 hover:to-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 disabled:opacity-50 transition-smooth"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="pulse">Processing...</span>
                                </span>
                            ) : (
                                mode === 'login' ? 'Sign in' : 'Create Account'
                            )}
                        </motion.button>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg text-sm text-center ${message.includes('Check')
                                    ? 'glass-light text-green-400 border border-green-400/30'
                                    : 'glass-dark text-red-400 border border-red-400/30'
                                    }`}
                            >
                                {message}
                            </motion.div>
                        )}
                    </motion.form>

                    <div className="relative mt-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="glass px-3 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <motion.button
                        type="button"
                        onClick={() => alert("Google Login coming soon! Please use Email/Password.")}
                        className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg glass-light px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white hover:glass transition-smooth opacity-75"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M12.0003 20.45c4.6667 0 8.45-3.7833 8.45-8.45 0-.4667-.05-.9167-.15-1.35h-8.3v2.55h4.75c-.2 1.0833-1.2333 3.2-4.75 3.2-2.8667 0-5.2-2.3-5.2-5.15 0-2.85 2.3333-5.15 5.2-5.15 1.5 0 2.85.55 3.8667 1.5167l1.9-1.9c-1.5333-1.4333-3.5167-2.3167-5.7667-2.3167-4.6667 0-8.45 3.7833-8.45 8.45 0 4.6667 3.7833 8.45 8.45 8.45z" fill="#4285F4" fillRule="evenodd" />
                        </svg>
                        <span>Google (Coming Soon)</span>
                    </motion.button>
                </motion.div>

                <motion.p
                    className="mt-6 text-center text-xs text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    © 2026 Smart EV Scheduler. All rights reserved.
                </motion.p>
            </motion.div>
        </div>
    )
}
