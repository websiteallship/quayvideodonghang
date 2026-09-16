import { createMiddleware } from 'hono/factory';
import { Env, JwtPayload } from '../types/env';
import { JwtService } from '../services/jwt-service';
import { errorResponse } from '../utils/response';

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(c, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc thiếu Bearer token', 401);
  }

  const token = authHeader.slice(7).trim();
  const jwtService = new JwtService(c.env.JWT_SECRET);
  const payload = await jwtService.verify(token);

  if (!payload) {
    return errorResponse(c, 'TOKEN_INVALID', 'Token không hợp lệ hoặc đã hết hạn', 401);
  }

  c.set('user', payload);
  await next();
});

export const requireAdminMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>(async (c, next) => {
  const user = c.get('user');
  if (!user || user.vai_tro !== 'admin') {
    return errorResponse(c, 'FORBIDDEN', 'Bạn không có quyền quản trị viên', 403);
  }
  await next();
});
