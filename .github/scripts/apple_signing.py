#!/usr/bin/env python3
"""
STÜDYOM — CI için App Store dağıtım imzası (Mac'siz, cihazsız hesap).

Her yayın derlemesinde App Store Connect API ile:
  1. Önceki CI derlemelerinden kalan dağıtım sertifikalarını (en yenisi hariç) ve "STUDYOM CI" profillerini temizler.
     (Ekibin Mac'i yok; imza yalnızca bu iş akışında yapılır. En yenisi bırakılır ki önceki yükleme Apple'da
     işlenirken imzası geçerli kalsın. Apple'ın dağıtım sertifikası sınırı 3'tür.)
  2. Yeni bir anahtar + CSR üretir, "Apple Distribution" sertifikası alır.
  3. com.gesblabs.studyom için "App Store" provizyon profili oluşturur.
  4. Sertifikayı geçici bir anahtar zincirine, profili Xcode'un klasörüne kurar.
  5. Uygulama hedefinin Release ayarını elle imzaya çevirir (Swift paketlerine dokunmadan).

Ortam değişkenleri: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, APPLE_TEAM_ID, RUNNER_TEMP, GITHUB_ENV, GITHUB_RUN_NUMBER
Gizli bilgileri asla yazdırmaz.
"""
import base64, json, os, re, secrets, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path

import jwt  # PyJWT

BUNDLE_ID = "com.gesblabs.studyom"
PROFILE_PREFIX = "STUDYOM CI"
API = "https://api.appstoreconnect.apple.com/v1"
OPENSSL = "/usr/bin/openssl"  # macOS'un LibreSSL'i: anahtar zinciriyle uyumlu .p12 üretir
PBXPROJ = Path("ios/App/App.xcodeproj/project.pbxproj")

env = os.environ
TMP = Path(env["RUNNER_TEMP"]) / "signing"
TMP.mkdir(parents=True, exist_ok=True)


def token():
    # Secret'lara yapıştırırken gelen boşluk/satır sonlarını temizle (Xcode bunları kendisi kırpıyor)
    key = Path(env["ASC_KEY_PATH"]).read_text().strip() + chr(10)
    now = int(time.time()) - 30  # saat farkına karşı küçük pay
    return jwt.encode({"iss": env["ASC_ISSUER_ID"].strip(), "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"},
                      key, algorithm="ES256", headers={"kid": env["ASC_KEY_ID"].strip(), "typ": "JWT"})


def api(method, path, body=None):
    req = urllib.request.Request(API + path if path.startswith("/") else path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        try:
            detail = "; ".join(f'{x.get("title")}: {x.get("detail")}' for x in json.loads(detail).get("errors", []))
        except Exception:
            pass
        sys.exit(f"::error::App Store Connect API {method} {path.split('?')[0]} → {e.code}: {detail}")


def run(*cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def gh_env(k, v):
    with open(env["GITHUB_ENV"], "a") as f:
        f.write(f"{k}={v}\n")


def cleanup_old():
    # Eski CI profilleri
    for p in api("GET", f"/profiles?limit=200&fields[profiles]=name")["data"]:
        if p["attributes"]["name"].startswith(PROFILE_PREFIX):
            api("DELETE", f"/profiles/{p['id']}")
            print(f"Eski profil silindi: {p['attributes']['name']}")
    # Dağıtım sertifikaları: en yenisi kalsın, gerisi geri alınsın
    certs = [c for c in api("GET", "/certificates?limit=200")["data"]
             if c["attributes"].get("certificateType") in ("DISTRIBUTION", "IOS_DISTRIBUTION")]
    certs.sort(key=lambda c: c["attributes"].get("expirationDate") or "", reverse=True)
    for c in certs[1:]:
        api("DELETE", f"/certificates/{c['id']}")
        print(f"Eski dağıtım sertifikası geri alındı (son kullanma {c['attributes'].get('expirationDate', '?')[:10]})")


def create():
    cleanup_old()

    # Anahtar + CSR
    key, csr = TMP / "dist.key", TMP / "dist.csr"
    run(OPENSSL, "genrsa", "-out", str(key), "2048", stderr=subprocess.DEVNULL)
    run(OPENSSL, "req", "-new", "-key", str(key), "-out", str(csr), "-subj", "/CN=STUDYOM CI/C=TR")

    cert = api("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
        "certificateType": "DISTRIBUTION", "csrContent": csr.read_text()}}})["data"]
    der = TMP / "dist.cer"
    der.write_bytes(base64.b64decode(cert["attributes"]["certificateContent"]))
    print(f"Dağıtım sertifikası alındı: {cert['attributes'].get('name', '')}")

    # Paket kimliği
    bids = api("GET", f"/bundleIds?filter[identifier]={BUNDLE_ID}&limit=50")["data"]
    bid = next((b for b in bids if b["attributes"]["identifier"] == BUNDLE_ID), None)
    if not bid:
        sys.exit(f"::error::{BUNDLE_ID} paket kimliği bulunamadı (developer.apple.com → Identifiers)")

    name = f"{PROFILE_PREFIX} {env.get('GITHUB_RUN_NUMBER', '0')}"
    prof = api("POST", "/profiles", {"data": {"type": "profiles",
        "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid["id"]}},
                          "certificates": {"data": [{"type": "certificates", "id": cert["id"]}]}}}})["data"]
    content = base64.b64decode(prof["attributes"]["profileContent"])
    uuid = prof["attributes"]["uuid"]
    for d in (Path.home() / "Library/MobileDevice/Provisioning Profiles",
              Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"):
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{uuid}.mobileprovision").write_bytes(content)
    print(f"App Store profili kuruldu: {name}")

    # Geçici anahtar zinciri
    pem, p12 = TMP / "dist.pem", TMP / "dist.p12"
    pw = secrets.token_hex(16)
    run(OPENSSL, "x509", "-inform", "DER", "-in", str(der), "-out", str(pem))
    run(OPENSSL, "pkcs12", "-export", "-inkey", str(key), "-in", str(pem), "-out", str(p12), "-passout", f"pass:{pw}")
    kc = str(TMP / "studyom.keychain-db")
    run("security", "create-keychain", "-p", pw, kc)
    run("security", "set-keychain-settings", "-lut", "21600", kc)
    run("security", "unlock-keychain", "-p", pw, kc)
    run("security", "import", str(p12), "-k", kc, "-P", pw, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
    # Apple ara sertifikası (WWDR G3) — imza zinciri için
    wwdr = TMP / "AppleWWDRCAG3.cer"
    urllib.request.urlretrieve("https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer", wwdr)
    subprocess.run(["security", "import", str(wwdr), "-k", kc], check=False)
    existing = subprocess.run(["security", "list-keychains", "-d", "user"], capture_output=True, text=True).stdout
    run("security", "list-keychains", "-d", "user", "-s", kc, *[x.strip().strip('"') for x in existing.split() if x.strip()])
    run("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", pw, kc,
        stdout=subprocess.DEVNULL)
    for f in (key, csr, pem, p12):
        f.unlink(missing_ok=True)

    # Yalnızca uygulama hedefinin Release ayarı: elle imza
    s = PBXPROJ.read_text()
    blocks = list(re.finditer(r"\t\t[0-9A-F]{24} /\* Release \*/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = \{\n(.*?)\n\t\t\t\};\n\t\t\tname = Release;", s, re.S))
    target = [b for b in blocks if f"PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE_ID};" in b.group(1)]
    if len(target) != 1:
        sys.exit("::error::Uygulama hedefinin Release ayarı bulunamadı")
    body = target[0].group(1)
    body = re.sub(r"\t\t\t\t(CODE_SIGN_STYLE|CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER|\"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]\") = [^\n]*;\n?", "", body)
    body = (f'\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n'
            f'\t\t\t\tCODE_SIGN_STYLE = Manual;\n'
            f'\t\t\t\tDEVELOPMENT_TEAM = {env["APPLE_TEAM_ID"].strip()};\n'
            f'\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{name}";\n' + body)
    s = s[:target[0].start(1)] + body + s[target[0].end(1):]
    PBXPROJ.write_text(s)
    print("Uygulama hedefi elle imzaya ayarlandı")

    gh_env("SIGN_PROFILE_NAME", name)
    gh_env("SIGN_KEYCHAIN", kc)


def teardown():
    kc = env.get("SIGN_KEYCHAIN")
    if kc:
        subprocess.run(["security", "delete-keychain", kc], check=False)
    print("Geçici anahtar zinciri silindi (sertifika bir sonraki derlemede temizlenir)")


if __name__ == "__main__":
    {"create": create, "teardown": teardown}[sys.argv[1]]()
