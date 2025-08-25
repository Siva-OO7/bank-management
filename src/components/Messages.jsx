import { useEffect, useState } from "react";
import api from "../api";

export default function Messages({ userId }){
  const [items,setItems]=useState([]);
  const load = async ()=>{
    if(!userId) return setItems([]);
    try{
      const r = await api.get(`/messages/${userId}`);
      setItems(r.data.messages||[]);
    }catch{ setItems([]); }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[userId]);
  return (
    <div className="card">
      <h3>Messages</h3>
      {items.length===0 && <div className="small">No messages yet.</div>}
      {items.map(m=>(
        <div key={m._id} className="small">
          {new Date(m.created_at).toLocaleString()} — {m.text}
        </div>
      ))}
    </div>
  );
}
