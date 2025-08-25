import { useState } from "react";
import api from "../api";

export default function Deposit({ userId, onDone }){
  const [amt,setAmt]=useState("");
  const [msg,setMsg]=useState("");
  const submit=async(e)=>{
    e.preventDefault();
    try{
      const res = await api.post("/transactions/deposit",{ user_id: userId, amount: Number(amt) });
      setMsg(JSON.stringify(res.data, null, 2));
      onDone && onDone();
    }catch(err){ setMsg(err.response?.data?.detail || "Error"); }
  }
  return (
    <div className="card">
      <h3>Deposit</h3>
      <form onSubmit={submit}>
        <input placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)} />
        <div style={{height:8}} />
        <button>Deposit</button>
      </form>
      <pre className="small">{msg}</pre>
    </div>
  );
}
