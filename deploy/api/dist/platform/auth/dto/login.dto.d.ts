export declare class LoginDto {
    email: string;
    password: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
    state?: string;
    totpCode?: string;
}
