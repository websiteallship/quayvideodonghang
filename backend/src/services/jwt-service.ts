import { SignJWT, jwtVerify } from 'jose';
import { JwtPayload } from '../types/env';

export class JwtService {
  private secret: Uint8Array;

  constructor(secretStr: string) {
    this.secret = new TextEncoder().encode(secretStr);
  }

  async sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInSeconds: number = 3600): Promise<string> {
    return new SignJWT({
      sub: payload.sub,
      ten: payload.ten,
      vai_tro: payload.vai_tro
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${expiresInSeconds}s`)
      .sign(this.secret);
  }

  async verify(token: string): Promise<JwtPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return {
        sub: payload.sub as string,
        ten: (payload as unknown as Record<string, unknown>).ten as string,
        vai_tro: (payload as unknown as Record<string, unknown>).vai_tro as 'admin' | 'nhan_vien',
        iat: payload.iat,
        exp: payload.exp
      };
    } catch {
      return null;
    }
  }
}
