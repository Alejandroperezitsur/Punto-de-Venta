import React, { useState } from 'react';
import { api } from '../../lib/api';

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api('/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'suggestion',
                    comment,
                    url: window.location.pathname
                })
            });
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setIsOpen(false);
                setComment('');
            }, 2000);
        } catch (e) {
            alert('Error enviando feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-white border text-gray-600 px-4 py-2 rounded-full shadow hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-all"
                >
                    💬 Feedback
                </button>
            )}

            {isOpen && (
                <div className="bg-white rounded-lg shadow-xl p-4 w-72 border animate-fadeUp">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800">Ayúdanos a mejorar</h4>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>
                    {sent ? (
                        <div className="text-green-600 text-center py-4">
                            ¡Gracias por tu opinión! 🙌
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <textarea
                                className="w-full border rounded p-2 text-sm mb-2 h-24"
                                placeholder="¿Qué te gustaría ver en Ventify?"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                autoFocus
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Enviar Sugerencia'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
