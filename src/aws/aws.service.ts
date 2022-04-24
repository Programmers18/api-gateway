import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class AwsService {
  private logger = new Logger(AwsService.name);
  constructor(private readonly configService: ConfigService) { }

  async uploadArchivo(file: any, id: string) {
    const AWS_S3_BUCKET_NAME = this.configService.get<string>('AWS_S3_BUCKET_NAME')
    const AWS_REGION = this.configService.get<string>('AWS_REGION')
    const AWS_ACCESS_KEY = this.configService.get<string>('AWS_ACCESS_KEY')
    const AWS_SECRET_ACCESS_KEY = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')

    const s3 = new AWS.S3({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });

    const fileExtension = file.originalname.split('.')[1];
    const urlKey = `${id}.${fileExtension}`;

    this.logger.log(`urlKey: ${urlKey}`);

    const params = {
      Body: file.buffer,
      Bucket: AWS_S3_BUCKET_NAME,
      Key: urlKey,
    };

    const data = s3
      .putObject(params)
      .promise()
      .then(
        (data) => {
          return {
            url: `https://${AWS_S3_BUCKET_NAME}.s3-${AWS_REGION}.amazonaws.com/${urlKey}`
          };
        },
        (err) => {
          this.logger.error(err);
          return err;
        },
      );

    return data;
  }
}
