'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useMap } from 'react-leaflet'

const BookingModal = dynamic(() => import('@/components/booking/booking-modal'), {
    ssr: false
})

// Fix for default marker icon in Next.js
const iconFix = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
}

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap()
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], 16)
        }
    }, [lat, lng, map])
    return null
}

interface MapComponentProps {
    filterAvailable?: boolean
    userLocation?: { lat: number; lng: number } | null
}

export default function MapComponent({ filterAvailable = false, userLocation }: MapComponentProps) {
    const [chargers, setChargers] = useState<any[]>([])
    const [occupiedChargerIds, setOccupiedChargerIds] = useState<string[]>([])
    const [selectedCharger, setSelectedCharger] = useState<any>(null)
    const [showBookingModal, setShowBookingModal] = useState(false)
    const [prefillTime, setPrefillTime] = useState<string | undefined>(undefined)
    const [prefillDuration, setPrefillDuration] = useState<string | undefined>(undefined)

    const searchParams = useSearchParams()
    const supabase = createClient()

    const [currency, setCurrency] = useState('₹')
    const [conversionRate, setConversionRate] = useState(1.0)

    useEffect(() => {
        iconFix()

        // Fetch real charger data
        async function fetchChargers() {
            const { data } = await supabase
                .from('chargers')
                .select('*')
            if (data) {
                setChargers(data)
            }
        }

        // Fetch user currency
        async function fetchCurrency() {
            try {
                const userStr = localStorage.getItem('user')
                if (userStr) {
                    const user = JSON.parse(userStr)
                    const country = user.country || 'India'
                    const res = await fetch(`/api/currency-rate?country=${encodeURIComponent(country)}`)
                    if (res.ok) {
                        const data = await res.json()
                        setCurrency(data.currency)
                        setConversionRate(data.rate)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch currency:', error)
            }
        }

        // Fetch Active Bookings to determine occupancy
        async function fetchActiveBookings() {
            const now = new Date().toISOString()
            const { data } = await supabase
                .from('bookings')
                .select('charger_id')
                .eq('status', 'Confirmed')
                .lte('start_time', now)
                .gt('end_time', now)

            if (data) {
                setOccupiedChargerIds(data.map(b => String(b.charger_id)))
            }
        }

        fetchChargers()
        fetchActiveBookings()
        fetchCurrency()

        // Set up polling for occupancy every minute
        const interval = setInterval(fetchActiveBookings, 60000)
        return () => clearInterval(interval)
    }, [])

    // Handle Search Params for Auto-selection
    useEffect(() => {
        if (chargers.length > 0) {
            const chargerId = searchParams.get('chargerId')
            const openBooking = searchParams.get('openBooking')
            const startTime = searchParams.get('startTime')

            if (chargerId) {
                const charger = chargers.find(c => String(c.id) === String(chargerId))
                if (charger) {
                    setSelectedCharger(charger)
                    if (openBooking === 'true' || startTime) {
                        setShowBookingModal(true)
                        if (startTime) setPrefillTime(startTime)
                        const duration = searchParams.get('duration')
                        if (duration) setPrefillDuration(duration)
                    }
                }
            }
        }
    }, [chargers, searchParams])

    const handleBooking = (charger: any) => {
        setSelectedCharger(charger)
        setShowBookingModal(true)
    }

    const handleBookingSuccess = () => {
        setShowBookingModal(false)
        setSelectedCharger(null)
        alert('Booking confirmed! Check your Schedule for details.')
    }

    // Filter chargers
    const displayedChargers = chargers.filter(charger => {
        if (!filterAvailable) return true
        const isNowOccupied = occupiedChargerIds.includes(String(charger.id))
        const effectiveStatus = isNowOccupied ? 'Occupied' : charger.status
        return effectiveStatus === 'Available'
    })

    return (
        <>
            <MapContainer
                center={[12.9716, 77.5946]}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '600px', width: '100%', borderRadius: '12px', zIndex: 10 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Recenter on user location */}
                {userLocation && <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />}

                {/* Auto-recenter when a charger is selected */}
                {selectedCharger && (
                    <RecenterMap
                        lat={typeof selectedCharger.location === 'string' ? JSON.parse(selectedCharger.location).lat : selectedCharger.location.lat}
                        lng={typeof selectedCharger.location === 'string' ? JSON.parse(selectedCharger.location).lng : selectedCharger.location.lng}
                    />
                )}
                {displayedChargers.map((charger) => {
                    const location = typeof charger.location === 'string'
                        ? JSON.parse(charger.location)
                        : charger.location

                    const isNowOccupied = occupiedChargerIds.includes(String(charger.id))
                    const effectiveStatus = isNowOccupied ? 'Occupied' : charger.status

                    return (
                        <Marker key={charger.id} position={[location.lat, location.lng]}>
                            <Popup>
                                <div className="p-1">
                                    <h3 className="font-bold text-gray-900">{charger.name}</h3>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${effectiveStatus === 'Available' ? 'bg-green-500' :
                                            effectiveStatus === 'Occupied' ? 'bg-red-500' : 'bg-red-500'
                                            }`} />
                                        <span className="text-sm font-medium text-gray-600">{effectiveStatus}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{currency}{(charger.cost_per_kwh * conversionRate).toFixed(2)}/kWh</p>
                                    <button
                                        onClick={() => handleBooking(charger)}
                                        disabled={effectiveStatus !== 'Available'}
                                        className="mt-2 w-full bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {effectiveStatus === 'Available' ? 'Book Slot' : 'Occupied'}
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>

            {showBookingModal && selectedCharger && (
                <BookingModal
                    charger={selectedCharger}
                    prefillTime={prefillTime}
                    prefillDuration={prefillDuration}
                    onClose={() => {
                        setShowBookingModal(false)
                        setPrefillTime(undefined)
                        setPrefillDuration(undefined)
                    }}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </>
    )
}
