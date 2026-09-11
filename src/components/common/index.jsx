import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtDate, uid, MN } from "../../utils/helpers";

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
const Card = ({ children, style={}, onClick, glow }) => (
  <div onClick={onClick} className={onClick?"":""}
    style={{ background:T.card, border:`1px solid ${glow?T.gold+"55":T.border}`,
      borderRadius:18, padding:18, boxShadow:glow?`0 0 20px ${T.goldGlow}`:"none",
      cursor:onClick?"pointer":"default", transition:"all 0.2s", ...style }}>
    {children}
  </div>
);

const Pill = ({ label, color=T.gold }) => (
  <span style={{ display:"inline-flex", alignItems:"center", background:color+"1A",
    color, fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99,
    letterSpacing:"0.4px", whiteSpace:"nowrap" }}>
    {label}
  </span>
);

const GoldButton = ({ label, icon, onClick, full, sm, variant="primary", style={} }) => {
  const isPrimary = variant==="primary";
  const isOutline = variant==="outline";
  const isDanger  = variant==="danger";
  const isGhost   = variant==="ghost";
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      width:full?"100%":"auto",
      background: isPrimary?`linear-gradient(135deg,${T.goldL},${T.goldD})`
                : isDanger?T.red+"22"
                : isGhost?"transparent"
                : "transparent",
      color: isPrimary?T.bg : isDanger?T.redL : isGhost?T.text2 : T.goldL,
      border: isOutline?`1.5px solid ${T.gold}` : isDanger?`1px solid ${T.red}44` : "none",
      borderRadius:14, padding: sm?"10px 18px":"14px 22px",
      fontSize:sm?13:15, fontWeight:600, letterSpacing:"0.2px",
      transition:"all 0.2s", ...style }}>
      {icon && <Ic n={icon} s={sm?15:17} c={isPrimary?T.bg:isDanger?T.redL:isGhost?T.text2:T.goldL}/>}
      {label}
    </button>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder, textarea, options, rows=3, required, note }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      {label && <span style={{ fontSize:12, color:T.text2, fontWeight:500, letterSpacing:"0.3px" }}>{label}{required&&<span style={{color:T.gold}}> *</span>}</span>}
      {note && <span style={{ fontSize:11, color:T.text3 }}>{note}</span>}
    </div>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
          padding:"12px 14px", color:T.text, fontSize:14 }}>
        {options.map(o => typeof o==="object"
          ? <option key={o.value} value={o.value}>{o.label}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    ) : textarea ? (
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
          padding:"12px 14px", color:T.text, fontSize:14, resize:"vertical" }}/>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12,
          padding:"12px 14px", color:T.text, fontSize:14 }}/>
    )}
  </div>
);

const DatePicker = ({ label, value, onChange, required }) => {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value+"T12:00:00") : null;
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()||new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()||new Date().getMonth());
  const DAYS = ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];
  const getDaysInMonth = (m,y) => new Date(y,m+1,0).getDate();
  const getFirstDay    = (m,y) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };
  const cells = Array(getFirstDay(viewMonth,viewYear)).fill(null)
    .concat(Array.from({length:getDaysInMonth(viewMonth,viewYear)},(_,i)=>i+1));
  while(cells.length%7!==0) cells.push(null);
  const selDay   = parsed?.getDate();
  const selMonth = parsed?.getMonth();
  const selYear  = parsed?.getFullYear();
  const isSelected = (d) => d===selDay && viewMonth===selMonth && viewYear===selYear;
  const isToday    = (d) => {
    const n=new Date(); return d===n.getDate()&&viewMonth===n.getMonth()&&viewYear===n.getFullYear();
  };
  const prevM = () => { if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const nextM = () => { if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };
  const pick  = (d) => {
    const mm = String(viewMonth+1).padStart(2,"0");
    const dd = String(d).padStart(2,"0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };
  const display = parsed
    ? `${parsed.getDate()} ${MN[parsed.getMonth()]} ${parsed.getFullYear()}`
    : "Tarih seç";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <span style={{ fontSize:12, color:T.text2, fontWeight:500 }}>{label}{required&&<span style={{color:T.gold}}> *</span>}</span>}
      <button onClick={()=>setOpen(o=>!o)}
        style={{ background:T.card2, border:`1px solid ${open?T.gold:T.border}`, borderRadius:12,
          padding:"12px 14px", color:parsed?T.text:T.text3, fontSize:14, textAlign:"left",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>{display}</span>
        <Ic n="calendar" s={16} c={T.text3}/>
      </button>
      {open && (
        <div className="fade-in" style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:16, padding:16, marginTop:4 }}>
          {/* Nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={prevM} style={{ background:T.card2, border:`1px solid ${T.border}`,
              borderRadius:99, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="back" s={15} c={T.text}/>
            </button>
            <div style={{ textAlign:"center" }}>
              <span style={{ fontFamily:"Playfair Display", fontSize:16, fontWeight:600, color:T.goldL }}>
                {MN[viewMonth]} {viewYear}
              </span>
            </div>
            <button onClick={nextM} style={{ background:T.card2, border:`1px solid ${T.border}`,
              borderRadius:99, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="back" s={15} c={T.text} style={{transform:"rotate(180deg)"}}/>
            </button>
          </div>
          {/* Gün başlıkları */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
            {DAYS.map(d=><div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:T.text3, padding:"3px 0" }}>{d}</div>)}
          </div>
          {/* Günler */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d,i)=> !d ? <div key={i}/> : (
              <button key={i} onClick={()=>pick(d)}
                style={{ aspectRatio:"1", borderRadius:8,
                  background:isSelected(d)?T.gold:isToday(d)?T.gold+"22":"transparent",
                  border:`1px solid ${isSelected(d)?T.gold:isToday(d)?T.gold+"44":"transparent"}`,
                  color:isSelected(d)?T.bg:isToday(d)?T.goldL:T.text,
                  fontSize:13, fontWeight:isSelected(d)||isToday(d)?700:400 }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const BottomSheet = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
    {/* Backdrop */}
    <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}/>
    {/* Modal Box */}
    <div className="modal-pop" style={{
      position:"relative", zIndex:1,
      background:T.surface,
      borderRadius:24,
      border:`1px solid ${T.border}`,
      boxShadow:`0 24px 64px rgba(0,0,0,0.85), inset 0 1px 0 ${T.gold}22`,
      maxWidth:440, width:"100%",
      maxHeight:"88vh", overflowY:"auto",
      display:"flex", flexDirection:"column",
      paddingBottom:24
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, background:T.surface, zIndex:10, borderRadius:"24px 24px 0 0" }}>
        <span style={{ fontFamily:"Playfair Display", fontSize:19, fontWeight:700, color:T.goldL }}>{title}</span>
        <button onClick={onClose} style={{ background:T.card2, border:`1px solid ${T.border}`,
          borderRadius:99, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n="close" s={15} c={T.text2}/>
        </button>
      </div>
      <div style={{ padding:"18px 20px 0" }}>{children}</div>
    </div>
  </div>
);

const EmptyState = ({ icon, title, sub, action, onAction }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"56px 24px", gap:16 }}>
    <div style={{ background:T.card2, borderRadius:99, padding:24 }}>
      <Ic n={icon} s={32} c={T.text3}/>
    </div>
    <div style={{ textAlign:"center" }}>
      <div style={{ fontFamily:"Playfair Display", fontSize:18, color:T.text2, marginBottom:8 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:T.text3, lineHeight:1.6 }}>{sub}</div>}
    </div>
    {action && <GoldButton label={action} onClick={onAction} icon="plus" sm/>}
  </div>
);

const PageHeader = ({ title, sub, action, onAction, actionLabel }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    padding:"20px 20px 16px", borderBottom:`1px solid ${T.border}`, marginBottom:20 }}>
    <div>
      <h1 style={{ fontFamily:"Playfair Display", fontSize:26, fontWeight:600, color:T.goldL, lineHeight:1.1 }}>{title}</h1>
      {sub && <p style={{ fontSize:13, color:T.text3, marginTop:5 }}>{sub}</p>}
    </div>
    {action && <GoldButton label={actionLabel||"Ekle"} icon="plus" onClick={onAction} sm/>}
  </div>
);

const Divider = ({label}) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, margin:"8px 0" }}>
    <div style={{ flex:1, height:1, background:T.border }}/>
    {label && <span style={{ fontSize:11, color:T.text3, fontWeight:500, letterSpacing:"0.5px" }}>{label}</span>}
    <div style={{ flex:1, height:1, background:T.border }}/>
  </div>
);

// ─── LOGO ────────────────────────────────────────────────────────────────────
const Logo = ({ compact }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
    <div style={{ display:"flex", alignItems:"baseline", gap:compact?1:2 }}>
      <span style={{ fontFamily:"Playfair Display", fontSize:compact?20:24, fontWeight:700,
        color:T.goldL, letterSpacing:compact?1.5:2, lineHeight:1 }}>Omni</span>
      <span style={{ fontFamily:"Inter", fontSize:compact?19:23, fontWeight:800,
        color:T.gold, letterSpacing:compact?1:1.5, lineHeight:1 }}>Cod</span>
    </div>
    <div style={{ height:1.5, background:`linear-gradient(90deg,${T.gold},${T.gold}00)`, width:"80%" }}/>
  </div>
);

export { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo };
