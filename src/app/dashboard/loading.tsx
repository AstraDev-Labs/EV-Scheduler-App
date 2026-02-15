'use client'

import { motion } from 'framer-motion'

export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-10 bg-white/5 rounded-lg w-64"></div>
                <div className="h-10 bg-white/5 rounded-full w-32"></div>
            </div>

            <div className="glass rounded-2xl p-6 h-64"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-6 h-48"></div>
                <div className="glass rounded-2xl p-6 h-48"></div>
            </div>
        </div>
    )
}
