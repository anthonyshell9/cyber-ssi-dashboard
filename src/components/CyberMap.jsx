import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './CyberMap.css';

// Correction des icônes Leaflet par défaut (bug connu avec React)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Dictionnaire de coordonnées pour la démo (Simulation Geocoding)
const COORDS = {
  "France": [46.603354, 1.888334],
  "USA": [37.09024, -95.712891],
  "Allemagne": [51.165691, 10.451526],
  "Chine": [35.86166, 104.195397],
  "Royaume-Uni": [55.378051, -3.435973],
  "Irlande": [53.1424, -7.6921],
  "Russie": [61.52401, 105.318756],
  "Japon": [36.204824, 138.252924],
  "Suisse": [46.8182, 8.2275],
  // Fallback (Océan Atlantique)
  "Inconnu": [25, -40] 
};

const CyberMap = ({ fournisseurs }) => {
  
  // Fonction pour trouver la position approximative
  const getPosition = (f) => {
    // On cherche si le champ "Zone" ou "Hébergement" contient un nom de pays
    const text = (f.zoneIntervention + " " + f.hebergementDonnees + " " + f.pays).toLowerCase();
    
    if (text.includes("usa") || text.includes("états-unis")) return COORDS["USA"];
    if (text.includes("allemagne")) return COORDS["Allemagne"];
    if (text.includes("chine")) return COORDS["Chine"];
    if (text.includes("uk") || text.includes("royaume-uni")) return COORDS["Royaume-Uni"];
    if (text.includes("irlande")) return COORDS["Irlande"];
    if (text.includes("russie")) return COORDS["Russie"];
    if (text.includes("japon")) return COORDS["Japon"];
    if (text.includes("suisse")) return COORDS["Suisse"];
    
    // Par défaut, on met en France pour la démo si rien n'est trouvé
    // (Ajout d'un petit décalage aléatoire pour ne pas empiler les marqueurs)
    const base = COORDS["France"];
    return [base[0] + (Math.random() - 0.5) * 4, base[1] + (Math.random() - 0.5) * 4];
  };

  return (
    <div className="map-wrapper no-print">
      <h3 className="map-title">🌍 Cartographie des Flux de Données</h3>
      <div className="map-container-border">
        <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          {/* Fond de carte "Dark Matter" pour le style Cyber */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {fournisseurs.map((f) => (
            <Marker key={f.id} position={getPosition(f)}>
              <Popup>
                <div className="map-popup">
                  <strong>{f.nomFournisseur}</strong><br/>
                  Score: {f.niveauConfiance}/5<br/>
                  <span className={f.status === 'validé' ? 'ok' : 'ko'}>
                    {f.status === 'validé' ? 'Sécurisé' : 'En attente'}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CyberMap;