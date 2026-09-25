import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { api } from "../api/client.js";

export default function DemandMap() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.demandMap().then((res) => {
      setBlocks(res.blocks);
      setLoading(false);
    });
  }, []);

  const center = blocks.length ? [blocks[0].lat, blocks[0].lng] : [26.45, 80.9];

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <button className="back" onClick={() => navigate("/")}>← Home</button>
        <span className="brand">SkillCall — Demand Map</span>
        <span />
      </div>
      <div className="nav-tabs">
        <Link to="/officer">Cases</Link>
        <Link to="/map" className="active-tab">Demand Map</Link>
      </div>
      <div className="screen">
        <div className="banner-demo">Demo/sample block-wise demand data — illustrative only, not official statistics</div>
        <h1>Skill Demand by Block</h1>

        {loading && <p className="muted">Loading map data...</p>}

        {!loading && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <MapContainer center={center} zoom={9} style={{ height: 400, width: "100%" }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {blocks.map((b) => (
                <CircleMarker
                  key={b.block}
                  center={[b.lat, b.lng]}
                  radius={Math.max(10, Math.min(30, b.total / 4))}
                  pathOptions={{ color: "#1a7f5a", fillColor: "#1a7f5a", fillOpacity: 0.45 }}
                >
                  <Popup>
                    <strong>{b.block}</strong>
                    <br />Total demand (demo): {b.total}
                    <ul style={{ paddingLeft: 16, margin: "6px 0 0" }}>
                      {Object.entries(b.demand).map(([occ, count]) => (
                        <li key={occ}>{occ}: {count}</li>
                      ))}
                    </ul>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {blocks.map((b) => (
            <div className="card" key={b.block}>
              <h3>{b.block}</h3>
              <p className="muted">Total demand (demo): {b.total}</p>
              <div className="grid-2" style={{ marginTop: 8 }}>
                {Object.entries(b.demand).map(([occ, count]) => (
                  <div key={occ} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">{occ}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
