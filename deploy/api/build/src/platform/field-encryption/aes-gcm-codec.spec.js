"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const aes_gcm_codec_1 = require("./aes-gcm-codec");
describe("aes-gcm-codec", () => {
    const key = (0, node_crypto_1.randomBytes)(32);
    it("round-trips plaintext melalui encrypt lalu decrypt", () => {
        const ciphertext = (0, aes_gcm_codec_1.encryptWithKey)(key, "rahasia medis");
        expect((0, aes_gcm_codec_1.decryptWithKey)(key, ciphertext)).toBe("rahasia medis");
    });
    it("menghasilkan ciphertext BEDA tiap panggilan (IV random, bukan ECB)", () => {
        const a = (0, aes_gcm_codec_1.encryptWithKey)(key, "sama");
        const b = (0, aes_gcm_codec_1.encryptWithKey)(key, "sama");
        expect(a).not.toBe(b);
    });
    it("menolak dekripsi dengan key BEDA (dasar isolasi per-tenant BR-05)", () => {
        const otherKey = (0, node_crypto_1.randomBytes)(32);
        const ciphertext = (0, aes_gcm_codec_1.encryptWithKey)(key, "data tenant A");
        expect(() => (0, aes_gcm_codec_1.decryptWithKey)(otherKey, ciphertext)).toThrow();
    });
    it("menolak ciphertext yang di-tamper (GCM auth tag gagal verifikasi)", () => {
        const ciphertext = (0, aes_gcm_codec_1.encryptWithKey)(key, "data utuh");
        const [iv, authTag, body] = ciphertext.split(":");
        const tamperedBody = Buffer.from(body, "base64");
        tamperedBody[0] ^= 0xff;
        const tampered = [iv, authTag, tamperedBody.toString("base64")].join(":");
        expect(() => (0, aes_gcm_codec_1.decryptWithKey)(key, tampered)).toThrow();
    });
    it("menolak format ciphertext yang tidak lengkap", () => {
        expect(() => (0, aes_gcm_codec_1.decryptWithKey)(key, "cuma-satu-bagian")).toThrow();
    });
    it("menangani string kosong sebagai plaintext valid", () => {
        const ciphertext = (0, aes_gcm_codec_1.encryptWithKey)(key, "");
        expect((0, aes_gcm_codec_1.decryptWithKey)(key, ciphertext)).toBe("");
    });
});
