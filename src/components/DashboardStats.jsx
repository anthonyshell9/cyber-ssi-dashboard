import React from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import './DashboardStats.css';

const DashboardStats = ({ fournisseurs }) => {
  if (!fournisseurs || fournisseurs.length === 0) return null;

  const total = fournisseurs.length;

  // CHART 1: Status pie chart
  const valid = fournisseurs.filter(f => f.status === 'validé').length;
  const waiting = fournisseurs.filter(f => f.status === 'en_attente').length;

  const dataStatus = [
    { name: 'Valides', value: valid },
    { name: 'En Attente', value: waiting },
  ];
  const STATUS_COLORS = ['#10b981', '#f59e0b'];

  // CHART 2: Confidence scores bar chart
  const dataScores = [
    { name: '1/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 1).length },
    { name: '2/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 2).length },
    { name: '3/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 3).length },
    { name: '4/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 4).length },
    { name: '5/5', count: fournisseurs.filter(f => Number(f.niveauConfiance) === 5).length },
  ];

  // CHART 3: Compliance overview donut (mock data for DORA since real data depends on other modules)
  const dataCompliance = [
    { name: 'Conforme', value: 60 },
    { name: 'Partiel', value: 25 },
    { name: 'Non-conforme', value: 15 },
  ];
  const COMPLIANCE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  // CHART 4: Risk distribution based on confidence scores
  const critical = fournisseurs.filter(f => Number(f.niveauConfiance) === 1).length;
  const high = fournisseurs.filter(f => Number(f.niveauConfiance) === 2).length;
  const medium = fournisseurs.filter(f => Number(f.niveauConfiance) === 3).length;
  const low = fournisseurs.filter(f => Number(f.niveauConfiance) >= 4).length;

  const dataRisk = [
    { name: 'Critique', count: critical, fill: '#ef4444' },
    { name: 'Eleve', count: high, fill: '#f97316' },
    { name: 'Moyen', count: medium, fill: '#f59e0b' },
    { name: 'Faible', count: low, fill: '#10b981' },
  ];

  // KPI computations
  const doraCompliance = total > 0 ? Math.round((valid / total) * 100) : 0;
  const isoCompliance = total > 0 ? Math.round((fournisseurs.filter(f => Number(f.niveauConfiance) >= 4).length / total) * 100) : 0;
  const needsReview = fournisseurs.filter(f => Number(f.niveauConfiance) <= 2 || f.status === 'en_attente').length;

  // CHART 5: Monthly trend (mock - simulated evolution over last 6 months)
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Fev'];
  const dataTrend = months.map((m, i) => ({
    month: m,
    dora: Math.min(100, 35 + i * 10 + Math.round(Math.random() * 5)),
    iso: Math.min(100, 25 + i * 12 + Math.round(Math.random() * 5)),
    confiance: Math.min(5, 2.5 + i * 0.4),
  }));

  // Vendors requiring attention
  const attentionVendors = fournisseurs
    .filter(f => Number(f.niveauConfiance) <= 2 || f.status === 'en_attente')
    .slice(0, 5);

  return (
    <div className="dashboard-stats-full no-print">

      {/* KPI ROW */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#06b6d4' }}>{doraCompliance}%</div>
          <div className="kpi-label">Conformite DORA</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>{isoCompliance}%</div>
          <div className="kpi-label">Conformite ISO 27001</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#f59e0b' }}>{needsReview}</div>
          <div className="kpi-label">A revoir</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: '#ef4444' }}>{critical + high}</div>
          <div className="kpi-label">Risque eleve</div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="stats-container">
        {/* CHART 1: Status */}
        <div className="chart-box">
          <h3>Etat du Parc</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dataStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Confidence scores */}
        <div className="chart-box">
          <h3>Niveaux de Confiance</h3>
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

        {/* CHART 3: Compliance overview */}
        <div className="chart-box">
          <h3>Conformite DORA</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataCompliance} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {dataCompliance.map((entry, index) => (
                    <Cell key={`comp-${index}`} fill={COMPLIANCE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Risk distribution */}
        <div className="chart-box">
          <h3>Distribution des Risques</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
                <Bar dataKey="count" name="Fournisseurs" radius={[4, 4, 0, 0]}>
                  {dataRisk.map((entry, index) => (
                    <Cell key={`risk-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 5: Trend + Attention section */}
      <div className="stats-container">
        <div className="chart-box">
          <h3>Evolution Conformite (6 mois)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius:'8px', border:'none'}} itemStyle={{color:'#fff'}} />
                <Legend />
                <Line type="monotone" dataKey="dora" name="DORA %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="iso" name="ISO 27001 %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendors requiring attention */}
        <div className="chart-box">
          <h3>Fournisseurs a surveiller</h3>
          <div className="attention-list">
            {attentionVendors.length === 0 ? (
              <div className="attention-empty">Aucun fournisseur critique.</div>
            ) : (
              attentionVendors.map((v, i) => (
                <div key={v.id || i} className="attention-row">
                  <div className="attention-name">{v.nomFournisseur || 'N/A'}</div>
                  <div className="attention-details">
                    <span className={`attention-score sc-${Number(v.niveauConfiance) <= 2 ? 'red' : 'yellow'}`}>
                      {v.niveauConfiance}/5
                    </span>
                    <span className={`status-pill-sm ${v.status === 'validé' ? 'ok-sm' : 'pending-sm'}`}>
                      {v.status === 'validé' ? 'ACTIF' : 'ATTENTE'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
