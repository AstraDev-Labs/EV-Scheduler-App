import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // START: Auth Check Disabled for Custom Auth
    // const { data: { user } } = await supabase.auth.getUser()

    // if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    //    return NextResponse.redirect(new URL('/auth', request.url))
    // }

    // if (user && request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/auth/callback') {
    //    return NextResponse.redirect(new URL('/dashboard', request.url))
    // }
    // END: Auth Check Disabled
}
