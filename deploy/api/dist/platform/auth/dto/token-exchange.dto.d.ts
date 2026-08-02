export type GrantType = "authorization_code" | "refresh_token";
export declare class TokenExchangeDto {
    grantType: GrantType;
    code?: string;
    codeVerifier?: string;
}
