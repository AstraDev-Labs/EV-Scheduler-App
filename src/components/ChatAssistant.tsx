'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, History, Plus, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface Conversation {
    id: string
    title: string
    created_at: string
}

import { useLocation } from '@/context/LocationContext'

export default function ChatAssistant() {
    const { userLocation, locationName } = useLocation()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)

    // Initial greeting as a visual only, not saved unless interacted
    const INITIAL_MESSAGE: Message = { role: 'assistant', content: 'Hello! I am your Smart EV Assistant. How can I help you today?' }

    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [userData, setUserData] = useState<any>(null)

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Load user data on mount
        const userStr = localStorage.getItem('user')
        if (userStr) {
            setUserData(JSON.parse(userStr))
        }
    }, [])

    useEffect(() => {
        if (isOpen && userData?.id) {
            loadConversations()
        }
    }, [isOpen, userData])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, loading])

    const loadConversations = async () => {
        if (!userData?.id) return
        try {
            const res = await fetch(`/api/chat/history?user_id=${userData.id}`)
            const data = await res.json()
            if (data.status === 'success') {
                setConversations(data.conversations)
            }
        } catch (e) {
            console.error("Failed to load history", e)
        }
    }

    const loadChat = async (conversationId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/chat/history/${conversationId}`)
            const data = await res.json()
            if (data.status === 'success') {
                setMessages(data.messages)
                setCurrentConversationId(conversationId)
                setShowHistory(false)
            }
        } catch (e) {
            console.error("Failed to load chat", e)
        } finally {
            setLoading(false)
        }
    }

    const startNewChat = () => {
        setMessages([INITIAL_MESSAGE])
        setCurrentConversationId(null)
        setShowHistory(false)
    }

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg = input.trim()
        setInput('')

        // Optimistic UI update
        const newMessages = [...messages, { role: 'user', content: userMsg } as Message]
        setMessages(newMessages)
        setLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    user_id: userData?.id,
                    conversation_id: currentConversationId,
                    user_location: userLocation,
                    location_name: locationName
                })
            })

            const data = await response.json()

            if (data.status === 'success' || data.status === 'warning') {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }])

                // If a new conversation was started, update state and refresh list
                if (data.conversation_id && data.conversation_id !== currentConversationId) {
                    setCurrentConversationId(data.conversation_id)
                    loadConversations()
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response || "Something went wrong." }])
            }
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
        } finally {
            setLoading(false)
        }
    }

    // Don't render anything if no user is logged in (optional, or just show login prompt inside)
    if (!userData) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-20 right-0 w-80 sm:w-96 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Bot size={18} className="text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-white leading-none">Smart Assistant</h3>
                                    <span className="text-[10px] text-white/70">Connected • Secure</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={clsx("p-1.5 rounded-lg transition-colors", showHistory ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10")}
                                    title="History"
                                >
                                    <History size={18} />
                                </button>
                                <button
                                    onClick={startNewChat}
                                    className="p-1.5 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                                    title="New Chat"
                                >
                                    <Plus size={18} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/70 hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex overflow-hidden relative bg-slate-900/95">

                            {/* History Sidebar Overlay */}
                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -100, opacity: 0 }}
                                        className="absolute inset-y-0 left-0 w-2/3 bg-slate-800/95 backdrop-blur-md border-r border-white/10 z-20 flex flex-col"
                                    >
                                        <div className="p-3 border-b border-white/10 font-medium text-xs text-gray-400 uppercase tracking-wider">
                                            Recent Conversations
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                            {conversations.length === 0 ? (
                                                <div className="text-center text-gray-500 text-xs py-4">No history yet</div>
                                            ) : (
                                                conversations.map(conv => (
                                                    <button
                                                        key={conv.id}
                                                        onClick={() => loadChat(conv.id)}
                                                        className={clsx(
                                                            "w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 truncate border border-transparent",
                                                            currentConversationId === conv.id
                                                                ? "bg-blue-600/20 text-blue-200 border-blue-500/30"
                                                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                                                        )}
                                                    >
                                                        <MessageCircle size={14} className="shrink-0 opacity-70" />
                                                        <span className="truncate">{conv.title || 'Untitled Conversation'}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2 opacity-50">
                                        <Bot size={32} />
                                        <p>Start a new conversation...</p>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <div key={i} className={clsx("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                        <div className={clsx(
                                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/10",
                                            msg.role === 'user' ? "bg-green-600" : "bg-blue-600"
                                        )}>
                                            {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                        </div>
                                        <div className={clsx(
                                            "max-w-[85%] p-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm overflow-hidden",
                                            msg.role === 'user'
                                                ? "bg-green-600/20 text-green-50 border border-green-600/30 rounded-tr-none"
                                                : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-none"
                                        )}>
                                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 animate-pulse">
                                            <Bot size={14} />
                                        </div>
                                        <div className="bg-white/5 p-2.5 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2 text-gray-400 text-xs italic">
                                            <Loader2 size={12} className="animate-spin" />
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-slate-900 border-t border-white/10 shrink-0">
                            <div className="flex gap-2 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    // Use onKeyDown to handle functional keys better than onKeyPress
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about charging, solar, or bookings..."
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pr-12 placeholder:text-gray-600"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all duration-300 border border-white/10",
                    isOpen ? "bg-red-500 rotate-90" : "bg-gradient-to-tr from-blue-600 to-green-600 hover:shadow-blue-500/50"
                )}
            >
                {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white" />}
            </motion.button>
        </div>
    )
}
