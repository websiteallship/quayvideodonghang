import { Hono } from 'hono';
import { Env } from '../types/env';
import { successResponse } from '../utils/response';

export const configRouter = new Hono<{
  Bindings: Env;
}>();

configRouter.get('/public', async (c) => {
  return successResponse(c, {
    app_name: 'Quay Video Kho Vận',
    version: '1.0.0',
    don_vi_vc: ['GHN', 'ViettelPost', 'BestExpress', 'NhatTin', 'LazadaExpress', 'ShopeeXpress', 'J&T', 'VNPost', 'GHTK', 'Khac'],
    max_duration_seconds: 600,
    chunk_size: parseInt(c.env.UPLOAD_CHUNK_SIZE || '5242880', 10)
  });
});
