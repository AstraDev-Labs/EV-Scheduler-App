'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'

export default function VerifyEmailPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('Invalid verification link')
            return
        }

        // Call backend to verify token
        // Use relative path (proxied)
        fetch('/api/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setStatus('success')
                    setMessage(data.message)
                    // Redirect to login after 3 seconds
                    setTimeout(() => router.push('/auth?verified=true'), 3000)
                } else {
                    setStatus('error')
                    setMessage(data.detail || 'Verification failed')
                }
            })
            .catch(error => {
                setStatus('error')
                setMessage('An error occurred during verification')
                console.error(error)
            })
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <TiltedCard>
                <motion.div
                    className="glass-light rounded-2xl p-12 max-w-md w-full text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {status === 'loading' && (
                        <>
                            <Loader className="mx-auto h-16 w-16 text-green-400 animate-spin mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                <ShinyText className="text-white">Verifying Email...</ShinyText>
                            </h1>
                            <p className="text-gray-300">Please wait while we verify your account</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                <ShinyText className="text-white">Email Verified! ✅</ShinyText>
                            </h1>
                            <p className="text-gray-300 mb-6">{message}</p>
                            <p className="text-sm text-gray-400">Redirecting to login...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-2">
                                <ShinyText className="text-red-500">Verification Failed ❌</ShinyText>
                            </h1>
                            <p className="text-gray-300 mb-6">{message}</p>
                            <button
                                onClick={() => router.push('/auth')}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                            >
                                Go to Login
                            </button>
                        </>
                    )}
                </motion.div>
            </TiltedCard>
        </div>
    )
}
