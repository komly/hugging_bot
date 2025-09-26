import { PrismaClient, User, Generation, GenerationStatus, PaymentStatus } from '@prisma/client';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findOrCreateUser(telegramId: string, userData: {
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      // Update user data if it has changed
      return await this.prisma.user.update({
        where: { telegramId },
        data: {
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      });
    }

    return await this.prisma.user.create({
      data: {
        telegramId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });
  }

  async canUserGenerate(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    const totalGenerationsAllowed = 1 + user.paidGenerations;
    return user.generationsUsed < totalGenerationsAllowed;
  }

  async createGeneration(userId: number): Promise<Generation> {
    return await this.prisma.generation.create({
      data: {
        userId,
        status: GenerationStatus.WAITING_PHOTOS,
      },
    });
  }

  async updateGeneration(id: string, data: {
    photo1Url?: string;
    photo2Url?: string;
    romanticImageUrl?: string;
    videoUrl?: string;
    status?: GenerationStatus;
  }): Promise<Generation> {
    return await this.prisma.generation.update({
      where: { id },
      data,
    });
  }

  async getActiveGeneration(userId: number): Promise<Generation | null> {
    return await this.prisma.generation.findFirst({
      where: {
        userId,
        status: {
          in: [
            GenerationStatus.WAITING_PHOTOS,
            GenerationStatus.PROCESSING_PHOTOS,
            GenerationStatus.GENERATING_IMAGE,
            GenerationStatus.GENERATING_VIDEO,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementUserGenerations(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        generationsUsed: {
          increment: 1,
        },
      },
    });
  }

  async addPaidGenerations(userId: number, count: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        paidGenerations: {
          increment: count,
        },
      },
    });
  }

  async createPayment(userId: number, amount: number, generationsCount: number): Promise<string> {
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        generationsCount,
        status: PaymentStatus.PENDING,
      },
    });
    return payment.id;
  }

  async completePayment(paymentId: string, telegramPaymentId: string): Promise<void> {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        telegramPaymentId,
      },
    });

    // Add paid generations to user
    await this.addPaidGenerations(payment.userId, payment.generationsCount);
  }

  async getUserStats(userId: number): Promise<{
    generationsUsed: number;
    paidGenerations: number;
    totalAllowed: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      generationsUsed: user.generationsUsed,
      paidGenerations: user.paidGenerations,
      totalAllowed: 1 + user.paidGenerations,
    };
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const databaseService = new DatabaseService();
