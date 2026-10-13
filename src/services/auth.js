// ════════════════════════════════════════════════
// HESAP & STÜDYO (Supabase Auth)
// Aynı e-posta/şifreyle telefondan ve bilgisayardan giriş yapılır, aynı veri görülür.
// ════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { supabase, sb, SUPABASE_URL, SUPABASE_KEY } from "./supabase";

// ── Personel girişi: telefon numarası → sistem içi e-posta ──
// Personel e-posta yerine telefon numarasıyla girer; hesabın sistemdeki adresi p<telefon>@personel.studyom.app
export const normalizePhone = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
};
export const staffEmail = (phone) => `p${normalizePhone(phone)}@personel.studyom.app`;
// Girişte yazılan değer e-posta değilse telefon kabul edilir
const loginEmail = (v) => String(v || "").includes("@") ? String(v).trim() : staffEmail(v);

// Supabase hata mesajlarını Türkçeleştir
export const authErrorText = (error) => {
  const m = String(error?.message || error || "");
  if (/Invalid login credentials/i.test(m)) return "E-posta veya şifre hatalı.";
  if (/User already registered|already been registered/i.test(m)) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  if (/Email not confirmed/i.test(m)) return "E-posta adresi henüz doğrulanmamış. Gelen kutunuzu kontrol edin.";
  if (/Password should be at least|weak/i.test(m)) return "Şifre en az 6 karakter olmalı.";
  if (/valid email|invalid email|Unable to validate email/i.test(m)) return "Geçerli bir e-posta adresi girin.";
  if (/rate limit|too many/i.test(m)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.";
  if (/Token has expired|invalid.*otp|otp.*invalid/i.test(m)) return "Kod hatalı veya süresi dolmuş.";
  if (/Katılım kodu geçersiz/i.test(m)) return "Katılım kodu geçersiz. Stüdyo yöneticinizden kodu tekrar isteyin.";
  if (/zaten bir stüdyoya bağlı/i.test(m)) return "Bu hesap zaten bir stüdyoya bağlı.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "İnternet bağlantısı yok veya sunucuya ulaşılamıyor.";
  if (/granting user|Database error/i.test(m)) return "Sunucu şu an yanıt veremedi. Birkaç saniye sonra tekrar deneyin.";
  return m || "Beklenmeyen bir hata oluştu.";
};

export const getAuthSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
};

export const onAuthChange = (cb) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
};

export const signIn = async (emailOrPhone, password) => {
  const isPhone = !String(emailOrPhone || "").includes("@");
  if (isPhone && normalizePhone(emailOrPhone).length !== 10) throw new Error("Geçerli bir e-posta adresi veya telefon numarası girin.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(emailOrPhone), password });
  if (error) throw new Error(isPhone && /Invalid login/i.test(error.message) ? "Telefon numarası veya şifre hatalı." : authErrorText(error));
  return data.session;
};

// Kayıt: e-posta doğrulaması kapalıysa hemen oturum açılır; açıksa kod beklenir (session = null)
export const signUp = async (email, password, meta = {}) => {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: meta } });
  if (error) {
    // Hesap oluşup yalnızca oturum açma adımı geçici olarak başarısız olduysa doğrudan giriş yapmayı dene
    if (/granting user|Database error|timeout|50\d/i.test(String(error.message || error.status))) {
      const retry = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!retry.error) return { session: retry.data.session, needsVerification: false };
    }
    throw new Error(authErrorText(error));
  }
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.");
  }
  return { session: data.session, needsVerification: !data.session };
};

// E-posta doğrulama kodu (SMTP + kod şablonu ayarlandığında kullanılır)
export const verifySignupCode = async (email, code) => {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
  if (error) throw new Error(authErrorText(error));
  return data.session;
};

export const resendSignupCode = async (email) => {
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
  if (error) throw new Error(authErrorText(error));
};

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new Error(authErrorText(error));
};

export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(authErrorText(error));
};

// Giriş yapan hesabın adı ve e-postası (kayıtta girilen ad)
export const currentUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  return u ? { email: u.email || "", name: u.user_metadata?.name || "" } : null;
};

export const signOut = async () => {
  if (supabase) await supabase.auth.signOut().catch(() => {});
};

// ── Stüdyo ──
const rpcOrThrow = async (fn, args) => {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(authErrorText(error));
  return data;
};
export const fetchMyStudio   = () => rpcOrThrow("my_studio");
export const createStudio    = (name) => rpcOrThrow("create_studio", { p_name: name });
export const joinStudio      = (code) => rpcOrThrow("join_studio", { p_code: code });
export const setMyTeamId     = (teamId) => rpcOrThrow("set_my_team_id", { p_team_id: teamId });
export const saveStudioProfileRemote = (profile) => rpcOrThrow("update_studio_profile", { p_profile: profile });

// ── Müşteri (giriş yapmadan) ──
export const findClientId = (name, phone4) => rpcOrThrow("find_client", { p_name: name, p_phone4: phone4 });
export const fetchProofData = (clientId) => rpcOrThrow("proof_data", { p_client_id: clientId });

// ── Personel hesapları (yönetici yönetir) ──
// Yeni personel hesabı: ayrı (oturumu saklamayan) bir bağlantıyla açılır, böylece yöneticinin oturumu bozulmaz
export const createStaffAccount = async (teamId, phone, password) => {
  const p = normalizePhone(phone);
  if (p.length !== 10) throw new Error("Geçerli bir telefon numarası girin (05xx xxx xx xx).");
  if (String(password || "").length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
  const tmp = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "studyom-staff-tmp" } });
  const { data, error } = await tmp.auth.signUp({ email: staffEmail(p), password });
  if (error) {
    if (/already registered|already been registered/i.test(error.message)) throw new Error("Bu telefon numarasıyla zaten bir personel hesabı var.");
    throw new Error(authErrorText(error));
  }
  const uid = data?.user?.id;
  if (!uid || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) throw new Error("Bu telefon numarasıyla zaten bir personel hesabı var.");
  try {
    await rpcOrThrow("add_staff", { p_user_id: uid, p_team_id: String(teamId) });
  } catch (e) {
    // Stüdyoya bağlanamadıysa yarım kalan hesabı sil (telefon numarası boşuna kilitlenmesin)
    await tmp.rpc("delete_my_account").catch(() => {});
    throw e;
  } finally {
    await tmp.auth.signOut().catch(() => {});
  }
};
export const fetchStaffAccounts = () => rpcOrThrow("staff_accounts");
export const setStaffPassword = (teamId, password) => rpcOrThrow("set_staff_password", { p_team_id: String(teamId), p_password: password });
export const removeStaffAccount = (teamId) => rpcOrThrow("remove_staff", { p_team_id: String(teamId) });

// ── Personel verisi ve randevu talebi ──
// Personel tutar/ödeme/maaş/fiyat alanları olmadan veri alır
export const fetchStaffData = () => rpcOrThrow("staff_data");
// Personelin eklediği randevu yönetici onayına düşer
export const submitAppointment = (apt) => rpcOrThrow("submit_appointment", { p: {
  id: String(apt.id), client_name: apt.clientName || "", client_phone: apt.clientPhone || "", date: apt.date || "",
  time: apt.time || "", location: apt.location || "", type: apt.type || "Düğün", package: apt.package || "",
  notes: apt.notes || "", reminder_days: apt.reminderDays || 3, staff_name: apt.staffName || "",
  staff_ids: apt.staffIds || [], extra_dates: (apt.extraDates || []).filter(Boolean),
} });

// Hesabımı sil (mağaza zorunluluğu). Yönetici silerse stüdyo ve tüm verileri silinir.
export const deleteMyAccount = async () => {
  await rpcOrThrow("delete_my_account");
  await signOut();
};
