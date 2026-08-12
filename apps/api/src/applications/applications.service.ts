import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ApplicationStatus } from '@visapilot/shared';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  private mockApplications = Array.from({ length: 12 }, (_, i) => ({
    id: `app-${i + 1}`,
    jobId: `job-${i + 1}`,
    userId: 'user-1',
    job: {
      id: `job-${i + 1}`,
      title: ['Senior Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Full-Stack Developer', 'ML Engineer'][i % 6],
      company: { name: ['Google', 'Microsoft', 'Stripe', 'Spotify', 'Shopify', 'Airbnb'][i % 6] },
      location: ['San Francisco, US', 'London, UK', 'Berlin, DE', 'Toronto, CA', 'Sydney, AU', 'Amsterdam, NL'][i % 6],
      visaSponsorship: i % 3 === 0 ? 'SPONSORS' : i % 3 === 1 ? 'CASE_BY_CASE' : 'DOES_NOT_SPONSOR',
    },
    status: [
      ApplicationStatus.SAVED,
      ApplicationStatus.APPLYING,
      ApplicationStatus.APPLIED,
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEWING,
      ApplicationStatus.OFFERED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.ACCEPTED,
    ][i % 8],
    appliedAt: i > 1 ? new Date(Date.now() - i * 3 * 86400000) : undefined,
    interviewDate: i === 4 ? new Date(Date.now() + 5 * 86400000) : undefined,
    notes: i % 3 === 0 ? 'Applied via company website' : undefined,
    createdAt: new Date(Date.now() - i * 86400000),
    updatedAt: new Date(),
  }));

  async getAll(userId: string, params: { status?: string; page: number; limit: number }) {
    let results = [...this.mockApplications];

    if (params.status) {
      results = results.filter((a) => a.status === params.status);
    }

    const total = results.length;
    const start = (params.page - 1) * params.limit;
    const data = results.slice(start, start + params.limit);

    return {
      success: true,
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async create(userId: string, jobId: string, notes?: string) {
    const application = {
      id: `app-${crypto.randomUUID()}`,
      jobId,
      userId,
      status: ApplicationStatus.SAVED,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Application created: ${application.id}`);
    return { success: true, data: application };
  }

  async updateStatus(id: string, status: ApplicationStatus, userId: string) {
    const app = this.mockApplications.find((a) => a.id === id);
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    app.status = status;
    this.logger.log(`Application ${id} status updated to ${status}`);

    return { success: true, data: app };
  }

  async getById(id: string, userId: string) {
    const app = this.mockApplications.find((a) => a.id === id);
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    return { success: true, data: app };
  }

  async getStats(userId: string) {
    const apps = this.mockApplications;
    const statuses = apps.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        total: apps.length,
        byStatus: statuses,
        interviewRate: apps.filter((a) => a.status === ApplicationStatus.INTERVIEWING || a.status === ApplicationStatus.OFFERED).length / apps.length * 100,
        offerRate: apps.filter((a) => a.status === ApplicationStatus.OFFERED || a.status === ApplicationStatus.ACCEPTED).length / apps.length * 100,
      },
    };
  }
}

