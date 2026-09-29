import React, { useState, useRef } from "react";
import { T } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmtDate, uid } from "../../utils/helpers";
import { Card, Pill, GoldButton, Field, PageHeader } from "../common";
import { sb, toDB } from "../../services/supabase";

// Örnek gerçek düğün & dış çekim fotoğrafları (Hızlı test ve demo için)
const DEMO_WEDDING_PHOTOS = [
  { id: "demo_1", title: "Gelin_Damat_Romantik_01.jpg", url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_2", title: "Altin_Saat_Ters_Isik_02.jpg", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_3", title: "Gelinlik_Detay_Buket_03.jpg", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_4", title: "Damat_Ceket_Kravat_04.jpg", url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_5", title: "Sahil_Yuruyus_05.jpg", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_6", title: "Goz_Goze_Gulumseme_06.jpg", url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_7", title: "Gelin_Tulu_Ucusu_07.jpg", url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_8", title: "Alyans_ve_Davetiye_08.jpg", url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_9", title: "Dugun_Dansi_09.jpg", url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80" },
  { id: "demo_10", title: "Gun_Batimi_Siluet_10.jpg", url: "https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=800&q=80" },
];

export const Portal = ({ data, setData }) => {
  const [selClient, setSelClient] = useState(() => data?.clients?.[0]?.id || "");
  const [quota, setQuota] = useState(40);
  const [viewMode, setViewMode] = useState("tinder"); // "tinder" | "grid"
  const [currentIdx, setCurrentIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNames, setCopiedNames] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const client = (data?.clients || []).find(c => String(c.id) === String(selClient)) || data?.clients?.[0];
  const activeClientId = client?.id || selClient;
  const clientPhotos = (data?.gallery || []).filter(g => String(g.clientId) === String(activeClientId));

  // Müşterinin kaydettiği seçimler
  const clientSelectionsKey = `studyo_selections_${activeClientId}`;
  const [selections, setSelections] = useState(() => {
    try {
      const s = localStorage.getItem(clientSelectionsKey);
      return s ? JSON.parse(s) : {};
    } catch(e) { return {}; }
  });

  const toggleSelect = (id) => {
    setSelections(prev => {
      const next = { ...prev, [id]: prev[id] === "selected" ? null : "selected" };
      try { localStorage.setItem(clientSelectionsKey, JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  const setCover = (id) => {
    setSelections(prev => {
      const next = { ...prev, [id]: prev[id] === "cover" ? "selected" : "cover" };
      try { localStorage.setItem(clientSelectionsKey, JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  const selectedCount = Object.values(selections).filter(v => v === "selected" || v === "cover").length;
  const coverPhotoId = Object.keys(selections).find(k => selections[k] === "cover");

  // 1. Bilgisayardan / Telefondan gerçek fotoğraf yükleme
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selClient) return;

    setUploading(true);

    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Hızlı ve hafif küçük resim oluştur (canvas resize max 900px)
            const canvas = document.createElement("canvas");
            let w = img.width;
            let h = img.height;
            const max = 900;
            if (w > max || h > max) {
              if (w > h) { h = Math.round((h * max) / w); w = max; }
              else { w = Math.round((w * max) / h); h = max; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.72);

            resolve({
              id: uid(),
              clientId: selClient,
              clientName: client?.name || "",
              title: file.name,
              category: client?.type || "Düğün",
              url: thumbUrl,
              date: new Date().toISOString().split("T")[0]
            });
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(newPhotos => {
      setData(prev => {
        const updatedGallery = [...newPhotos, ...prev.gallery];
        return { ...prev, gallery: updatedGallery };
      });
      // Supabase'e ekle
      newPhotos.forEach(p => {
        sb.upsert("gallery", toDB.gallery(p)).catch(() => {});
      });
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  // 2. Demo fotoğrafları tek tıkla ekleme
  const handleAddDemoPhotos = () => {
    if (!selClient) return;
    const demoItems = DEMO_WEDDING_PHOTOS.map(p => ({
      id: uid(),
      clientId: selClient,
      clientName: client?.name || "",
      title: p.title,
      category: client?.type || "Düğün",
      url: p.url,
      date: new Date().toISOString().split("T")[0]
    }));

    setData(prev => ({
      ...prev,
      gallery: [...demoItems, ...prev.gallery]
    }));
    demoItems.forEach(p => {
      sb.upsert("gallery", toDB.gallery(p)).catch(() => {});
    });
  };

  // 3. Müşteri linkini panoya kopyalama ve WhatsApp ile gönderme
  const clientPortalUrl = `${window.location.origin}?proof=${selClient}`;

  const copyLink = () => {
    navigator.clipboard.writeText(clientPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const sendLinkViaWhatsApp = () => {
    if (!client?.phone) return;
    const cleanPh = client.phone.replace(/\D/g, "").replace(/^0/, "");
    const msg = `Merhaba ${client.name}! Çekim fotoğraflarınız hazır! 🎉\n\nAşağıdaki linke tıklayarak evinizden telefonunuzla fotoğraflarınızı inceleyebilir ve albümünüz için beğendiklerinizi ❤️ seçebilirsiniz:\n\n🔗 ${clientPortalUrl}\n\nKeyifli seçimler dileriz! — StudyoApp`;
    window.open(`https://wa.me/90${cleanPh}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // 4. Lightroom için isim listesini kopyalama
  const copyLightroomNames = () => {
    const selectedIds = Object.keys(selections).filter(id => selections[id]);
    const names = selectedIds.map(id => {
      const p = clientPhotos.find(item => item.id === id);
      return p?.title || id;
    });
    navigator.clipboard.writeText(names.join(", "));
    setCopiedNames(true);
    setTimeout(() => setCopiedNames(false), 2500);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 50 }}>
      <PageHeader
        title="Müşteri Fotoğraf Seçim & Proofing"
        sub="Müşteriye özel fotoğraf yükleme, WhatsApp linki paylaşma ve seçim takibi"
      />

      <div style={{ padding: "0 20px" }}>
        {/* Müşteri Seçimi */}
        <Card glow style={{ padding: 18, marginBottom: 18 }}>
          <Field
            label="1. İŞLEM YAPILACAK MÜŞTERİYİ SEÇİN"
            value={selClient}
            onChange={v => {
              setSelClient(v);
              setCurrentIdx(0);
              try {
                const s = localStorage.getItem(`studyo_selections_${v}`);
                setSelections(s ? JSON.parse(s) : {});
              } catch(e) {}
            }}
            options={["", ...data.clients.map(c => c.id)]}
          />

          {client && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{client.name}</span>
                <span style={{ fontSize: 12, color: T.text3, marginLeft: 8 }}>• {client.type}</span>
              </div>
              <Pill label={`${clientPhotos.length} Fotoğraf Yüklü`} color={clientPhotos.length > 0 ? T.greenL : T.orangeL} />
            </div>
          )}
        </Card>

        {client && (
          <>
            {/* Fotoğraf Yükleme ve Yönetim Paneli */}
            <Card style={{ padding: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.goldL, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 12 }}>
                📸 Fotoğraf Ekleme & Yönetim
              </div>

              {/* Gizli dosya seçici */}
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    background: `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
                    color: "#000",
                    border: "none",
                    borderRadius: 14,
                    padding: "12px",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>📁</span> {uploading ? "Yükleniyor..." : "Cihazdan Fotoğraf Seç"}
                </button>

                <button
                  onClick={handleAddDemoPhotos}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 14,
                    padding: "12px",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>🎲</span> Örnek 10 Kare Ekle
                </button>
              </div>

              {clientPhotos.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: T.text3, marginTop: 4 }}>
                  <span>Toplam {clientPhotos.length} fotoğraf sistemde hazır</span>
                  <button
                    onClick={() => {
                      if (confirm("Bu müşterinin galerideki fotoğraflarını silmek istiyor musunuz?")) {
                        setData(p => ({ ...p, gallery: p.gallery.filter(g => g.clientId !== selClient) }));
                      }
                    }}
                    style={{ background: "none", border: "none", color: T.redL, cursor: "pointer", fontSize: 11 }}
                  >
                    Fotoğrafları Temizle
                  </button>
                </div>
              )}
            </Card>

            {/* Müşteri Paylaşım Linki (WhatsApp) */}
            <div style={{
              borderRadius: 22,
              padding: "18px 20px",
              background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)",
              backdropFilter: "blur(20px)",
              border: "1.5px solid rgba(37, 211, 102, 0.35)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              marginBottom: 18
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#25D366", textTransform: "uppercase" }}>
                  📲 Müşteri Seçim Linki
                </div>
                <Pill label={`${selectedCount} / ${quota} Seçildi`} color={selectedCount >= quota ? T.greenL : T.goldL} />
              </div>

              <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, marginBottom: 12 }}>
                Müşteriniz bu linke tıkladığında şifre girmeden doğrudan fotoğrafları Tinder tarzı tek tek inceleyip seçebilir:
              </div>

              <div style={{
                background: "rgba(0,0,0,0.4)",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 11.5,
                color: T.text3,
                wordBreak: "break-all",
                marginBottom: 12,
                fontFamily: "monospace"
              }}>
                {clientPortalUrl}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={sendLinkViaWhatsApp}
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>💬</span> WhatsApp ile Gönder
                </button>

                <button
                  onClick={copyLink}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    borderRadius: 12,
                    padding: "11px",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <span>🔗</span> {copiedLink ? "Kopyalandı! ✅" : "Linki Kopyala"}
                </button>
              </div>
            </div>

            {/* Lightroom İçin İsimleri Kopyala */}
            {selectedCount > 0 && (
              <Card glow style={{ padding: 16, marginBottom: 18, background: "rgba(232, 197, 71, 0.08)", borderColor: `${T.gold}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.goldL }}>
                      🎉 Müşterinin Seçtiği {selectedCount} Fotoğraf Hazır!
                    </div>
                    <div style={{ fontSize: 11.5, color: T.text2, marginTop: 3 }}>
                      {coverPhotoId ? "⭐ 1 adet kapak fotoğrafı seçildi" : "Kapak fotoğrafı henüz belirlenmedi"}
                    </div>
                  </div>
                  <button
                    onClick={copyLightroomNames}
                    style={{
                      background: `linear-gradient(135deg, ${T.gold}, ${T.goldD})`,
                      color: "#000",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {copiedNames ? "Kopyalandı! ✅" : "📋 Lightroom İsimlerini Kopyala"}
                  </button>
                </div>
              </Card>
            )}

            {/* MÜŞTERİ SEÇİM SİMÜLASYONU & TİNDER MODU */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  👁️ Müşteri Ekranı Önizlemesi
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setViewMode("tinder")}
                    style={{
                      background: viewMode === "tinder" ? T.gold : "rgba(255,255,255,0.06)",
                      color: viewMode === "tinder" ? "#000" : T.text2,
                      border: "none",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    🔥 Tinder Modu
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    style={{
                      background: viewMode === "grid" ? T.gold : "rgba(255,255,255,0.06)",
                      color: viewMode === "grid" ? "#000" : T.text2,
                      border: "none",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    🖼️ Izgara Modu
                  </button>
                </div>
              </div>

              {clientPhotos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", background: T.card, borderRadius: 18, color: T.text3, fontSize: 13 }}>
                  Yukarıdaki butonlardan fotoğraf yükleyin veya "Örnek 10 Kare Ekle" butonuna basın.
                </div>
              ) : viewMode === "tinder" ? (
                /* TINDER KART MODU */
                <div style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  background: "linear-gradient(180deg, #151518 0%, #0c0c0e 100%)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  position: "relative"
                }}>
                  {(() => {
                    const currentPhoto = clientPhotos[currentIdx] || clientPhotos[0];
                    const isSelected = selections[currentPhoto.id] === "selected" || selections[currentPhoto.id] === "cover";
                    const isCover = selections[currentPhoto.id] === "cover";

                    return (
                      <div>
                        {/* Fotoğraf Görüntüleme */}
                        <div style={{ position: "relative", width: "100%", height: 380, background: "#000" }}>
                          <img
                            src={currentPhoto.url}
                            alt={currentPhoto.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />

                          {/* Üst sayaç & Başlık */}
                          <div style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            right: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <span style={{
                              background: "rgba(0,0,0,0.65)",
                              backdropFilter: "blur(10px)",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 10
                            }}>
                              {currentIdx + 1} / {clientPhotos.length}
                            </span>

                            {isCover ? (
                              <span style={{
                                background: T.gold,
                                color: "#000",
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 10
                              }}>
                                ⭐ KAPAK FOTOĞRAFI
                              </span>
                            ) : isSelected ? (
                              <span style={{
                                background: T.greenL,
                                color: "#000",
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 10
                              }}>
                                ❤️ ALBÜME SEÇİLDİ
                              </span>
                            ) : null}
                          </div>

                          <div style={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            right: 12,
                            background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))",
                            padding: "8px 10px",
                            borderRadius: 10,
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {currentPhoto.title}
                          </div>
                        </div>

                        {/* Tinder Eylem Butonları */}
                        <div style={{
                          padding: "16px 20px 20px",
                          display: "flex",
                          justifyContent: "space-around",
                          alignItems: "center"
                        }}>
                          {/* Pas Geç */}
                          <button
                            onClick={() => setCurrentIdx(prev => (prev + 1) % clientPhotos.length)}
                            title="Pas Geç (Sonraki)"
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 99,
                              background: "rgba(255,255,255,0.06)",
                              border: "1.5px solid rgba(255,255,255,0.15)",
                              color: "#fff",
                              fontSize: 22,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            ✕
                          </button>

                          {/* Kapak Yap */}
                          <button
                            onClick={() => setCover(currentPhoto.id)}
                            title="Kapak Fotoğrafı Yap"
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 99,
                              background: isCover ? T.gold : "rgba(255,255,255,0.06)",
                              border: `1.5px solid ${isCover ? T.goldL : "rgba(255,255,255,0.15)"}`,
                              color: isCover ? "#000" : T.goldL,
                              fontSize: 20,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            ⭐
                          </button>

                          {/* Kalp / Seç */}
                          <button
                            onClick={() => {
                              toggleSelect(currentPhoto.id);
                              setCurrentIdx(prev => (prev + 1) % clientPhotos.length);
                            }}
                            title="Albüme Seç"
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 99,
                              background: isSelected ? "linear-gradient(135deg, #e91e63, #c2185b)" : "rgba(255,255,255,0.08)",
                              border: `2px solid ${isSelected ? "#ff4081" : "rgba(255,255,255,0.2)"}`,
                              color: isSelected ? "#fff" : "#ff4081",
                              fontSize: 28,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isSelected ? "0 0 25px rgba(233, 30, 99, 0.5)" : "none"
                            }}
                          >
                            ❤️
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* IZGARA (GRID) MODU */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {clientPhotos.map((photo, i) => {
                    const isSelected = selections[photo.id] === "selected" || selections[photo.id] === "cover";
                    const isCover = selections[photo.id] === "cover";

                    return (
                      <div
                        key={photo.id}
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          background: isSelected ? "rgba(76, 175, 80, 0.12)" : "rgba(255,255,255,0.03)",
                          border: `2px solid ${isCover ? T.goldL : isSelected ? T.greenL : "rgba(255,255,255,0.08)"}`,
                          position: "relative"
                        }}
                      >
                        <div style={{ aspectRatio: "1", position: "relative" }}>
                          <img
                            src={photo.url}
                            alt={photo.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <span style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 6
                          }}>
                            #{i + 1}
                          </span>
                        </div>

                        <div style={{ padding: 8, display: "flex", gap: 6 }}>
                          <button
                            onClick={() => toggleSelect(photo.id)}
                            style={{
                              flex: 1,
                              background: isSelected ? T.greenL : "rgba(255,255,255,0.08)",
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
                            onClick={() => setCover(photo.id)}
                            style={{
                              background: isCover ? T.goldL : "rgba(255,255,255,0.08)",
                              color: isCover ? "#000" : "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
