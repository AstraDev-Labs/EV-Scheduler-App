'use client'

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

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

interface AdminMapProps {
    location: { lat: number; lng: number } | null
    onLocationSelect: (lat: number, lng: number) => void
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

function MapUpdater({ location }: { location: { lat: number; lng: number } | null }) {
    const map = useMap()
    useEffect(() => {
        if (location) {
            map.flyTo([location.lat, location.lng], 13)
        }
    }, [location, map])
    return null
}

export default function AdminMap({ location, onLocationSelect }: AdminMapProps) {
    useEffect(() => {
        iconFix()
    }, [])

    return (
        <MapContainer
            center={location || [12.9716, 77.5946]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '400px', width: '100%', borderRadius: '12px', zIndex: 10 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={onLocationSelect} />
            <MapUpdater location={location} />
            {location && <Marker position={[location.lat, location.lng]} />}
        </MapContainer>
    )
}
