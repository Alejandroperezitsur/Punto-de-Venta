import React from 'react';

export default function EnterpriseReports() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Reportes Enterprise</h1>
            <p className="text-gray-500 mb-6">Consolidado de múltiples sucursales (Feature Preview).</p>

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-8 mb-8">
                <h2 className="text-xl font-bold mb-2">Ventas Globales</h2>
                <div className="text-4xl font-bold">$1,250,500.00 MXN</div>
                <div className="text-sm text-gray-400 mt-2">Mes actual • 5 Sucursales</div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded shadow border">
                    <h3 className="font-bold mb-4">Top Sucursales</h3>
                    <ul className="space-y-3">
                        <li className="flex justify-between border-b pb-2">
                            <span>Sucursal Centro</span>
                            <span className="font-bold">$450k</span>
                        </li>
                        <li className="flex justify-between border-b pb-2">
                            <span>Sucursal Norte</span>
                            <span className="font-bold">$320k</span>
                        </li>
                        <li className="flex justify-between border-b pb-2">
                            <span>Sucursal Sur</span>
                            <span className="font-bold">$280k</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded shadow border">
                    <h3 className="font-bold mb-4">Rendimiento por Región</h3>
                    <div className="h-40 flex items-center justify-center bg-gray-50 rounded text-gray-400">
                        [Gráfico de Mapa de Calor]
                    </div>
                </div>
            </div>
        </div>
    );
}
