'use client'

import dynamic from 'next/dynamic'
import MapLoading from '@/components/dashboard/loading-map'
import ShinyText from '@/components/ui/shiny-text'

// Dynamically import the Map component with no SSR
const MapComponent = dynamic(() => import('@/components/dashboard/map-component'), {
    loading: () => <MapLoading />,
    ssr: false
})

import { useState } from 'react'

export default function MapPage() {
    const [filterAvailable, setFilterAvailable] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isLocating, setIsLocating] = useState(false)

    const handleNearMe = () => {
        setIsLocating(true)
        if (!('geolocation' in navigator)) {
            alert("Geolocation is not supported by your browser.")
            setIsLocating(false)
            return
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }

        const success = (position: GeolocationPosition) => {
            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            })
            setIsLocating(false)
        }

        const error = (err: GeolocationPositionError) => {
            console.warn(`ERROR(${err.code}): ${err.message}`)
            // Fallback to low accuracy
            navigator.geolocation.getCurrentPosition(
                success,
                (fallbackErr) => {
                    console.error("Fallback location error:", fallbackErr)
                    setIsLocating(false)
                    alert("Could not get your location. Check GPS settings.")
                },
                { enableHighAccuracy: false, timeout: 10000 }
            )
        }

        navigator.geolocation.getCurrentPosition(success, error, options)
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        <ShinyText className="text-white">Charging Stations</ShinyText>
                    </h1>
                    <p className="text-gray-400 mt-1">Find nearby chargers and book a slot</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterAvailable(!filterAvailable)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterAvailable
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent'
                            : 'glass text-gray-300 hover:text-white border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {filterAvailable ? 'Available Only' : 'Filter'}
                    </button>
                    <button
                        onClick={handleNearMe}
                        disabled={isLocating}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLocating ? 'Locating...' : 'Near Me'}
                    </button>
                </div>
            </div>

            <div className="h-full pb-6">
                {/* @ts-ignore */}
                <MapComponent filterAvailable={filterAvailable} userLocation={userLocation} />
            </div>
        </div>
    )
}
