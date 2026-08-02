export interface LocalStorageTokenPayload {
    key: string;
    contentType?: string;
    exp: number;
}
export declare function createLocalStorageToken(payload: LocalStorageTokenPayload, secret: string): string;
export declare function verifyLocalStorageToken(token: string, secret: string): LocalStorageTokenPayload | null;
