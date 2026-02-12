import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNotification } from "../hooks/NotificationContext";
import "./DetailsFournisseur.css";

const DetailsFournisseur = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  // --- ÉTATS ---
  const [fournisseur, setFournisseur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");

  const [contacts, setContacts] = useState([]);
  const [audits, setAudits] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // --- FORMULAIRES ---
  // Note : newContact contient bien email et tel
  const [newContact, setNewContact] = useState({ nom: "", role: "", email: "", tel: "" });
  const [newAudit, setNewAudit] = useState({ type: "Audit Sécurité", date: "", resultat: "En attente" });
  const [newIncident, setNewIncident] = useState({ titre: "", gravite: "Majeur", statut: "En cours", impact: "", date: "" });

  // 1. CHARGEMENT
  useEffect(() => {
    const fetchFournisseur = async () => {
      const docSnap = await getDoc(doc(db, "fournisseurs", id));
      if (docSnap.exists()) setFournisseur(docSnap.data());
      setLoading(false);
    };
    fetchFournisseur();

    const qContacts = query(collection(db, "contacts"), where("fournisseurId", "==", id));
    const unsubContacts = onSnapshot(qContacts, (s) => setContacts(s.docs.map(d => ({id: d.id, ...d.data()}))));

    const qAudits = query(collection(db, "audits"), where("fournisseurId", "==", id));
    const unsubAudits = onSnapshot(qAudits, (s) => setAudits(s.docs.map(d => ({id: d.id, ...d.data()}))));

    const qIncidents = query(collection(db, "incidents"), where("fournisseurId", "==", id));
    const unsubIncidents = onSnapshot(qIncidents, (s) => setIncidents(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubContacts(); unsubAudits(); unsubIncidents(); };
  }, [id]);

  // 2. ACTIONS (HANDLERS)

  // AJOUT CONTACT (Avec Nom Fournisseur pour l'Annuaire)
  const handleAddContact = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "contacts"), { 
      ...newContact, 
      fournisseurId: id,
      nomFournisseur: fournisseur.nomFournisseur 
    });
    setNewContact({ nom: "", role: "", email: "", tel: "" });
    addNotification("success", "Nouveau contact ajouté à l'annuaire.");
  };

  // AJOUT AUDIT (Avec Nom Fournisseur pour le Planning)
  const handleAddAudit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "audits"), { 
      ...newAudit, 
      fournisseurId: id,
      nomFournisseur: fournisseur.nomFournisseur, 
      createdAt: serverTimestamp() 
    });
    setNewAudit({ type: "Audit Sécurité", date: "", resultat: "En attente" });
    addNotification("info", "Audit planifié dans le calendrier global.");
  };

  // AJOUT INCIDENT (Avec Date Manuelle + Nom Fournisseur pour la Crise)
  const handleAddIncident = async (e) => {
    e.preventDefault();
    const dateFinale = newIncident.date ? new Date(newIncident.date) : new Date();
    
    await addDoc(collection(db, "incidents"), { 
      titre: newIncident.titre,
      gravite: newIncident.gravite,
      statut: newIncident.statut,
      impact: newIncident.impact,
      fournisseurId: id,
      nomFournisseur: fournisseur.nomFournisseur, 
      dateDeclaration: dateFinale 
    });
    
    if (newIncident.gravite === "Critique") {
      addNotification("error", "🚨 ALERTE CRITIQUE TRANSMISE !");
    } else {
      addNotification("warning", "Incident enregistré.");
    }
    setNewIncident({ titre: "", gravite: "Majeur", statut: "En cours", impact: "", date: "" });
  };

  if (loading) return <div className="loader-screen"><div className="spinner"></div>Chargement...</div>;
  if (!fournisseur) return <div className="error-screen">Dossier introuvable.</div>;

  return (
    <div className="details-layout">
      
      {/* HEADER */}
      <header className="details-header">
        <div className="header-top">
           <button onClick={() => navigate('/gestion')} className="btn-back">← Retour</button>
           <div className="header-meta"><span className={`status-badge ${fournisseur.status}`}>{fournisseur.status === 'validé' ? '✅ HOMOLOGUÉ' : '⏳ EN EXAMEN'}</span></div>
        </div>
        <h1>{fournisseur.nomFournisseur}</h1>
        <p className="subtitle">{fournisseur.typePrestataire} • {fournisseur.email}</p>
        
        <div className="tabs-nav">
          <button className={activeTab==='general'?'active':''} onClick={()=>setActiveTab('general')}>🏢 Général</button>
          <button className={activeTab==='contacts'?'active':''} onClick={()=>setActiveTab('contacts')}>📇 Équipe ({contacts.length})</button>
          <button className={activeTab==='audits'?'active':''} onClick={()=>setActiveTab('audits')}>📅 Audits ({audits.length})</button>
          <button className={`tab-danger ${activeTab==='incidents'?'active':''}`} onClick={()=>setActiveTab('incidents')}>🚨 Incidents ({incidents.length})</button>
        </div>
      </header>

      <div className="details-content">
        
        {/* ONGLET 1 : GÉNÉRAL */}
        {activeTab === 'general' && (
          <div className="tab-panel fade-in">
             <div className="info-grid">
                <div className="card-glass"><h3>Scores</h3><div className="score-big" style={{color: Number(fournisseur.niveauConfiance) > 3 ? '#10b981' : '#f59e0b'}}>{fournisseur.niveauConfiance}/5</div></div>
                <div className="card-glass full-width"><h3>Mission</h3><p><strong>Service :</strong> {fournisseur.typeServiceMateriel}</p><p><strong>Données :</strong> {fournisseur.accesDonneesPersonnelles}</p></div>
             </div>
             <div className="actions-footer"><button onClick={() => navigate(`/modifier/${id}`)} className="btn-edit-large">✏️ Modifier</button></div>
          </div>
        )}

        {/* ONGLET 2 : CONTACTS (AVEC EMAIL ET TÉLÉPHONE) */}
        {activeTab === 'contacts' && (
          <div className="tab-panel fade-in">
             
             {/* Formulaire complet */}
             <form onSubmit={handleAddContact} className="add-form-row" style={{flexWrap: 'wrap', gap: '10px'}}>
               <input 
                 placeholder="Nom complet" 
                 value={newContact.nom} 
                 onChange={e=>setNewContact({...newContact, nom: e.target.value})} 
                 required 
                 style={{flex: '1 1 200px'}} 
               />
               <input 
                 placeholder="Rôle (ex: DSI)" 
                 value={newContact.role} 
                 onChange={e=>setNewContact({...newContact, role: e.target.value})} 
                 required 
                 style={{flex: '1 1 150px'}}
               />
               <input 
                 type="email"
                 placeholder="Email" 
                 value={newContact.email} 
                 onChange={e=>setNewContact({...newContact, email: e.target.value})} 
                 style={{flex: '1 1 200px'}}
               />
               <input 
                 type="tel"
                 placeholder="Tél" 
                 value={newContact.tel} 
                 onChange={e=>setNewContact({...newContact, tel: e.target.value})} 
                 style={{flex: '1 1 120px'}}
               />
               <button type="submit" className="btn-add" style={{flex: '0 0 auto'}}>Ajouter +</button>
             </form>

             {/* Liste des contacts */}
             <div className="contacts-grid">
               {contacts.map(c => (
                 <div key={c.id} className="contact-card">
                   <div className="contact-avatar">{c.nom.charAt(0)}</div>
                   <div className="contact-info">
                     <h4>{c.nom}</h4>
                     <span className="role-badge">{c.role}</span>
                     {c.email && <div style={{fontSize:'0.85rem', color:'#94a3b8', marginTop:'5px'}}>📧 {c.email}</div>}
                     {c.tel && <div style={{fontSize:'0.85rem', color:'#94a3b8'}}>📞 {c.tel}</div>}
                   </div>
                 </div>
               ))}
               {contacts.length === 0 && <p className="empty-msg">Aucun contact enregistré.</p>}
             </div>
          </div>
        )}

        {/* ONGLET 3 : AUDITS */}
        {activeTab === 'audits' && (
          <div className="tab-panel fade-in">
             <form onSubmit={handleAddAudit} className="add-form-row">
               <select value={newAudit.type} onChange={e=>setNewAudit({...newAudit, type: e.target.value})}><option>Audit Sécurité</option><option>Pentest</option><option>Conformité</option></select>
               <input type="date" value={newAudit.date} onChange={e=>setNewAudit({...newAudit, date: e.target.value})} required />
               <button type="submit" className="btn-add">Planifier +</button>
             </form>
             <table className="cyber-table-details">
               <thead><tr><th>Date</th><th>Type</th><th>Résultat</th></tr></thead>
               <tbody>{audits.map(a => (<tr key={a.id}><td>{a.date}</td><td>{a.type}</td><td className={a.resultat.includes('Non')?'text-red':'text-green'}>{a.resultat}</td></tr>))}</tbody>
             </table>
          </div>
        )}

        {/* ONGLET 4 : INCIDENTS */}
        {activeTab === 'incidents' && (
          <div className="tab-panel fade-in">
             <div className="alert-banner-info">Déclarez ici les incidents de sécurité.</div>
             <form onSubmit={handleAddIncident} className="add-form-block">
               <div className="form-row">
                 <input placeholder="Titre incident" value={newIncident.titre} onChange={e=>setNewIncident({...newIncident, titre: e.target.value})} required style={{flex: 2}} />
                 <input type="datetime-local" value={newIncident.date} onChange={e=>setNewIncident({...newIncident, date: e.target.value})} style={{flex: 1, background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px'}} />
                 <select value={newIncident.gravite} onChange={e=>setNewIncident({...newIncident, gravite: e.target.value})}><option>Majeur</option><option value="Critique">🔥 CRITIQUE</option></select>
                 <select value={newIncident.statut} onChange={e=>setNewIncident({...newIncident, statut: e.target.value})}><option>En cours</option><option>Résolu</option></select>
               </div>
               <button type="submit" className="btn-add-danger">DÉCLARER 🚨</button>
             </form>
             <div className="incidents-list">{incidents.map(inc => (<div key={inc.id} className={`incident-item ${inc.gravite}`}><h4>{inc.titre}</h4><span className="inc-date">{inc.dateDeclaration?.seconds ? new Date(inc.dateDeclaration.seconds * 1000).toLocaleString() : new Date(inc.dateDeclaration).toLocaleString()}</span></div>))}</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DetailsFournisseur;