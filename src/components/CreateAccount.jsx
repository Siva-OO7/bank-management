import { useState } from "react";
import api from "../api";

export default function CreateAccount({ userId, onCreated }){
  const [type,setType]=useState("savings");
  const [msg,setMsg]=useState("");
  const submit=async(e)=>{
    e.preventDefault();
    try{
      const res = await api.post("/accounts/create",{ user_id: userId, account_type: type });
      setMsg(JSON.stringify(res.data, null, 2));
      onCreated && onCreated();
    }catch(err){ setMsg(err.response?.data?.detail || "Error"); }
  };
  return (
    <div className="card">
      <h3>Create Account</h3>
      <form onSubmit={submit}>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="savings">savings</option>
          <option value="current">current</option>
        </select>
        <div style={{height:8}} />
        <button>Create</button>
      </form>
      <pre className="small">{msg}</pre>
    </div>
  );
}
