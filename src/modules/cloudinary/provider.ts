import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';

export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  useFactory: (configService: ConfigService) => {
    const environment = process.env.NODE_ENV || 'development';

    cloudinary.config({
      cloud_name: configService.get<string>(`${environment}.cloudinary.name`),
      api_key: configService.get<string>(`${environment}.cloudinary.apiKey`),
      api_secret: configService.get<string>(`${environment}.cloudinary.apiSecret`),
    });
    console.log({
      cloud_name: configService.get<string>(`${environment}.cloudinary.name`),
      api_key: configService.get<string>(`${environment}.cloudinary.apiKey`),
      api_secret: configService.get<string>(`${environment}.cloudinary.apiSecret`),
    });
    return cloudinary;
  },
  inject: [ConfigService],
};
