'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
            <div className="mx-auto w-full max-w-sm rounded-lg bg-white p-6 shadow-lg text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
                <p className="text-gray-500 mb-6">
                    The link you clicked is invalid or has expired. This can happen if you requested multiple links and clicked an old one, or if the link was already used.
                </p>
                <Link
                    href="/auth"
                    className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    )
}
