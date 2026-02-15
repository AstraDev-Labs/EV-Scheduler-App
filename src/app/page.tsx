'use client'

import Link from 'next/link'
import { Zap, Sun, ShieldCheck, ArrowRight, Battery, Cpu, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

import ShinyText from '@/components/ui/shiny-text'
import TiltedCard from '@/components/ui/tilted-card'
import SpotlightCard from '@/components/ui/spotlight-card'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex h-20 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary text-2xl tracking-tight">
            <Zap className="fill-primary" />
            <ShinyText className="text-primary font-black tracking-tight">SmartCharge</ShinyText>
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#solutions" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Solutions
            </Link>
          </nav>
          <div className="flex gap-4 items-center">
            <Link href="/auth" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-primary/90 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <div className="relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] -z-10" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block px-4 py-1.5 rounded-full glass border border-primary/20 text-primary text-sm font-bold mb-6">
                  Powered by Solar ML
                </span>
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
                  Intelligent EV Charging for <span className="gradient-text">Communities</span>
                </h1>
                <p className="text-xl leading-8 text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0">
                  Reduce energy costs by up to 40% with automated scheduling that prioritizes solar availability and off-peak grid rates.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                  <Link
                    href="/auth"
                    className="group rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-black shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
                  >
                    Start Charging Now
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="#features" className="text-lg font-semibold leading-6 text-gray-300 hover:text-white flex items-center gap-2">
                    Learn how it works <span className="text-primary">↓</span>
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                {/* 3D-like Dashboard Preview Card */}
                <TiltedCard>
                  <div className="glass-card p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <Battery className="text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Current Session</div>
                          <div className="text-lg font-bold">Fast Charger 04</div>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-primary animate-pulse">84%</div>
                    </div>

                    <div className="space-y-6">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[84%] bg-primary glow-green shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Savings</div>
                          <div className="text-xl font-bold text-accent">₹1,240</div>
                        </div>
                        <div className="glass p-4 rounded-xl">
                          <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Solar Mix</div>
                          <div className="text-xl font-bold text-secondary">92%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TiltedCard>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 glass p-4 rounded-2xl shadow-2xl backdrop-blur-md"
                >
                  <Sun className="text-yellow-400" size={32} />
                </motion.div>
                <motion.div
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-6 -left-6 glass p-4 rounded-2xl shadow-2xl backdrop-blur-md"
                >
                  <Cpu className="text-primary" size={32} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Feature Section */}
        <div id="features" className="py-24 sm:py-32 relative">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Core Technology</h2>
              <p className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Everything you need to manage <br /> community charging
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Solar Optimization",
                  desc: "Our ML algorithm identifies the perfect window to charge when solar production is at its peak.",
                  icon: <Sun className="h-8 w-8 text-primary" />,
                },
                {
                  title: "Grid Intelligence",
                  desc: "Prevent transformer overloads with dynamic load balancing across all community charging points.",
                  icon: <Globe className="h-8 w-8 text-primary" />,
                },
                {
                  title: "Smart Scheduling",
                  desc: "Enter your 'ready by' time and let our AI find the most cost-effective path to a full battery.",
                  icon: <Cpu className="h-8 w-8 text-primary" />,
                }
              ].map((feature, i) => (
                <SpotlightCard key={i} className="glass-card p-10 hover:border-primary/30 transition-colors group">
                  <div className="mb-6 bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </SpotlightCard>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
