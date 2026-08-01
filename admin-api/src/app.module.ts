// src/app.module.ts

import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { CsrfController } from './common/controllers/csrf.controller';

import { AuthController } from './modules/auth.controller';
import { AuthService } from './modules/auth.service';
import { UserController } from './modules/user.controller';
import { UserService } from './modules/user.service';
import { PrismaService } from './prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionModule } from './modules/permission/permission.module';
import { PermissionController } from './modules/permission.controller';
import { PermissionService } from './modules/permission.service';
import { RoleModule } from './modules/role/role.module';
import { RoleController } from './modules/role.controller';
import { RoleService } from './modules/role.service';
import { MediaModule } from './modules/media/media.module';
import { MediaController } from './modules/media.controller';
import { MediaService } from './modules/media.service';
import { CategoryModule } from './modules/category/category.module';
import { CategoryController } from './modules/category.controller';
import { CategoryService } from './modules/category.service';
import { BrandModule } from './modules/brand/brand.module';
import { BrandController } from './modules/brand.controller';
import { BrandService } from './modules/brand.service';
import { AttributeModule } from './modules/attribute/attribute.module';
import { AttributeController } from './modules/attribute.controller';
import { AttributeService } from './modules/attribute.service';
import { ProductModule } from './modules/product/product.module';
import { ProductController } from './modules/product.controller';
import { ProductService } from './modules/product.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    UserModule,
    PermissionModule,
    RoleModule,
    MediaModule,
    CategoryModule,
    BrandModule,
    AttributeModule,
    ProductModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    AuthService,
    UserService,
    PrismaService,
    PermissionService,
    RoleService,
    MediaService,
    CategoryService,
    BrandService,
    AttributeService,
    ProductService,
  ],
  controllers: [
    AuthController,
    UserController,
    PermissionController,
    RoleController,
    MediaController,
    CategoryController,
    BrandController,
    AttributeController,
    ProductController,
    CsrfController, // new: exposes GET /csrf/token
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
