
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function proxyRequest(req: NextRequest, method: string, path: string[]) {
    const fnPath = path.join('/');
    const searchParams = req.nextUrl.search; // Capture ?country=UAE
    const url = `${BACKEND_URL}/api/${fnPath}${searchParams}`;

    console.log(`[Proxy] ${method} ${url}`);

    try {
        const headers = {
            'Content-Type': 'application/json',
        };

        let body = undefined;
        if (method !== 'GET' && method !== 'HEAD') {
            try {
                body = await req.json();
            } catch (e) {
                // If no body or invalid json, ignore
            }
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        // Try parsing JSON, fallback to text if fails (for 500 or non-JSON errors)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        } else {
            const text = await response.text();
            console.error(`[Proxy] Backend returned non-JSON (${response.status}):`, text);
            return NextResponse.json(
                { detail: `Backend Error (${response.status}): ${text}` },
                { status: response.status }
            );
        }

    } catch (error: any) {
        console.error('[Proxy] Error:', error);
        // If backend is down, return a clean JSON error instead of crashing fetch
        return NextResponse.json(
            { detail: `Backend unavailable: ${error.message}` },
            { status: 503 }
        );
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, 'GET', path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, 'POST', path);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, 'PUT', path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(req, 'DELETE', path);
}
