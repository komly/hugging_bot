import OpenAI, { toFile } from 'openai';
import axios from 'axios';
import { minioService } from './minio';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateRomanticImage(photo1Url: string, photo2Url: string): Promise<string> {
    try {
      // Download images from URLs
      const [photo1Response, photo2Response] = await Promise.all([
        axios.get(photo1Url, { responseType: 'arraybuffer' }),
        axios.get(photo2Url, { responseType: 'arraybuffer' })
      ]);

      const photo1Buffer = Buffer.from(photo1Response.data);
      const photo2Buffer = Buffer.from(photo2Response.data);

      // Convert buffers to File objects for OpenAI
      const images = [
        await toFile(photo1Buffer, 'photo1.jpg', { type: 'image/jpeg' }),
        await toFile(photo2Buffer, 'photo2.jpg', { type: 'image/jpeg' })
      ];

      const prompt = `Create a beautiful romantic scene combining these two people into one image. Requirements:
      - Both people's faces must be clearly visible and close-up
      - Preserve exact facial features and make them highly recognizable
      - Keep the original appearance and characteristics of each person
      - Place them in a romantic setting like sunset dinner, garden walk, stargazing, or dancing
      - Family-friendly and appropriate content only
      - Photorealistic style with cinematic lighting
      - Beautiful romantic atmosphere
      - The faces should be the main focus and clearly identifiable`;

      console.log('Generating romantic image with gpt-image-1...');
      
      const response = await this.client.images.edit({
        model: 'gpt-image-1',
        image: images,
        prompt: prompt,
      });

      // Get the base64 image and convert to buffer
      if (!response.data || !response.data[0]) {
        throw new Error('No image data received from OpenAI');
      }
      
      const imageBase64 = response.data[0].b64_json;
      if (!imageBase64) {
        throw new Error('No image data received from OpenAI');
      }

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Upload to MinIO and return URL
      const imageUrl = await minioService.uploadFile(
        imageBuffer,
        `romantic_${Date.now()}.png`,
        'image/png'
      );

      return imageUrl;
    } catch (error) {
      console.error('Error generating romantic image:', error);
      throw new Error('Failed to generate romantic image');
    }
  }
}

export const openaiService = new OpenAIService();
