// Event encryption/decryption utilities
// Uses hybrid encryption (RSA + AES) like email encryption

import { EncryptedField, CalendarEvent, Calendar, DecryptedEvent, DecryptedCalendar } from "./calendar-api";

/**
 * Base64 encode helper
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 decode helper
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/**
 * Import RSA public key from JWK for encryption
 */
async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
}

/**
 * Import RSA private key from JWK for decryption
 */
async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
}

/**
 * Encrypt a string field using hybrid encryption (RSA + AES)
 * Same approach as email encryption
 */
export async function encryptField(
  plaintext: string,
  publicKeyJwk: JsonWebKey
): Promise<EncryptedField> {
  // Generate random AES key
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the plaintext with AES-GCM
  const encoder = new TextEncoder();
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    aesKey,
    encoder.encode(plaintext)
  );

  // Export AES key as raw bytes
  const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES key with RSA public key
  const publicKey = await importPublicKey(publicKeyJwk);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    aesKeyRaw
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength)),
    encryptedKey: arrayBufferToBase64(encryptedKey),
  };
}

/**
 * Decrypt an encrypted field using hybrid decryption
 */
export async function decryptField(
  encrypted: EncryptedField,
  privateKeyJwk: JsonWebKey
): Promise<string> {
  // Validate input
  if (!encrypted || !encrypted.encryptedKey || !encrypted.ciphertext || !encrypted.iv) {
    throw new Error("Invalid encrypted field structure");
  }
  if (encrypted.encryptedKey.length === 0 || encrypted.ciphertext.length === 0) {
    throw new Error("Encrypted data is empty");
  }

  const privateKey = await importPrivateKey(privateKeyJwk);

  // Decrypt AES key with RSA private key
  const encryptedKeyBuffer = base64ToArrayBuffer(encrypted.encryptedKey);
  const aesKeyBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuffer
  );

  // Import AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt ciphertext with AES key
  const ciphertextBuffer = base64ToArrayBuffer(encrypted.ciphertext);
  const ivBuffer = base64ToArrayBuffer(encrypted.iv);
  const ivArray = new Uint8Array(ivBuffer);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivArray as Uint8Array<ArrayBuffer> },
    aesKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Decrypt a calendar's encrypted fields
 */
export async function decryptCalendar(
  calendar: Calendar,
  privateKeyJwk: JsonWebKey
): Promise<DecryptedCalendar> {
  const name = await decryptField(calendar.name, privateKeyJwk);

  return {
    _id: calendar._id,
    user: calendar.user,
    name,
    color: calendar.color,
    isDefault: calendar.isDefault,
    isVisible: calendar.isVisible,
    createdAt: calendar.createdAt,
    updatedAt: calendar.updatedAt,
  };
}

/**
 * Decrypt an event's encrypted fields
 */
export async function decryptEvent(
  event: CalendarEvent,
  privateKeyJwk: JsonWebKey
): Promise<DecryptedEvent> {
  const title = await decryptField(event.title, privateKeyJwk);
  
  let description = "";
  if (event.description) {
    try {
      description = await decryptField(event.description, privateKeyJwk);
    } catch (e) {
      console.warn("Failed to decrypt event description:", e);
    }
  }

  let location = "";
  if (event.location) {
    try {
      location = await decryptField(event.location, privateKeyJwk);
    } catch (e) {
      console.warn("Failed to decrypt event location:", e);
    }
  }

  // Handle calendar reference (might be populated or just an ID)
  let calendarId: string;
  let calendarColor: string;
  
  if (typeof event.calendar === "string") {
    calendarId = event.calendar;
    calendarColor = "#3b82f6"; // Default color
  } else {
    calendarId = event.calendar._id;
    calendarColor = event.calendar.color;
  }

  return {
    _id: event._id,
    calendarId,
    calendarColor,
    title,
    description,
    location,
    startTime: new Date(event.startTime),
    endTime: new Date(event.endTime),
    isAllDay: event.isAllDay,
    timezone: event.timezone,
    reminders: event.reminders,
    status: event.status,
    sourceType: event.sourceType,
  };
}

/**
 * Decrypt multiple events
 */
export async function decryptEvents(
  events: CalendarEvent[],
  privateKeyJwk: JsonWebKey
): Promise<DecryptedEvent[]> {
  const decrypted: DecryptedEvent[] = [];
  
  for (const event of events) {
    try {
      const decryptedEvent = await decryptEvent(event, privateKeyJwk);
      decrypted.push(decryptedEvent);
    } catch (e) {
      console.error("Failed to decrypt event:", event._id, e);
    }
  }
  
  return decrypted;
}

/**
 * Decrypt multiple calendars
 */
export async function decryptCalendars(
  calendars: Calendar[],
  privateKeyJwk: JsonWebKey
): Promise<DecryptedCalendar[]> {
  const decrypted: DecryptedCalendar[] = [];
  
  for (const calendar of calendars) {
    try {
      const decryptedCalendar = await decryptCalendar(calendar, privateKeyJwk);
      decrypted.push(decryptedCalendar);
    } catch (e) {
      console.error("Failed to decrypt calendar:", calendar._id, e);
    }
  }
  
  return decrypted;
}


