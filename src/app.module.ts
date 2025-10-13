import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { PackagesModule } from "./packages/packages.module";
import { OrdersModule } from "./orders/orders.module";
import { PartnershipsModule } from "./partnerships/partnerships.module";
import { PortalModule } from "./portal/portal.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const sslValue = process.env.DATABASE_SSL?.toLowerCase();
        const isSslEnabled = sslValue === "true" || sslValue === "1";

        return {
          type: "postgres" as const,
          host: process.env.DATABASE_HOST || "localhost",
          port: Number(process.env.DATABASE_PORT || 5432),
          username: process.env.DATABASE_USER || "postgres",
          password: process.env.DATABASE_PASSWORD || "postgres",
          database: process.env.DATABASE_NAME || "postgres",
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== "production",
          ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    PackagesModule,
    OrdersModule,
    PartnershipsModule,
    PortalModule,
  ],
})
export class AppModule {}
