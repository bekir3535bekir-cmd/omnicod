import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtDate, uid, MN } from "../../utils/helpers";

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
const Card = ({ children, style={}, onClick, glow }) => (
  <div onClick={onClick}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${T.gold}18 0%, rgba(255,255,255,0.02) 100%)`
        : (T.glassCard || T.card),
      backdropFilter: T.glassBlur || "blur(24px) saturate(180%)",
      WebkitBackdropFilter: T.glassBlur || "blur(24px) saturate(180%)",
      border: `1px solid ${glow ? T.gold+"66" : T.border}`,
      borderRadius: 20,
      padding: 18,
      boxShadow: glow
        ? `0 0 25px ${T.goldGlow}, inset 0 1px 1px rgba(255,255,255,0.2)`
        : `0 12px 32px -8px rgba(0,0,0,0.65), inset 0 1px 1px 0 rgba(255,255,255,0.16), inset 0 -1px 1px 0 rgba(0,0,0,0.4)`,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      ...style
    }}>
    {children}
  </div>
);

const Pill = ({ label, color=T.gold }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    background: color === T.gold ? "rgba(245, 166, 35, 0.12)" : color + "1E",
    color,
    border: `1px solid ${color}33`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    fontSize: 11, fontWeight: 600, padding: "3.5px 11px", borderRadius: 99,
    letterSpacing: "0.3px", whiteSpace: "nowrap"
  }}>
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
      background: isPrimary
        ? `linear-gradient(135deg, ${T.goldL} 0%, ${T.gold} 50%, ${T.goldD} 100%)`
        : isDanger ? "rgba(255, 69, 58, 0.14)"
        : isGhost ? "transparent"
        : "rgba(255, 255, 255, 0.04)",
      color: isPrimary ? "#000000" : isDanger ? T.redL : isGhost ? T.text2 : T.goldL,
      border: isOutline ? `1.5px solid ${T.gold}` : isDanger ? `1px solid ${T.red}44` : isPrimary ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${T.border}`,
      boxShadow: isPrimary ? `0 8px 24px -4px ${T.gold}50, inset 0 1px 1px rgba(255,255,255,0.6)` : isOutline ? `inset 0 1px 1px rgba(255,255,255,0.1)` : "none",
      borderRadius: 16,
      padding: sm ? "10px 18px" : "14px 22px",
      fontSize: sm ? 13 : 15,
      fontWeight: 600,
      letterSpacing: "0.2px",
      backdropFilter: !isPrimary ? "blur(16px)" : "none",
      WebkitBackdropFilter: !isPrimary ? "blur(16px)" : "none",
      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      ...style
    }}>
      {icon && <Ic n={icon} s={sm?15:17} c={isPrimary?"#000000":isDanger?T.redL:isGhost?T.text2:T.goldL}/>}
      {label}
    </button>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder, textarea, options, rows=3, required, note }) => {
  const inputStyle = {
    background: "rgba(255, 255, 255, 0.035)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${T.border}`,
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
    borderRadius: 14,
    padding: "12px 14px",
    color: T.text,
    fontSize: 14,
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s"
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {label && <span style={{ fontSize:12, color:T.text2, fontWeight:500, letterSpacing:"0.3px" }}>{label}{required&&<span style={{color:T.gold}}> *</span>}</span>}
        {note && <span style={{ fontSize:11, color:T.text3 }}>{note}</span>}
      </div>
      {options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} style={inputStyle}>
          {options.map(o => typeof o==="object"
            ? <option key={o.value} value={o.value}>{o.label}</option>
            : <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ ...inputStyle, resize:"vertical" }}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>
      )}
    </div>
  );
};

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
    <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}/>
    {/* Modal Box */}
    <div className="modal-pop" style={{
      position:"relative", zIndex:1,
      background:"linear-gradient(145deg, rgba(22, 22, 28, 0.94) 0%, rgba(14, 14, 18, 0.96) 100%)",
      backdropFilter:"blur(36px) saturate(200%)",
      WebkitBackdropFilter:"blur(36px) saturate(200%)",
      borderRadius:28,
      border:"1px solid rgba(255, 255, 255, 0.12)",
      boxShadow:"0 32px 80px rgba(0,0,0,0.95), inset 0 1px 1px rgba(255,255,255,0.22)",
      maxWidth:440, width:"100%",
      maxHeight:"88vh", overflowY:"auto",
      display:"flex", flexDirection:"column",
      paddingBottom:24
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`, position:"sticky", top:0, background:"transparent", zIndex:10, borderRadius:"28px 28px 0 0" }}>
        <span style={{ fontFamily:"Playfair Display", fontSize:19, fontWeight:700, color:T.goldL }}>{title}</span>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`,
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
        color:T.goldL, letterSpacing:compact?1.2:1.6, lineHeight:1 }}>Studyo</span>
      <span style={{ fontFamily:"Inter", fontSize:compact?19:23, fontWeight:800,
        color:T.gold, letterSpacing:compact?1:1.5, lineHeight:1 }}>App</span>
    </div>
    <div style={{ height:1.5, background:`linear-gradient(90deg,${T.gold},${T.gold}00)`, width:"80%" }}/>
  </div>
);

export { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo };
