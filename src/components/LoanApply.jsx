import { useState } from "react";
import api from "../api";

export default function LoanApply({ userId }){
  const [amount,setAmount]=useState("");
  const [rate,setRate]=useState("12");
  const [months,setMonths]=useState("12");
  const [emi,setEmi]=useState("");
  const [msg,setMsg]=useState("");

  const calc = async ()=>{
    try{
      const r = await api.post("/loans/emi-calc",{ amount:Number(amount), annual_rate:Number(rate), months:Number(months) });
      setEmi(r.data.emi);
    }catch{ setEmi(""); }
  };

  const apply = async (e)=>{
    e.preventDefault();
    try{
      const r = await api.post("/loans/apply",{ user_id:userId, amount:Number(amount), annual_rate:Number(rate), months:Number(months) });
      setMsg(JSON.stringify(r.data,null,2));
    }catch(err){ setMsg(err.response?.data?.detail || "Error"); }
  };

  return (
    <div className="card">
      <h3>Loan Apply</h3>
      <form onSubmit={apply} className="row">
        <div><input placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} /></div>
        <div><input placeholder="APR %" value={rate} onChange={e=>setRate(e.target.value)} /></div>
        <div><input placeholder="Months" value={months} onChange={e=>setMonths(e.target.value)} /></div>
        <div><button type="button" onClick={calc}>Calc EMI</button></div>
        <div><button type="submit">Apply</button></div>
      </form>
      {emi && <div className="small">EMI ≈ ₹{emi}</div>}
      <pre className="small">{msg}</pre>
    </div>
  );
}
