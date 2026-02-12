// src/SupprimerClient.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";

export default function SupprimerClient() {
  const location = useLocation();
  const navigate = useNavigate();
  const client = location.state?.client;

  if (!client) navigate("/");

  const handleDelete = async () => {
    await deleteDoc(doc(db, "clients", client.id));
    navigate("/");
  };

  return (
    <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", display:"flex", justifyContent:"center", alignItems:"center", backgroundColor:"rgba(0,0,0,0.5)" }}>
      <div style={{ background:"white", padding:20, borderRadius:10, minWidth:300, textAlign:"center" }}>
        <h3>Voulez-vous vraiment supprimer {client.nom} ?</h3>
        <div style={{ display:"flex", justifyContent:"space-around", marginTop:20 }}>
          <button style={{ background:"#e74c3c", color:"white" }} onClick={handleDelete}>Supprimer</button>
          <button style={{ background:"#3498db", color:"white" }} onClick={() => navigate("/")}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
