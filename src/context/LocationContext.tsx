'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface LocationContextType {
    userLocation: { lat: number; lng: number } | null
    locationName: string
    loading: boolean
}

const LocationContext = createContext<LocationContextType>({
    userLocation: null,
    locationName: 'Detecting Location...',
    loading: true
})

export const useLocation = () => useContext(LocationContext)

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [locationName, setLocationName] = useState('Detecting Location...')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Robust Geolocation Detection logic
        if (navigator.geolocation) {
            // Level 1: Try High Accuracy (GPS/Mobile)
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords
                    setUserLocation({ lat, lng })
                    setLocationName('Your Location')
                    setLoading(false)
                },
                async (err) => {
                    console.warn("High-accuracy location failed, trying standard...", err.message)
                    // Level 2: Try Low Accuracy (WiFi/IP - Better for desktop)
                    navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                            const { latitude: lat, longitude: lng } = pos.coords
                            setUserLocation({ lat, lng })
                            try {
                                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                                const data = await res.json()
                                setLocationName(data.address?.city || data.address?.town || data.address?.suburb || 'Your Location')
                            } catch (e) {
                                setLocationName('Your Location')
                            }
                            setLoading(false)
                        },
                        async (err2) => {
                            console.error("Standard location failed, using default (Bangalore)", err2.message)
                            setLocationName('Default (Bangalore)')
                            setLoading(false)
                        },
                        { enableHighAccuracy: false, timeout: 5000 }
                    )
                },
                { enableHighAccuracy: true, timeout: 3000 }
            )
        } else {
            setLocationName('Default (Bangalore)')
            setLoading(false)
        }
    }, [])

    return (
        <LocationContext.Provider value={{ userLocation, locationName, loading }}>
            {children}
        </LocationContext.Provider>
    )
}
