import React from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './DashboardStats.css';

const DashboardStats = ({ fournisseurs }) => {
  // Sécurité : si pas de données, on ne plante pas l'app
  if (!fournisseurs || fournisseurs.length === 0) return null;

  // DONNÉES 1 : CAMEMBERT (STATUTS)
  const valid = fournisseurs.filter(f => f.status === 'validé').length;
  const waiting = fournisseurs.filter(f => f.status === 'en_attente').length;
  
  const dataStatus = [
    { name: 'Validés', value: valid },
    { name: 'En Attente', value: waiting },
  ];
  const COLORS = ['#10b981', '#f59e0b'];

  // DONNÉES 2 : BARRES (SCORES)
  // On s'assure que niveauConfiance est traité comme un nombre
  const dataScores = [
    { name: '1/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 1).length },
    { name: '2/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 2).length },
    { name: '3/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 3).length },
    { name: '4/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 4).length },
    { name: '5/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 5).length },
  ];

  return (
    <div className="stats-container no-print">
      
      {/* GRAPHIQUE GAUCHE : STATUTS */}
      <div className="chart-box">
        <h3>📡 État du Parc</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dataStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPHIQUE DROITE : SCORES */}
      <div className="chart-box">
        <h3>📊 Niveaux de Confiance</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
              <Bar dataKey="count" name="Fournisseurs" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default DashboardStats;