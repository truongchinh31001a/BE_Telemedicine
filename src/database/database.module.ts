import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemedicineSchemas } from './schemas/telemedicine.schemas';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ??
          configService.get<string>('MONGO_URI') ??
          'mongodb://127.0.0.1:27017/telemedicine',
      }),
    }),
    MongooseModule.forFeature(TelemedicineSchemas),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
