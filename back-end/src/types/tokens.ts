export interface JWTSigningPayload {
  userId: string;
  role: string;
}

export interface TokenPayload extends JWTSigningPayload {
  exp: number;
  iat: number;
} 