import Replicate from 'replicate';

export class ReplicateService {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  async generateRomanticVideo(imageUrl: string): Promise<string> {
    try {
      const input = {
        image: imageUrl,
        prompt: "A romantic scene where two people slowly lean in for a gentle, tender kiss. The camera slowly zooms in capturing this beautiful, intimate moment. Soft romantic lighting, dreamy atmosphere, cinematic quality. The movement should be slow, graceful, and romantic - showing the anticipation and connection between the two people.",
        go_fast: true,
        num_frames: 81,
        resolution: "480p" as const,
        sample_shift: 12,
        frames_per_second: 16,
        interpolate_output: true,
        lora_scale_transformer: 1,
        lora_scale_transformer_2: 1
      };

      console.log('Starting video generation with Replicate...');
      const output = await this.replicate.run("wan-video/wan-2.2-i2v-fast", { input });
      
      if (typeof output === 'string') {
        return output;
      } else if (output && typeof output === 'object' && 'url' in output) {
        return (output as any).url;
      } else if (Array.isArray(output) && output.length > 0) {
        return output[0];
      }
      
      throw new Error('Unexpected output format from Replicate');
    } catch (error) {
      console.error('Error generating video with Replicate:', error);
      throw new Error('Failed to generate romantic video');
    }
  }

  async checkPredictionStatus(predictionId: string): Promise<{
    status: string;
    output?: string;
    error?: string;
  }> {
    try {
      const prediction = await this.replicate.predictions.get(predictionId);
      return {
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
      };
    } catch (error) {
      console.error('Error checking prediction status:', error);
      throw new Error('Failed to check prediction status');
    }
  }
}

export const replicateService = new ReplicateService();
