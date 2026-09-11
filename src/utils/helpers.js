export const fmt    = n => new Intl.NumberFormat("tr-TR").format(n||0) + " ₺";
export const fmtShort = n => { if(n>=1000) return (n/1000).toFixed(n%1000===0?0:1)+"B ₺"; return fmt(n); };

export const fmtDate  = d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"}); };
export const fmtDateSh= d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("tr-TR",{day:"2-digit",month:"short"}); };
export const todayStr = () => new Date().toISOString().split("T")[0];
export const daysLeft = d => Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000);
export const MN = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
export const monthOf  = d => new Date(d+"T12:00:00").getMonth();
export const yearOf   = d => new Date(d+"T12:00:00").getFullYear();
export const uid      = () => String(Date.now()) + String(Math.floor(Math.random()*1e9));

// DM Sans — tüm sayısal değerler için
export const NUM_FONT = { fontFamily:"'DM Sans',sans-serif", fontVariantNumeric:"tabular-nums" };
