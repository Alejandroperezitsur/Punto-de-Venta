import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hola, soy Ventify AI. ¿En qué te ayudo hoy?' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = { role: 'user', text: query };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const res = await api('/ai/assistant', { method: 'POST', body: JSON.stringify({ query: userMsg.text }) });
            setMessages(prev => [...prev, { role: 'assistant', text: res.response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Lo siento, tuve un error procesando tu consulta.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-36 z-50">
            {/* right-36 to avoid collision with FeedbackWidget */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-indigo-700 flex items-center justify-center transition-all hover:scale-110"
                >
                    🤖
                </button>
            )}

            {isOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-80 h-96 border flex flex-col animate-fadeUp overflow-hidden">
                    <div className="bg-indigo-600 p-3 flex justify-between items-center text-white">
                        <h4 className="font-bold flex items-center gap-2">🤖 Ventify AI</h4>
                        <button onClick={() => setIsOpen(false)} className="hover:text-indigo-200">×</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-2 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-xs text-gray-400 text-center animate-pulse">Pensando...</div>}
                    </div>

                    <form onSubmit={handleSend} className="p-2 border-t bg-white">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="Escribe aquí..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={loading} className="text-indigo-600 font-bold px-2 disabled:opacity-50">→</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
