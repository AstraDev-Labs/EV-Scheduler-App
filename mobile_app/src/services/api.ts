import axios from 'axios';
import { Platform } from 'react-native';

// Use specific URL for Android Emulator, otherwise use Render backend
const BASE_URL = 'https://ev-scheduler-app-backend.onrender.com';
const VERCEL_URL = 'https://ev-scheduler-app.vercel.app'; // Your Vercel deployment URL

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const authService = {
    login: async (email: string, password: string) => {
        try {
            const response = await api.post('/api/login', { email, password });
            return { success: true, data: response.data };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message || 'Login failed'
            };
        }
    },

    register: async (userData: any) => {
        try {
            // Step 1: Create account on Render
            const response = await api.post('/api/register', userData);
            const data = response.data;

            if (data.status === 'success') {
                // Step 2: Trigger email verification via Vercel
                try {
                    // Note: using axios directly here to avoid base URL conflict
                    await axios.post(`${VERCEL_URL}/api/auth/send-verification`, {
                        email: data.email,
                        full_name: data.full_name,
                        verification_token: data.verification_token
                    });
                    return {
                        success: true,
                        message: 'Registration successful. Please check your email.'
                    };
                } catch (emailErr) {
                    console.error('Email verification failed:', emailErr);
                    // Even if email fails, account is created
                    return {
                        success: true,
                        message: 'Account created, but verification email failed to send.'
                    };
                }
            }
            return { success: false, error: data.error || 'Registration failed' };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.detail || error.message || 'Registration failed'
            };
        }
    }
};

export default api;
