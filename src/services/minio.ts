import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

export class MinioService {
  private client: Minio.Client;
  private bucketName: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'romantic-bot-files';
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      console.error('Error initializing MinIO bucket:', error);
    }
  }

  async uploadFile(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
    try {
      const fileName = `${uuidv4()}-${originalName}`;
      const metaData = {
        'Content-Type': contentType,
      };

      await this.client.putObject(this.bucketName, fileName, buffer, buffer.length, metaData);
      
      // Return the file URL
      return await this.getFileUrl(fileName);
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error('Failed to upload file');
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    try {
      // Generate a presigned URL that expires in 24 hours
      return await this.client.presignedGetObject(this.bucketName, fileName, 24 * 60 * 60);
    } catch (error) {
      console.error('Error generating file URL:', error);
      throw new Error('Failed to generate file URL');
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, fileName);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file from MinIO:', error);
      throw new Error('Failed to download file');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, fileName);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error('Failed to delete file');
    }
  }
}

export const minioService = new MinioService();
