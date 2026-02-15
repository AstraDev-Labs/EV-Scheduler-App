'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AnimatedBackground = dynamic(() => import('@/components/3d/animated-background'), {
    ssr: false,
    loading: () => <div className="fixed inset-0 -z-10 bg-black pointer-events-none" />
})

const PageLoading = dynamic(() => import('@/components/ui/page-loading'), {
    ssr: false
})

const ChatAssistant = dynamic(() => import('@/components/ChatAssistant'), {
    ssr: false
})

export default function ClientSideExperience() {
    return (
        <>
            <AnimatedBackground />
            {/* <Suspense fallback={null}>
                <PageLoading />
            </Suspense> */}
            <ChatAssistant />
        </>
    )
}
