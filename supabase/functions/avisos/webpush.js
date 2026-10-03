// Notificações Web Push sem bibliotecas: identificação do servidor (VAPID, RFC 8292)
// e criptografia da mensagem (aes128gcm, RFC 8291). Usa só a Web Crypto, que existe no Deno e no Node.
const enc = new TextEncoder();
export const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const deB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const junta = (...ps) => { const out = new Uint8Array(ps.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of ps) { out.set(p, o); o += p.length; } return out; };
async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}

/** Par de chaves do servidor. A pública vai para o app (applicationServerKey); a privada nunca sai do servidor. */
export async function gerarChaves() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { publica: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), privada: await crypto.subtle.exportKey("jwk", kp.privateKey) };
}

/**
 * Cifra o texto para um aparelho (p256dh e auth vêm da inscrição do navegador).
 * `opc.efemera` e `opc.salt` só existem para os testes reproduzirem o exemplo da RFC.
 */
export async function cifra(texto, p256dh, auth, opc = {}) {
  const ua = deB64u(p256dh), segredo = deB64u(auth);
  const efemera = opc.efemera || (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", efemera.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, efemera.privateKey, 256));
  const ikm = await hkdf(segredo, ecdh, junta(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = opc.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const chave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marca o fim do último (e único) registro.
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chave, junta(enc.encode(texto), new Uint8Array([2]))));
  return junta(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

/** Cabeçalho Authorization que identifica o servidor para o serviço de push do navegador. */
export async function cabecalhoVapid(endpoint, chaves, contato, agoraMs = Date.now()) {
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(agoraMs / 1000) + 12 * 3600, sub: contato })));
  const key = await crypto.subtle.importKey("jwk", chaves.privada, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${h}.${p}`));
  return `vapid t=${h}.${p}.${b64u(sig)}, k=${chaves.publica}`;
}

/** Envia uma notificação. Devolve o status: 201 = entregue ao serviço; 404 ou 410 = a inscrição não existe mais. */
export async function enviaPush(sub, dados, chaves, contato, fetchFn = fetch) {
  const r = await fetchFn(sub.endpoint, { method: "POST", body: await cifra(JSON.stringify(dados), sub.p256dh, sub.auth),
    headers: { Authorization: await cabecalhoVapid(sub.endpoint, chaves, contato), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "normal" } });
  return r.status;
}
