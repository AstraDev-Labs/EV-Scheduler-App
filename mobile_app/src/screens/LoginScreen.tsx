import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { authService } from '../services/api';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const result = await authService.login(email, password);
        setLoading(false);

        if (result.success) {
            Alert.alert('Success', 'Logged in successfully!');
            // Navigate to dashboard or home
        } else {
            Alert.alert('Login Failed', result.error);
        }
    };

    return (
        <LinearGradient
            colors={['#030712', '#0f172a']}
            style={{ flex: 1 }}
            className="flex-1"
        >
            <SafeAreaView style={{ flex: 1 }} className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    className="flex-1"
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        className="px-6 py-12"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header Section */}
                        <View className="items-center mb-12">
                            <View className="h-20 w-20 bg-emerald-500/10 rounded-3xl items-center justify-center border border-emerald-500/20 mb-6">
                                <Zap size={40} color="#10b981" fill="#10b981" />
                            </View>
                            <Text className="text-4xl font-black text-white tracking-tighter">SmartCharge</Text>
                            <Text className="text-emerald-500 font-medium tracking-[0.2em] text-[10px] uppercase mt-2">
                                Intelligent AI EV Ecosystem
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View className="bg-white/5 p-8 rounded-[32px] border border-white/5 space-y-6">
                            <Text className="text-2xl font-bold text-white mb-2">Welcome Back</Text>

                            <View className="space-y-4">
                                {/* Email Input */}
                                <View className="relative">
                                    <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                        <Mail size={20} color="#64748b" />
                                    </View>
                                    <TextInput
                                        placeholder="Email Address"
                                        placeholderTextColor="#475569"
                                        className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium"
                                        style={{ color: 'white' }}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                {/* Password Input */}
                                <View className="relative">
                                    <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                        <Lock size={20} color="#64748b" />
                                    </View>
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor="#475569"
                                        className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium"
                                        style={{ color: 'white' }}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={loading}
                                className="bg-emerald-500 rounded-2xl py-4 items-center flex-row justify-center space-x-2"
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <>
                                        <Text className="text-black font-bold text-lg">Sign In</Text>
                                        <ArrowRight size={20} color="#000" />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Footer */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('SignUp')}
                                className="items-center mt-4"
                            >
                                <Text className="text-gray-500">
                                    Don't have an account? <Text className="text-emerald-500 font-bold">Sign Up</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}
