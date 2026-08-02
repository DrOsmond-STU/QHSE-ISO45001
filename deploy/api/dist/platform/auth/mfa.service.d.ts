export declare class MfaService {
    generateSecret(): string;
    getProvisioningUri(accountEmail: string, secret: string, issuer?: string): string;
    verifyToken(secret: string, token: string): boolean;
    encryptSecret(plainSecret: string): string;
    decryptSecret(encrypted: string): string;
}
