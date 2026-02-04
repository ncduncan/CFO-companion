import React, { useState, useRef, useEffect } from 'react';
import { AppData } from '../types';
import { Card } from '../components/ui/Card';
import { ChatMessage, sendMessageToGemini } from '../services/aiService';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface AnalystChatProps {
    data: AppData;
    apiKey: string;
}

export const AnalystChat: React.FC<AnalystChatProps> = ({ data, apiKey }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello, I'm your FP&A Analyst. I've reviewed the latest numbers from the Working Plan. Ask me about variances, profitability, or benchmark comparisons.",
            timestamp: new Date()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Call API
        // We pass the history *excluding* the very last user message because the service appends it? 
        // Actually the service expects history + we constructed it differently.
        // Let's pass valid history. The service currently dumps everything. 
        // Optimization: Just pass the new history.

        // Note: My service wrapper constructed the prompt nicely. simple list.
        // I should pass "prev" messages to the service, and the service handles system prompt.
        // Actually, I need to pass the FULL history including the new user message to the service conceptually 
        // OR the service takes "History" and "Current Input"? 
        // Data Structure: history is `ChatMessage[]`. 
        // Let's pass the updated list inclusive of `userMsg`.

        const replyText = await sendMessageToGemini([...messages, userMsg], data, apiKey);

        const botMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: replyText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-white shadow-xl border-t-4 border-t-purple-600">

                {/* Header */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">AI Financial Analyst</h3>
                            <p className="text-xs text-slate-500">Expert Agent • Working Plan Context</p>
                        </div>
                    </div>
                    {!apiKey && (
                        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            API Key Missing in Settings
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 mt-1">
                                    <Bot size={16} />
                                </div>
                            )}

                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                    }`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div className="markdown-prose space-y-2">
                                        {/* Simple rendering of newlines as paragraphs for now */}
                                        {msg.content.split('\n').map((line, i) => (
                                            <p key={i} className="min-h-[1em]">{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                                <div className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-purple-100' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-600 mt-1">
                                    <User size={16} />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 mt-1">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={apiKey ? "Ask about variance, trends, or profitability..." : "Please set API Key first..."}
                            disabled={!apiKey || isLoading}
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!apiKey || !input.trim() || isLoading}
                            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {["Why are we missing budget?", "Compare R&D Spend to benchmarks", "Profit Walk Q1 vs Q2"].map(q => (
                            <button
                                key={q}
                                onClick={() => setInput(q)}
                                className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

            </Card>

            {/* Context Panel (Optional Sidekick) */}
            <div className="w-80 flex flex-col gap-4">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-yellow-400" />
                        Analyst Capabilities
                    </h4>
                    <ul className="text-xs space-y-2 text-slate-300">
                        <li>• Deep Variance Analysis</li>
                        <li>• Plan Comparison (Base vs Actuals)</li>
                        <li>• SaaS Benchmarking ($100M Scale)</li>
                        <li>• Profit Walking & EBITDA Bridge</li>
                    </ul>
                </Card>

                <Card title="Current Context">
                    <div className="text-xs space-y-3">
                        <div>
                            <span className="block text-slate-400">Active Plan</span>
                            <span className="font-semibold text-slate-700">{data.plans.find(p => p.isWorkingPlan)?.name || "None"}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400">Dataset</span>
                            <span className="font-semibold text-slate-700">{data.records.length} Records</span>
                        </div>
                        <div>
                            <span className="block text-slate-400">Last Update</span>
                            <span className="font-semibold text-slate-700">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
