// src/common/controllers/csrf.controller.ts

import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../decorators/public.decorator';
import { CSRF_COOKIE_NAME } from '../middleware/csrf.middleware';

@Controller('csrf')
export class CsrfController {
  @Public()
  @Get('token')
  getToken(@Req() req: Request) {
    return { csrfToken: req.cookies?.[CSRF_COOKIE_NAME] };
  }
}
