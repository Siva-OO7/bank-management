import { useState } from "react";
import api from "../api";

export default function Transfer({ userId, onDone }){
  const [to,setTo]=useState("");
  const [amt,setAmt]=useState("");
  const [msg,setMsg]=useState("");
  const submit=async(e)=>{
    e.preventDefault();
    try{
      const res = await api.post("/transactions/transfer",{ from_user_id: userId, to_user_id: to, amount: Number(amt) });
      setMsg(JSON.stringify(res.data, null, 2));
      onDone && onDone();
    }catch(err){ setMsg(err.response?.data?.detail || "Error"); }
  }
  return (
    <div className="card">
      <h3>Transfer</h3>
      <form onSubmit={submit}>
        <input placeholder="To user_id" value={to} onChange={e=>setTo(e.target.value)} />
        <div style={{height:8}} />
        <input placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)} />
        <div style={{height:8}} />
        <button>Send</button>
      </form>
      <pre className="small">{msg}</pre>
    </div>
  );
}
