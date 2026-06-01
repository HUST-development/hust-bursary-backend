import { Injectable, Inject } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(@Inject('CLOUDINARY') private cloudinaryService: typeof cloudinary) {}

  async uploadImage(file: Express.Multer.File, filePath: string, folder: string): Promise<UploadApiResponse> {
    console.log(file, filePath, folder);
    return new Promise((resolve, reject) => {
      this.cloudinaryService.uploader
        .upload_stream({ folder, public_id: filePath }, (error, result: UploadApiResponse) => {
          if (error) {
            console.log(error);
            return reject(error);
          }
          return resolve(result);
        })
        .end(file.buffer);
    });
  }
}
