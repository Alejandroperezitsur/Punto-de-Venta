import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Footer } from '../components/layout/Footer';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArrowUp, Clock, Loader, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export function Roadmap() {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api('/roadmap').then(setFeatures).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleVote = async (feature_name) => {
        try {
            await api('/roadmap/vote', { method: 'POST', body: JSON.stringify({ feature_name }) });
            setFeatures(prev => prev.map(f =>
                f.feature_name === feature_name ? { ...f, votes: f.votes + 1 } : f
            ));
        } catch (e) {
            alert('Error al votar');
        }
    };

    const StatusColumn = ({ title, status, items, icon: Icon, color }) => (
        <Card className="p-5">
            <h3 className={cn('font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider', color)}>
                <Icon className="size-4" />
                {title}
                <Badge size="xs" variant="neutral">{items.length}</Badge>
            </h3>
            <div className="space-y-3">
                {items.map(f => (
                    <div key={f.feature_name} className="p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-border/40 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-sm text-foreground">{f.feature_name}</h4>
                            <Badge size="xs" variant="neutral">{f.votes} votos</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{f.description}</p>
                        {status === 'planned' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVote(f.feature_name)}
                                className="w-full mt-3"
                            >
                                <ArrowUp className="size-3 mr-1" />
                                Votar
                            </Button>
                        )}
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-xs text-muted-foreground/60 text-center italic py-4">Nada por aqui...</p>
                )}
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border-subtle bg-bg-surface sticky top-0 z-[var(--z-sticky)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-primary">POS Pro</Link>
                    <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Volver</Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-foreground">Roadmap Publico</h1>
                    <p className="text-muted-foreground mt-2">Ayudanos a decidir que construir despues.</p>
                </div>

                {loading ? (
                    <div className="text-center text-muted-foreground py-12">
                        <Loader className="size-6 animate-spin mx-auto mb-2" />
                        Cargando...
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        <StatusColumn
                            title="Planeado"
                            status="planned"
                            items={features.filter(f => f.status === 'planned')}
                            icon={Clock}
                            color="text-muted-foreground"
                        />
                        <StatusColumn
                            title="En Progreso"
                            status="in_progress"
                            items={features.filter(f => f.status === 'in_progress')}
                            icon={Loader}
                            color="text-info"
                        />
                        <StatusColumn
                            title="Completado"
                            status="completed"
                            items={features.filter(f => f.status === 'completed')}
                            icon={CheckCircle2}
                            color="text-success"
                        />
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
