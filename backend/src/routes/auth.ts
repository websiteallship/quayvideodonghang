import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { comparePin } from '../utils/hash';
import { JwtService } from '../services/jwt-service';
import { authMiddleware } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rate-limiter';
import { LoginRequestSchema } from '../types/schemas';

export const authRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

authRouter.post('/login', loginRateLimiter, zValidator('json', LoginRequestSchema), async (c) => {
  const { ma_nhan_vien, pin } = c.req.valid('json');

  try {
    const userRow = await c.env.DB.prepare(
      'SELECT ma, ten, pin_hash, vai_tro, trang_thai FROM nhan_vien WHERE ma = ?'
    )
      .bind(ma_nhan_vien.toUpperCase())
      .first<{
        ma: string;
        ten: string;
        pin_hash: string;
        vai_tro: 'admin' | 'nhan_vien';
        trang_thai: string;
      }>();

    if (!userRow) {
      return errorResponse(c, 'USER_NOT_FOUND', 'Mã nhân viên không tồn tại', 401);
    }

    if (userRow.trang_thai !== 'hoat_dong') {
      return errorResponse(c, 'ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hoá', 403);
    }

    const isValidPin = await comparePin(pin, userRow.pin_hash);
    if (!isValidPin) {
      return errorResponse(c, 'INVALID_PIN', 'Mã PIN không chính xác', 401);
    }

    const jwtService = new JwtService(c.env.JWT_SECRET);
    const expiresIn = parseInt(c.env.JWT_EXPIRES_IN || '3600', 10);
    const token = await jwtService.sign(
      {
        sub: userRow.ma,
        ten: userRow.ten,
        vai_tro: userRow.vai_tro
      },
      expiresIn
    );

    return successResponse(c, {
      token,
      nhan_vien: {
        ma_nhan_vien: userRow.ma,
        ten: userRow.ten,
        vai_tro: userRow.vai_tro
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'INTERNAL_ERROR', message, 500);
  }
});

authRouter.get('/verify', authMiddleware, async (c) => {
  const user = c.get('user');
  return successResponse(c, {
    nhan_vien: {
      ma_nhan_vien: user.sub,
      ten: user.ten,
      vai_tro: user.vai_tro
    }
  });
});

authRouter.post('/logout', authMiddleware, async (c) => {
  return successResponse(c, { message: 'Đăng xuất thành công' });
});
