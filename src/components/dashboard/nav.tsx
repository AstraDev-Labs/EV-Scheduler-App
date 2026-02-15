'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Calendar, Map, User, LayoutDashboard, LogOut, Shield, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import clsx from 'clsx'
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useMousePosition } from '@/hooks/use-mouse-position'

const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
    { name: 'Map', href: '/dashboard/map', icon: Map },
    { name: 'Admin', href: '/dashboard/admin', icon: Shield },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
]

export default function DashboardNav() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { x, y } = useMousePosition()
    const [role, setRole] = useState('user')
    const [isHovered, setIsHovered] = useState<string | null>(null)

    // Motion Values for performance and to fix lint errors
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    useEffect(() => {
        mouseX.set(x)
        mouseY.set(y)
    }, [x, y, mouseX, mouseY])

    // 3D Tilt calculation
    const rotateX = useSpring(useTransform(mouseY, [0, 1000], [5, -5]), { stiffness: 100, damping: 30 })
    const rotateY = useSpring(useTransform(mouseX, [0, 1000], [-5, 5]), { stiffness: 100, damping: 30 })

    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            try {
                const user = JSON.parse(userStr)
                setRole(user.role || 'user')
            } catch (e) {
                console.error("Failed to parse user", e)
            }
        }
    }, [])

    const visibleLinks = links.filter(link => {
        if (link.name === 'Admin') return role === 'staff'
        return true
    })

    const handleLogout = async () => {
        localStorage.removeItem('user')
        await supabase.auth.signOut()
        router.push('/auth')
    }

    return (
        <>
            {/* Mobile Bottom Nav */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg glass border border-white/10 rounded-[2.5rem] px-2 py-2 md:hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center px-2">
                    {visibleLinks.map((link) => {
                        const LinkIcon = link.icon
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={clsx(
                                    'relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 min-w-[60px]',
                                    isActive ? 'text-primary' : 'text-gray-500 hover:text-white'
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-primary/10 rounded-2xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <LinkIcon size={20} className={clsx(isActive && 'fill-primary/20')} />
                                <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">{link.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-72 md:flex-col z-40 p-6">
                <motion.div
                    className="flex min-h-0 flex-1 flex-col glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    style={{ rotateX, rotateY, perspective: 1000 }}
                    transition={{ duration: 0.7, ease: "circOut" }}
                >
                    <div className="flex flex-1 flex-col pt-10 pb-4">
                        <div className="flex flex-shrink-0 items-center px-10 mb-12">
                            <motion.div
                                className="flex items-center gap-4 group cursor-pointer"
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:rotate-12 transition-transform duration-500">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-white tracking-tighter leading-none">SmartCharge</span>
                                    <span className="text-[10px] font-black text-primary tracking-[0.3em] uppercase opacity-60">EV Network</span>
                                </div>
                            </motion.div>
                        </div>

                        <nav className="mt-4 flex-1 space-y-2 px-6">
                            {visibleLinks.map((link, index) => {
                                const LinkIcon = link.icon
                                const isActive = pathname === link.href
                                return (
                                    <motion.div
                                        key={link.name}
                                        onMouseEnter={() => setIsHovered(link.name)}
                                        onMouseLeave={() => setIsHovered(null)}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 + index * 0.05 }}
                                    >
                                        <Link
                                            href={link.href}
                                            className={clsx(
                                                'group relative flex items-center px-6 py-4 text-sm font-black rounded-3xl transition-all duration-300 overflow-hidden',
                                                isActive
                                                    ? 'text-white'
                                                    : 'text-gray-500 hover:text-white'
                                            )}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="sidebarActive"
                                                    className="absolute inset-0 bg-white/5 border border-white/5 -z-10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}

                                            <div className={clsx(
                                                'relative z-10 mr-4 transition-all duration-300',
                                                isActive ? 'text-primary' : 'group-hover:text-primary'
                                            )}>
                                                <LinkIcon size={20} className={clsx(isActive && 'fill-primary/20')} />
                                                {isActive && (
                                                    <div className="absolute -inset-2 bg-primary/20 blur-md rounded-full -z-10" />
                                                )}
                                            </div>

                                            <span className="relative z-10 flex-1 tracking-tight">{link.name}</span>

                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-primary"
                                                >
                                                    <ChevronRight size={14} />
                                                </motion.div>
                                            )}
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </nav>
                    </div>

                    <div className="p-8">
                        <div className="glass-light p-6 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white truncate max-w-[120px]">
                                        {pathname.includes('admin') ? 'Staff Admin' : 'Active Driver'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Network Status</span>
                                </div>
                            </div>
                            <motion.button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black tracking-widest text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all uppercase"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <LogOut size={14} />
                                Logout
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    )
}
