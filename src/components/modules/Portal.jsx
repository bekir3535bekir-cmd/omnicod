import React, { useState } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmtDate } from "../../utils/helpers";
import { Card, Pill, GoldButton, Field, PageHeader } from "../common";

export const Portal = ({ data }) => {
  const [selClient, setSelClient] = useState("");
  const [portalOpen, setPortalOpen] = useState(false);
  const [selections, setSelections] = useState({});
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [quota, setQuota] = useState(40);
  const [copied, setCopied] = useState(false);

  const client = data.clients.find(c => c.id === selClient);
  const galleryPhotos = data.gallery.filter(g => g.clientId === selClient || !g.clientId);

  const toggleSelect = (id) => {
    setSelections(p => ({ ...p, [id]: !p[id] }));
  };

  const toggleCover = (id) => {
    setCoverPhoto(prev => (prev === id ? null : id));
    if (!selections[id]) {
      setSelections(p => ({ ...p, [id]: true }));
    }
  };

  const selectedCount = Object.values(selections).filter(Boolean).length;

  const copyPhotoList = () => {
    const selectedIds = Object.keys(selections).filter(id => selections[id]);
    const names = selectedIds.map((id, i) => {
      const ph = galleryPhotos.find(g => g.id === id);
      return ph?.title || `IMG_${String(i + 1).padStart(4, "0")}.JPG`;
    });
    navigator.clipboard.writeText(names.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendPortalLink = () => {
    if (!client?.phone) return;
    const phone = client.phone.replace(/\D/g, "").replace(/^0/, "");
    const selectedIds = Object.keys(selections).filter(id => selections[id]);
    const msg = `Merhaba ${client.name} 👋\n\nÇekim fotoğraflarınız hazır! Toplam ${quota} adet albüm fotoğrafı seçebilirsiniz.\n\nŞu ana kadar seçilen: ${selectedIds.length}/${quota} adet.\n\nStudyoApp 📸`;
    window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      <PageHeader title="Müşteri Portali & Fotoğraf Seçimi" sub="Albüm fotoğraf eleme ve proofing yönetim sistemi" />
      <div style={{ padding: "0 20px" }}>
        
        {/* Bilgi Kutusu */}
        <div style={{
          background: "rgba(232, 197, 71, 0.08)",
          border: `1px solid ${T.gold}44`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.goldL, marginBottom: 6 }}>
            💖 Tinder Tarzı Fotoğraf Seçimi (Proofing)
          </div>
          <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.6 }}>
            Müşteriniz evinde telefonundan fotoğrafları inceler, albüme girmesini istediklerine <strong>❤️ Kalp</strong> koyar, kapak fotoğrafı için <strong>⭐ Yıldız</strong> seçer. Seçilen fotoğrafların dosya adlarını tek tıkla Lightroom'a aktarabilirsiniz.
          </div>
        </div>

        <Field 
          label="Müşteri Seçin" 
          value={selClient}
          onChange={v => { setSelClient(v); setSelections({}); setCoverPhoto(null); setPortalOpen(false); }}
          options={["", ...data.clients.map(c => c.id)]}
        />

        {selClient && !portalOpen && (
          <div style={{ marginTop: 14 }}>
            <Card glow style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{client?.name}</div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                Paket: {client?.package} • Tarih: {fmtDate(client?.date)}
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: T.text2 }}>Albüm Seçim Kotası:</span>
                <input
                  type="number"
                  value={quota}
                  onChange={e => setQuota(parseInt(e.target.value, 10) || 35)}
                  style={{
                    width: 60,
                    background: "rgba(255,255,255,0.08)",
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 13,
                    textAlign: "center"
                  }}
                />
                <span style={{ fontSize: 12, color: T.text3 }}>adet</span>
              </div>
            </Card>

            <GoldButton 
              label="Müşteri Seçim Portalini Aç" 
              icon="eye" 
              onClick={() => setPortalOpen(true)} 
              full 
            />
          </div>
        )}

        {/* MÜŞTERİ PORTAL SİMÜLASYONU */}
        {portalOpen && client && (
          <div className="fade-in" style={{ marginTop: 20 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
              border: `1.5px solid ${T.gold}44`,
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)"
            }}>
              {/* Header */}
              <div style={{
                background: `linear-gradient(135deg, ${T.goldD}, ${T.gold})`,
                padding: "20px 18px",
                color: "#000"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Playfair Display", fontSize: 20, fontWeight: 700 }}>
                      StudyoApp
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>
                      {client.name} — Albüm Fotoğraf Seçimi
                    </div>
                  </div>
                  <Pill label={`${selectedCount} / ${quota} Seçildi`} color="#000" />
                </div>
              </div>

              {/* Fotoğraflar Izgarası */}
              <div style={{ padding: 16 }}>
                {galleryPhotos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: T.text3, fontSize: 13 }}>
                    Önce Portföy Galerisi'ne veya müşteriye ait fotoğrafları yükleyin.
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16
                    }}>
                      {galleryPhotos.map((g, i) => {
                        const isSelected = !!selections[g.id];
                        const isCover = coverPhoto === g.id;

                        return (
                          <div
                            key={g.id}
                            style={{
                              borderRadius: 16,
                              overflow: "hidden",
                              background: isSelected ? "rgba(76, 175, 80, 0.12)" : "rgba(255,255,255,0.03)",
                              border: `2px solid ${isCover ? T.goldL : isSelected ? T.greenL : "rgba(255,255,255,0.08)"}`,
                              transition: "all 0.2s ease",
                              position: "relative"
                            }}
                          >
                            <div style={{
                              aspectRatio: "1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 32,
                              background: g.color || "rgba(255,255,255,0.05)"
                            }}>
                              {g.emoji || "📸"}
                            </div>

                            {/* Badge row */}
                            <div style={{
                              position: "absolute",
                              top: 6,
                              left: 6,
                              right: 6,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}>
                              <span style={{
                                fontSize: 9,
                                background: "rgba(0,0,0,0.6)",
                                color: "#fff",
                                padding: "2px 6px",
                                borderRadius: 6
                              }}>
                                #{i + 1}
                              </span>

                              {isCover && (
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  background: T.gold,
                                  color: "#000",
                                  padding: "2px 6px",
                                  borderRadius: 6
                                }}>
                                  ⭐ KAPAK
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                              display: "flex",
                              gap: 4,
                              padding: 6,
                              background: "rgba(0,0,0,0.4)"
                            }}>
                              <button
                                onClick={() => toggleSelect(g.id)}
                                style={{
                                  flex: 1,
                                  background: isSelected ? T.greenL : "rgba(255,255,255,0.1)",
                                  color: isSelected ? "#000" : "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "6px 0",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                {isSelected ? "❤️ Seçildi" : "🤍 Seç"}
                              </button>

                              <button
                                onClick={() => toggleCover(g.id)}
                                title="Kapak fotoğrafı yap"
                                style={{
                                  background: isCover ? T.goldL : "rgba(255,255,255,0.1)",
                                  color: isCover ? "#000" : "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "6px 8px",
                                  fontSize: 11,
                                  cursor: "pointer"
                                }}
                              >
                                ⭐
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Alt İlerleme ve Kopyalama Çubuğu */}
                    <div style={{
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      marginBottom: 14
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.goldL }}>
                            {selectedCount} / {quota} Fotoğraf Seçildi
                          </div>
                          <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                            {coverPhoto ? "⭐ Kapak fotoğrafı belirlendi" : "Henüz kapak fotoğrafı seçilmedi"}
                          </div>
                        </div>

                        <button
                          onClick={copyPhotoList}
                          style={{
                            background: "rgba(232, 197, 71, 0.15)",
                            border: `1px solid ${T.gold}55`,
                            color: T.goldL,
                            borderRadius: 10,
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {copied ? "Kopyalandı! ✅" : "📋 İsimleri Kopyala"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <GoldButton
                label="WhatsApp ile Seçimleri Müşteriye Gönder"
                icon="send"
                onClick={sendPortalLink}
                full
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
