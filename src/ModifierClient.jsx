// src/ModifierClient.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "./db/firebase";
import { updateDoc, doc } from "firebase/firestore";

export default function ModifierClient() {
  const location = useLocation();
  const navigate = useNavigate();
  const client = location.state?.client || null;

  const [formData, setFormData] = useState({ nom: "", email: "", telephone: "", entreprise: "" });

  useEffect(() => {
    if (!client) navigate("/");
    else setFormData({ nom: client.nom, email: client.email, telephone: client.telephone, entreprise: client.entreprise });
  }, [client, navigate]);

  const handleUpdate = async () => {
    await updateDoc(doc(db, "clients", client.id), formData);
    navigate("/");
  };

  if (!client) return null;

  return (
    <div style={{ position: "fixed", top:0, left:0, width:"100%", height:"100%", display:"flex", justifyContent:"center", alignItems:"center", backgroundColor:"rgba(0,0,0,0.5)" }}>
      <div style={{ background:"white", padding:20, borderRadius:10, minWidth:300 }}>
        <h3>Modifier {client.nom}</h3>
        <input placeholder="Nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
        <input placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <input placeholder="Téléphone" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
        <input placeholder="Entreprise" value={formData.entreprise} onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })} />
        <div style={{ display:"flex", justifyContent:"space-around", marginTop:20 }}>
          <button style={{ background:"#27ae60", color:"white" }} onClick={handleUpdate}>Enregistrer</button>
          <button style={{ background:"#3498db", color:"white" }} onClick={() => navigate("/")}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
