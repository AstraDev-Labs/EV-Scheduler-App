'use client'

import { motion } from 'framer-motion'

export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center">
                <motion.div
                    className="glass-light rounded-2xl p-12 mx-auto max-w-md"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="mx-auto w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.h2
                        className="mt-6 text-2xl font-bold gradient-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Loading...
                    </motion.h2>
                    <motion.p
                        className="mt-2 text-gray-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Preparing your dashboard
                    </motion.p>
                </motion.div>
            </div>
        </div>
    )
}
