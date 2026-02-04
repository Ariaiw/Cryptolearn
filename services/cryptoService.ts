import { EncryptedPayload, ExplanationStep, RSAKeyPair } from '../types';

export const generateLog = (title: string, description: string): ExplanationStep => ({
  title,
  description,
  timestamp: Date.now(),
});

type LogCallback = (title: string, desc: string) => void;

// --- UTILS ---

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

const exportPEM = async (key: CryptoKey, type: 'public' | 'private'): Promise<string> => {
  const exported = await crypto.subtle.exportKey(type === 'public' ? "spki" : "pkcs8", key);
  const b64 = arrayBufferToBase64(exported);
  const pemHeader = type === 'public' ? "-----BEGIN PUBLIC KEY-----" : "-----BEGIN PRIVATE KEY-----";
  const pemFooter = type === 'public' ? "-----END PUBLIC KEY-----" : "-----END PRIVATE KEY-----";
  return `${pemHeader}\n${b64.match(/.{1,64}/g)?.join('\n')}\n${pemFooter}`;
};

const importPEM = async (pem: string, type: 'public' | 'private'): Promise<CryptoKey> => {
  // Remove headers, footers and newlines
  const b64 = pem.replace(/-----(BEGIN|END) (PUBLIC|PRIVATE) KEY-----/g, "").replace(/\s/g, "");
  const binary = base64ToArrayBuffer(b64);
  
  return await crypto.subtle.importKey(
    type === 'public' ? "spki" : "pkcs8",
    binary,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    type === 'public' ? ["encrypt"] : ["decrypt"]
  );
};

// --- KEY GEN ---

export const generateRSAKeys = async (): Promise<RSAKeyPair> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await exportPEM(keyPair.publicKey, 'public');
  const privateKey = await exportPEM(keyPair.privateKey, 'private');

  return { publicKey, privateKey };
};

// --- AES ---

export const aesEncrypt = async (plaintext: string, password: string, onLog: LogCallback): Promise<string> => {
  // 1. Salt & IV
  onLog("1. Randomness Generation", "Generating a 16-byte Salt and 12-byte IV using `crypto.getRandomValues`.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Key Derivation
  onLog("2. Key Derivation (PBKDF2)", "Deriving a 256-bit AES key from the password using PBKDF2 (100k iterations).");
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt"]
  );

  // 3. Encryption
  onLog("3. AES-GCM Encryption", "Encrypting plaintext with the derived key.");
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const payload: EncryptedPayload = {
    v: 1,
    algo: "AES-256-GCM",
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedBuffer))
  };

  return btoa(JSON.stringify(payload));
};

export const aesDecrypt = async (base64Json: string, password: string, onLog: LogCallback): Promise<string> => {
  onLog("1. Parsing Payload", "Reading Salt, IV, and Data from JSON.");
  let obj: EncryptedPayload;
  try {
    obj = JSON.parse(atob(base64Json));
  } catch (e) { throw new Error("Invalid Base64/JSON."); }

  if (!obj.salt || !obj.iv || !obj.data) throw new Error("Corrupted AES payload.");

  const salt = new Uint8Array(obj.salt);
  const iv = new Uint8Array(obj.iv);
  const data = new Uint8Array(obj.data);

  onLog("2. Key Derivation", "Re-deriving key from password and extracted Salt.");
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["decrypt"]
  );

  onLog("3. Decryption", "Decrypting data with AES-GCM.");
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedBuffer);
};

// --- HYBRID (RSA + AES) ---

export const hybridEncrypt = async (plaintext: string, publicKeyPem: string, onLog: LogCallback): Promise<string> => {
  // 1. Generate Ephemeral AES Key
  onLog("1. Ephemeral Key Gen", "Generating a random, one-time 256-bit AES-GCM key. This key will encrypt the actual large data.");
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Encrypt Data with AES
  onLog("2. Data Encryption (AES)", "Encrypting the main text payload using the ephemeral AES key.");
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  );

  // 3. Import Recipient Public Key
  onLog("3. Import Public Key", "Parsing the provided RSA Public Key.");
  const rsaKey = await importPEM(publicKeyPem, 'public');

  // 4. Encrypt AES Key with RSA
  onLog("4. Key Wrapping (RSA)", "Encrypting the ephemeral AES key (raw bytes) using the RSA Public Key. This ensures only the holder of the Private Key can read the AES key.");
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaKey,
    rawAesKey
  );

  // 5. Package
  const payload: EncryptedPayload = {
    v: 1,
    algo: "HYBRID-RSA-AES",
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedData)),
    encryptedKey: Array.from(new Uint8Array(encryptedAesKey))
  };

  return btoa(JSON.stringify(payload));
};

export const hybridDecrypt = async (base64Json: string, privateKeyPem: string, onLog: LogCallback): Promise<string> => {
  onLog("1. Parsing Payload", "Extracting Encrypted Key, IV, and Encrypted Data.");
  let obj: EncryptedPayload;
  try {
    obj = JSON.parse(atob(base64Json));
  } catch (e) { throw new Error("Invalid format."); }

  if (!obj.encryptedKey || !obj.iv || !obj.data) throw new Error("Missing hybrid payload fields.");

  const encryptedAesKey = new Uint8Array(obj.encryptedKey);
  const iv = new Uint8Array(obj.iv);
  const encryptedData = new Uint8Array(obj.data);

  // 2. Import Private Key
  onLog("2. Import Private Key", "Parsing your RSA Private Key to prepare for key unwrapping.");
  const rsaKey = await importPEM(privateKeyPem, 'private');

  // 3. Decrypt AES Key
  onLog("3. Key Unwrapping", "Decrypting the AES key bytes using your RSA Private Key.");
  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaKey,
    encryptedAesKey
  );

  // 4. Import AES Key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 5. Decrypt Data
  onLog("4. Data Decryption", "Decrypting the main payload using the recovered AES key.");
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
};