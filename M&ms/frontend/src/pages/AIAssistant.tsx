import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Plus, MessageSquare, X } from 'lucide-react';
import { aiService, AiConversation, AiMessage } from '../services/ai.service';

const AIAssistant: React.FC = () => {
    const [conversations, setConversations] = useState<AiConversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<AiConversation | null>(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (currentConversation) {
            loadMessages(currentConversation.id);
        }
    }, [currentConversation]);

    useEffect(() => {
        if (messages.length > 0 && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const loadConversations = async () => {
        try {
            const data = await aiService.getConversations();
            setConversations(data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadMessages = async (id: number) => {
        try {
            const data = await aiService.getConversation(id);
            if (data.messages) {
                setMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateConversation = async () => {
        try {
            const newConv = await aiService.createConversation("New Chat");
            setConversations([newConv, ...conversations]);
            setCurrentConversation(newConv);
            setMessages([]);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteConversation = async (convId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await aiService.deleteConversation(convId);
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (currentConversation?.id === convId) {
                setCurrentConversation(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete conversation', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentConversation) return;

        const userMsg: AiMessage = {
            id: Date.now(),
            conversationId: currentConversation.id,
            role: 'user',
            content: input,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await aiService.sendMessage(currentConversation.id, userMsg.content);
            setMessages(prev => [...prev, response]);
        } catch (e) {
            console.error("Failed to send", e);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    conversationId: currentConversation.id,
                    role: 'assistant',
                    content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.",
                    createdAt: new Date().toISOString()
                }]);
            }, 1000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden">
            <div className="max-w-6xl mx-auto flex gap-6 p-4" style={{ height: 'calc(100vh - 80px)' }}>

                {/* Sidebar */}
                <div className="w-1/4 bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col">
                    <button
                        onClick={handleCreateConversation}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg mb-4 flex items-center justify-center space-x-2 transition"
                    >
                        <Plus size={20} />
                        <span>New Chat</span>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setCurrentConversation(conv)}
                                className={`p-3 rounded-lg cursor-pointer flex items-center space-x-3 transition group ${currentConversation?.id === conv.id ? 'bg-gray-700 border-l-4 border-rose-500' : 'hover:bg-gray-700/50'}`}
                            >
                                <MessageSquare size={18} className="text-gray-400 shrink-0" />
                                <span className="text-gray-200 truncate flex-1">{conv.title || 'Untitled Chat'}</span>
                                <button
                                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-400 transition shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden">
                    {currentConversation ? (
                        <>
                            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-rose-600 ml-3' : 'bg-blue-600 mr-3'}`}>
                                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                            </div>
                                            <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gray-700 text-white rounded-tr-none' : 'bg-gray-900 text-gray-200 rounded-tl-none'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-900 text-gray-400 p-4 rounded-2xl rounded-tl-none ml-11">
                                            Typing...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 bg-gray-700/30 border-t border-gray-700">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask me anything about Pong..."
                                        className="flex-1 bg-gray-900 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white p-3 rounded-lg transition"
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <Bot size={64} className="mb-4 opacity-20" />
                            <p className="text-xl">Select or create a conversation to start</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
