const fs = require('fs');

const rawCode = fs.readFileSync('C:/Users/root/Desktop/PhotoApp.jsx', 'utf8');

function extractBetween(startAnchor, endAnchor) {
  const startIdx = typeof startAnchor === 'number' ? startAnchor : rawCode.indexOf(startAnchor);
  if (startIdx === -1) throw new Error('Start anchor not found: ' + startAnchor);
  const endIdx = typeof endAnchor === 'number' ? endAnchor : rawCode.indexOf(endAnchor, startIdx + (typeof startAnchor === 'string' ? startAnchor.length : 0));
  if (endIdx === -1) throw new Error('End anchor not found: ' + endAnchor);
  return rawCode.slice(startIdx, endIdx).trim();
}

const commonImports = `import React, { useState, useEffect, useRef } from "react";
import { T, STATUS_COLORS, PKG_COLORS, USD_TRY_RATES } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { fmt, fmtShort, fmtDate, fmtDateSh, todayStr, daysLeft, MN, monthOf, yearOf, uid, NUM_FONT } from "../../utils/helpers";
import { MSG_TEMPLATES, PROCESS_STEPS, CEKIM_CHECKLIST, SIRKET, DEFAULT_ADMIN_PASS, DEFAULT_PERSONEL_PASS, MASTER_CODE } from "../../constants/templates";
import { Card, Pill, GoldButton, Field, DatePicker, BottomSheet, EmptyState, PageHeader, Divider, Logo } from "../common";
import { sb, fromDB, toDB } from "../../services/supabase";
import { getPass, setPass, getSession, saveSession, clearSession } from "../../services/storage";
`;

const hizliNot = extractBetween('const HizliNot =', 'const HizliArama =');
const hizliArama = extractBetween('const HizliArama =', 'const GeceModu =');
const geceModu = extractBetween('const GeceModu =', 'const IsAsistani =');
const isAsistani = extractBetween('const IsAsistani =', 'const NotDefteri =');
const notDefteri = extractBetween('const NotDefteri =', 'const MusteriPortali =');
const musteriPortali = extractBetween('const MusteriPortali =', 'const LoginScreen =');
const loginScreen = extractBetween('const LoginScreen =', 'export default function App');

const appModalsCode = `${commonImports}

export ${hizliNot}

export ${hizliArama}

export ${geceModu}

export ${isAsistani}

export ${notDefteri}

export ${musteriPortali}

export ${loginScreen}
`;

fs.writeFileSync('C:/Users/root/Desktop/PhotoApp_Dev/src/components/modules/AppModals.jsx', appModalsCode, 'utf8');
console.log('AppModals cleanly generated!');
