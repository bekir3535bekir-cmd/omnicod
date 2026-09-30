import React, { useState, useRef, useEffect } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtDate, uid, MN, daysLeft } from "../../utils/helpers";
import { CEKIM_CHECKLIST } from "../../constants/templates";

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

const GoldButton = ({ label, icon, onClick, full, sm, variant="primary", disabled, style={} }) => {
  const isPrimary = variant==="primary";
  const isOutline = variant==="outline";
  const isDanger  = variant==="danger";
  const isGhost   = variant==="ghost";
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      width:full?"100%":"auto",
      background: disabled
        ? "rgba(255, 255, 255, 0.08)"
        : isPrimary
        ? `linear-gradient(135deg, ${T.goldL} 0%, ${T.gold} 50%, ${T.goldD} 100%)`
        : isDanger ? "rgba(255, 69, 58, 0.14)"
        : isGhost ? "transparent"
        : "rgba(255, 255, 255, 0.04)",
      color: disabled ? T.text3 : isPrimary ? "#000000" : isDanger ? T.redL : isGhost ? T.text2 : T.goldL,
      border: disabled ? `1px solid ${T.border}` : isOutline ? `1.5px solid ${T.gold}` : isDanger ? `1px solid ${T.red}44` : isPrimary ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${T.border}`,
      boxShadow: disabled ? "none" : isPrimary ? `0 8px 24px -4px ${T.gold}50, inset 0 1px 1px rgba(255,255,255,0.6)` : isOutline ? `inset 0 1px 1px rgba(255,255,255,0.1)` : "none",
      borderRadius: 16,
      padding: sm ? "10px 18px" : "14px 22px",
      fontSize: sm ? 13 : 15,
      fontWeight: 600,
      letterSpacing: "0.2px",
      backdropFilter: !isPrimary ? "blur(16px)" : "none",
      WebkitBackdropFilter: !isPrimary ? "blur(16px)" : "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      ...style
    }}>
      {icon && <Ic n={icon} s={sm?15:17} c={disabled ? T.text3 : isPrimary?"#000000":isDanger?T.redL:isGhost?T.text2:T.goldL}/>}
      {label}
    </button>
  );
};

export const CustomSelect = ({ value, onChange, options, placeholder="Seçiniz..." }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Find label
  const selectedOption = (options || []).find(o => (typeof o === "object" ? o.value === value : o === value));
  const displayLabel = typeof selectedOption === "object"
    ? (selectedOption?.label || placeholder)
    : (selectedOption || value || placeholder);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${open ? T.goldL : T.border}`,
          boxShadow: open ? `0 0 0 2px ${T.gold}33, inset 0 1px 2px rgba(0,0,0,0.3)` : "inset 0 1px 2px rgba(0,0,0,0.3)",
          borderRadius: 14,
          padding: "12px 14px",
          color: displayLabel && displayLabel !== placeholder ? T.text : T.text3,
          fontSize: 14,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          textAlign: "left"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        <span style={{
          color: open ? T.goldL : T.text3,
          fontSize: 10,
          transition: "transform 0.2s ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          marginLeft: 8,
          display: "flex",
          alignItems: "center"
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "linear-gradient(145deg, rgba(26, 26, 34, 0.98) 0%, rgba(16, 16, 22, 0.98) 100%)",
          backdropFilter: "blur(32px) saturate(190%)",
          WebkitBackdropFilter: "blur(32px) saturate(190%)",
          border: `1.5px solid ${T.gold}44`,
          borderRadius: 16,
          boxShadow: "0 16px 40px rgba(0,0,0,0.9), 0 0 20px rgba(232, 197, 71, 0.15)",
          padding: "6px",
          maxHeight: 240,
          overflowY: "auto"
        }}>
          {(options || []).map((o, idx) => {
            const val = typeof o === "object" ? o.value : o;
            const lbl = typeof o === "object" ? o.label : o;
            const isSelected = val === value;
            const isEmptyChoice = !val && !lbl;

            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? T.goldL : T.text,
                  background: isSelected ? `${T.gold}22` : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  marginBottom: 2
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{isEmptyChoice ? "(Seçim Yapılmadı)" : lbl}</span>
                {isSelected && <span style={{ color: T.goldL, fontSize: 13, fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder, textarea, options, rows=3, required, note, error }) => {
  const inputStyle = {
    background: "rgba(255, 255, 255, 0.035)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${error ? "#ff453a" : T.border}`,
    boxShadow: error ? "0 0 0 2px rgba(255,69,58,0.25)" : "inset 0 1px 2px rgba(0,0,0,0.3)",
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
        {label && <span style={{ fontSize:12, color:error ? T.redL : T.text2, fontWeight:500, letterSpacing:"0.3px" }}>{label}{required&&<span style={{color:error ? T.redL : T.gold}}> *</span>}</span>}
        {note && <span style={{ fontSize:11, color:T.text3 }}>{note}</span>}
      </div>
      {options ? (
        <CustomSelect value={value} onChange={onChange} options={options} placeholder={placeholder||"Seçiniz..."}/>
      ) : textarea ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ ...inputStyle, resize:"vertical" }}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle}/>
      )}
      {error && <span style={{ fontSize:11, color:T.redL, marginTop:2 }}>{error}</span>}
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

const BottomSheet = ({ title, onClose, footer, children }) => (
  <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
    {/* Backdrop */}
    <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}/>
    {/* Modal Box */}
    <div className="modal-pop" style={{
      position:"relative", zIndex:1,
      background:"linear-gradient(145deg, rgba(22, 22, 28, 0.96) 0%, rgba(14, 14, 18, 0.98) 100%)",
      backdropFilter:"blur(36px) saturate(200%)",
      WebkitBackdropFilter:"blur(36px) saturate(200%)",
      borderRadius:28,
      border:"1px solid rgba(255, 255, 255, 0.12)",
      boxShadow:"0 32px 80px rgba(0,0,0,0.95), inset 0 1px 1px rgba(255,255,255,0.22)",
      maxWidth:440, width:"100%",
      maxHeight:"90vh",
      display:"flex", flexDirection:"column",
      overflow: "hidden"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`, background:"rgba(22, 22, 28, 0.8)", backdropFilter:"blur(20px)", zIndex:10 }}>
        <span style={{ fontFamily:"Playfair Display", fontSize:19, fontWeight:700, color:T.goldL }}>{title}</span>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`,
          borderRadius:99, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n="close" s={15} c={T.text2}/>
        </button>
      </div>

      <div style={{ padding:"18px 20px 24px", overflowY:"auto", flex:1 }}>
        {children}
      </div>

      {footer && (
        <div style={{
          padding:"14px 20px 18px",
          borderTop:`1px solid ${T.border}`,
          background:"rgba(18, 18, 22, 0.95)",
          backdropFilter:"blur(24px)",
          WebkitBackdropFilter:"blur(24px)",
          zIndex:10
        }}>
          {footer}
        </div>
      )}
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

// ─── TOAST NOTIFICATION ──────────────────────────────────────────────────
const Toast = ({ message, type="success", onClose }) => {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed",
      top: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99999,
      background: type === "success" 
        ? "linear-gradient(135deg, rgba(18, 32, 22, 0.96) 0%, rgba(10, 20, 14, 0.98) 100%)"
        : "linear-gradient(135deg, rgba(38, 20, 20, 0.96) 0%, rgba(24, 12, 12, 0.98) 100%)",
      backdropFilter: "blur(28px) saturate(190%)",
      WebkitBackdropFilter: "blur(28px) saturate(190%)",
      border: `1.5px solid ${type === "success" ? "#25D366" : "#ff453a"}99`,
      boxShadow: type === "success"
        ? "0 16px 40px rgba(0,0,0,0.85), 0 0 25px rgba(37,211,102,0.25)"
        : "0 16px 40px rgba(0,0,0,0.85), 0 0 25px rgba(255,69,58,0.25)",
      borderRadius: 18,
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      maxWidth: 380,
      width: "calc(100% - 32px)",
      animation: "fadeIn 0.25s ease-out",
    }}>
      <div style={{
        width: 30,
        height: 30,
        borderRadius: 99,
        background: type === "success" ? "rgba(37, 211, 102, 0.18)" : "rgba(255, 69, 58, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        color: type === "success" ? "#25D366" : "#ff453a",
        flexShrink: 0
      }}>
        {type === "success" ? "✓" : "⚠️"}
      </div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#ffffff", lineHeight: 1.4 }}>
        {message}
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14 }}>
          ✕
        </button>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// HAVA DURUMU KARTI
// ════════════════════════════════════════════════
const WeatherCard = ({ date, location="" }) => {
  const [wd, setWd] = useState(null);
  const dLeft = date ? daysLeft(date) : null;

  useEffect(()=>{
    if(!date || dLeft === null || dLeft < 0) { setWd(null); return; }

    let isMounted = true;
    const load = async (lat=37.7648, lon=30.5566) => {
      try {
        if(dLeft <= 14) {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max&timezone=Europe/Istanbul&start_date=${date}&end_date=${date}`);
          const d = await r.json();
          if(!isMounted) return;
          const wc   = d?.daily?.weathercode?.[0];
          const tmax = Math.round(d?.daily?.temperature_2m_max?.[0]||15);
          const tmin = Math.round(d?.daily?.temperature_2m_min?.[0]||8);
          const rain = d?.daily?.precipitation_probability_max?.[0]||0;
          const wind = Math.round(d?.daily?.windspeed_10m_max?.[0]||0);
          const uv   = Math.round(d?.daily?.uv_index_max?.[0]||0);
          const icon = wc<=1?"☀️":wc<=3?"⛅":wc<=48?"🌥":wc<=67?"🌧":wc<=77?"❄️":"⛈";
          setWd({ icon, tmax, tmin, rain, wind, uv, type:"tahmin" });
        } else {
          const mo = new Date(date+"T12:00:00").getMonth()+1;
          const clim=[{m:1,t:6,tl:2,r:10},{m:2,t:7,tl:2,r:9},{m:3,t:10,tl:4,r:8},{m:4,t:14,tl:7,r:7},
            {m:5,t:19,tl:11,r:5},{m:6,t:24,tl:15,r:2},{m:7,t:27,tl:18,r:1},{m:8,t:27,tl:18,r:1},
            {m:9,t:23,tl:14,r:3},{m:10,t:17,tl:9,r:6},{m:11,t:12,tl:6,r:9},{m:12,t:8,tl:3,r:11}];
          const avg = clim.find(c=>c.m===mo)||{t:15,tl:8,r:5};
          const icon = avg.r<3?"☀️":avg.r<6?"⛅":"🌧";
          if(!isMounted) return;
          setWd({ icon, tmax:avg.t, tmin:avg.tl, rain:avg.r*10, wind:0, uv:0, type:"istatistik" });
        }
      } catch(e) { if(isMounted) setWd(null); }
    };

    if(location && location.trim().length > 2) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location+", Türkiye")}&format=json&limit=1`)
        .then(r=>r.json())
        .then(d=>{ if(d?.[0]) load(d[0].lat, d[0].lon); else load(); })
        .catch(()=>load());
    } else {
      load();
    }
    return () => { isMounted = false; };
  },[date, location, dLeft]);

  if(!wd) return null;

  const isBad  = wd.rain > 60;
  const isWind = wd.wind > 40;
  const warn   = isBad || isWind;

  return (
    <div style={{ marginTop:8, background:warn?T.orange+"1A":wd.rain<20?T.green+"1A":T.blue+"1A",
      border:`1px solid ${warn?T.orange:wd.rain<20?T.green:T.blue}33`,
      borderRadius:12, padding:"10px 14px" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <span style={{ fontSize:22 }}>{wd.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
            {wd.tmax}°C / {wd.tmin}°C
            <span style={{ fontSize:11, color:T.text3, fontWeight:400, marginLeft:8 }}>
              💧{wd.rain}% {wd.wind>0?`💨${wd.wind}km/h`:""}
            </span>
          </div>
          <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>
            {wd.type==="tahmin"
              ? `${dLeft===0?"Bugün":dLeft===1?"Yarın":dLeft+" gün sonra"} — gerçek tahmin${location?` (${location.slice(0,20)})`:" (Isparta)"}`
              : `Geçmiş yıl ortalaması${location?` (${location.slice(0,20)})`:" (Isparta)"}`}
          </div>
        </div>
        {warn && (
          <div style={{ background:T.orange+"22", borderRadius:8, padding:"4px 8px",
            fontSize:10, fontWeight:700, color:T.orangeL, flexShrink:0 }}>
            {isBad?"🌧 DİKKAT":""}{isWind?"💨 RÜZGAR":""}
          </div>
        )}
      </div>
      {warn && (
        <div style={{ marginTop:8, fontSize:11, color:T.orangeL, fontWeight:500 }}>
          ⚠️ {isBad?"Yağmur riski yüksek — dış çekim için yedek plan hazırlayın!":""}
          {isWind?" Kuvvetli rüzgar — ekipman güvenliğine dikkat!":""}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
// ÇEKİM GÜNÜ MODU
// ════════════════════════════════════════════════
const CekimGunuModu = ({ apt, data, onClose, onComplete }) => {
  const [checks,    setChecks]    = useState({});
  const [elapsed,   setElapsed]   = useState(0);
  const [running,   setRunning]   = useState(false);
  const [note,      setNote]      = useState("");
  const [tab,       setTab]       = useState("hazirlik");
  const timerRef = useRef(null);

  const client = data?.clients?.find(c=>c.name===apt?.clientName);
  const pkgColor = data?.packages?.find(p=>p.name===apt?.package)?.color || T.gold;

  useEffect(() => {
    if(running) {
      timerRef.current = setInterval(()=>setElapsed(e=>e+1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return ()=>clearInterval(timerRef.current);
  }, [running]);

  const formatTime = s => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return h>0
      ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const checklistItems = Array.isArray(CEKIM_CHECKLIST) ? CEKIM_CHECKLIST : [];
  const checkedCount = checklistItems.filter(c=>checks[c.id]).length;
  const allChecked = checklistItems.length > 0 && checkedCount === checklistItems.length;

  return (
    <div style={{ position:"fixed", inset:0, background:T.bg, zIndex:300,
      display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"52px 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onClose}
          style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:99,
            width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ic n="back" s={16} c={T.text2}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:18, fontWeight:600, color:T.goldL }}>
            📸 Çekim Günü Modu
          </div>
          <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{apt?.clientName} — {fmtDate(apt?.date)}</div>
        </div>
        {apt?.package && <Pill label={apt.package} color={pkgColor}/>}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
        {[["hazirlik","✅ Hazırlık"],["kronometre","⏱ Süre"],["notlar","📝 Notlar"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"12px 4px",
            fontSize:12, fontWeight:tab===id?700:400,
            color:tab===id?T.goldL:T.text3,
            borderBottom:tab===id?`2px solid ${T.gold}`:"2px solid transparent",
            background:"transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 120px" }}>

        {/* Hazırlık Checklist */}
        {tab==="hazirlik" && <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:13, color:T.text3 }}>Çekim öncesi kontrol listesi</div>
            <div style={{ fontSize:12, fontWeight:700, color:allChecked?T.greenL:T.text3 }}>
              {checkedCount}/{checklistItems.length}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background:T.card2, borderRadius:99, height:6, marginBottom:20 }}>
            <div style={{ height:"100%", borderRadius:99, background:allChecked?T.green:T.gold,
              width:checklistItems.length ? `${(checkedCount/checklistItems.length)*100}%` : "0%", transition:"width 0.3s" }}/>
          </div>
          {checklistItems.map(c=>(
            <button key={c.id} onClick={()=>setChecks(p=>({...p,[c.id]:!p[c.id]}))}
              style={{ width:"100%", background:checks[c.id]?T.green+"1A":T.card,
                border:`1px solid ${checks[c.id]?T.green+"44":T.border}`,
                borderRadius:14, padding:"14px 16px", marginBottom:8,
                display:"flex", alignItems:"center", gap:14, textAlign:"left" }}>
              <div style={{ width:28, height:28, borderRadius:99, flexShrink:0,
                background:checks[c.id]?T.green:"transparent",
                border:`2px solid ${checks[c.id]?T.green:T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, transition:"all 0.2s" }}>
                {checks[c.id] ? "✓" : ""}
              </div>
              <span style={{ fontSize:14, fontWeight:500 }}>{c.icon} {c.label}</span>
            </button>
          ))}
          {/* Müşteri bilgileri */}
          {client && (
            <div style={{ marginTop:16, background:T.card, border:`1px solid ${T.border}`,
              borderRadius:14, padding:14 }}>
              <div style={{ fontSize:12, color:T.text3, marginBottom:10 }}>📞 Müşteri Bilgileri</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{client.name}</div>
              {client.phone && (
                <button onClick={()=>window.open(`tel:${client.phone}`)}
                  style={{ background:T.blue+"1A", border:`1px solid ${T.blue}33`,
                    borderRadius:10, padding:"8px 14px", fontSize:13, color:T.blueL, fontWeight:600 }}>
                  📞 {client.phone}
                </button>
              )}
              {apt?.location && <div style={{ fontSize:12, color:T.text3, marginTop:8 }}>📍 {apt.location}</div>}
            </div>
          )}
        </>}

        {/* Kronometre */}
        {tab==="kronometre" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:20 }}>
            <div style={{ fontSize:72, fontWeight:700, fontFamily:"DM Sans",
              color:running?T.goldL:T.text2, letterSpacing:2, marginBottom:8,
              textShadow:running?`0 0 40px ${T.gold}66`:"none", transition:"all 0.3s" }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ fontSize:13, color:T.text3, marginBottom:40 }}>
              {running ? "⏱ Çekim devam ediyor..." : elapsed>0 ? "⏸ Duraklatıldı" : "Kronometreyi başlat"}
            </div>
            <div style={{ display:"flex", gap:16 }}>
              <button onClick={()=>setRunning(r=>!r)}
                style={{ background:running?T.orange+"22":`linear-gradient(135deg,${T.goldL},${T.goldD})`,
                  border:`1.5px solid ${running?T.orange:T.gold}`,
                  borderRadius:99, width:80, height:80, fontSize:28,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:running?T.orangeL:T.bg, boxShadow:running?"none":`0 8px 24px ${T.gold}44` }}>
                {running ? "⏸" : "▶"}
              </button>
              {elapsed > 0 && (
                <button onClick={()=>{ setRunning(false); setElapsed(0); }}
                  style={{ background:T.card2, border:`1px solid ${T.border}`,
                    borderRadius:99, width:56, height:56, fontSize:20,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                  ↺
                </button>
              )}
            </div>
            {elapsed > 0 && (
              <div style={{ marginTop:32, background:T.card, border:`1px solid ${T.border}`,
                borderRadius:14, padding:16, width:"100%", textAlign:"center" }}>
                <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>Toplam çekim süresi</div>
                <div style={{ fontSize:22, fontWeight:700, color:T.goldL }}>{formatTime(elapsed)}</div>
              </div>
            )}
          </div>
        )}

        {/* Notlar */}
        {tab==="notlar" && (
          <div>
            <div style={{ fontSize:13, color:T.text3, marginBottom:12 }}>Çekim sırasında not al</div>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Özel anlar, müşteri istekleri, teknik notlar..."
              rows={10}
              style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
                padding:"14px 16px", color:T.text, fontSize:14, resize:"none",
                outline:"none", lineHeight:1.7, width:"100%" }}/>
            <div style={{ fontSize:11, color:T.text3, marginTop:8, textAlign:"right" }}>
              {note.length} karakter
            </div>
          </div>
        )}
      </div>

      {/* Bottom - Çekim Tamamla */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 20px 36px",
        background:T.surface, borderTop:`1px solid ${T.border}` }}>
        <button onClick={onComplete}
          style={{ width:"100%", background:`linear-gradient(135deg,${T.green},${T.green}CC)`,
            border:"none", borderRadius:16, padding:"16px",
            fontSize:16, fontWeight:700, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow:`0 8px 24px ${T.green}44` }}>
          ✅ Çekim Tamamlandı
        </button>
      </div>
    </div>
  );
};

export { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo, Toast, WeatherCard, CekimGunuModu };
