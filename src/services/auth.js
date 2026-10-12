// ════════════════════════════════════════════════
// HESAP & STÜDYO (Supabase Auth)
// Aynı e-posta/şifreyle telefondan ve bilgisayardan giriş yapılır, aynı veri görülür.
// ════════════════════════════════════════════════
import { supabase, sb } from "./supabase";

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

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorText(error));
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
