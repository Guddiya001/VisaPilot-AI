import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async getProfile(userId: string) {
    return {
      success: true,
      data: {
        id: userId,
        email: 'user@visapilot.ai',
        name: 'Demo User',
        role: 'USER',
        headline: 'Senior Full-Stack Engineer',
        location: 'San Francisco, CA',
        nationality: 'United States',
        preferredCountries: ['United States', 'Canada', 'United Kingdom', 'Germany'],
        skills: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'GraphQL'],
        languages: [
          { language: 'English', proficiency: 'NATIVE' },
          { language: 'German', proficiency: 'CONVERSATIONAL' },
        ],
        experience: [
          {
            company: 'Tech Corp',
            title: 'Senior Software Engineer',
            startDate: '2020-03-01',
            endDate: null,
            current: true,
            description: 'Led full-stack development team building SaaS platform',
          },
          {
            company: 'StartupXYZ',
            title: 'Software Engineer',
            startDate: '2017-06-01',
            endDate: '2020-02-01',
            current: false,
            description: 'Built and maintained microservices architecture',
          },
        ],
        education: [
          {
            institution: 'MIT',
            degree: 'B.S.',
            field: 'Computer Science',
            startDate: '2013-09-01',
            endDate: '2017-06-01',
          },
        ],
        savedJobsCount: 12,
        applicationsCount: 8,
        interviewsCount: 3,
      },
    };
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    this.logger.log(`Profile updated for user ${userId}`);
    return { success: true, message: 'Profile updated successfully' };
  }

  async getSavedJobs(userId: string) {
    return {
      success: true,
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `saved-${i + 1}`,
        title: ['Senior Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'UX Designer'][i],
        company: { name: ['Google', 'Microsoft', 'Stripe', 'Spotify', 'Shopify'][i] },
        location: ['San Francisco, US', 'London, UK', 'Berlin, DE', 'Toronto, CA', 'Sydney, AU'][i],
        salaryMin: 120000 + i * 15000,
        salaryMax: 180000 + i * 20000,
        savedAt: new Date(Date.now() - i * 86400000),
        visaSponsorship: i % 2 === 0 ? 'SPONSORS' : 'CASE_BY_CASE',
      })),
    };
  }

  async getResumes(userId: string) {
    return {
      success: true,
      data: [
        {
          id: 'resume-1',
          title: 'Software Engineer - General',
          status: 'ACTIVE',
          skills: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS'],
          atsScore: 85,
          lastUpdated: new Date(),
        },
        {
          id: 'resume-2',
          title: 'Senior Full-Stack - EU Focus',
          status: 'ACTIVE',
          skills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'Docker'],
          atsScore: 92,
          lastUpdated: new Date(),
        },
        {
          id: 'resume-3',
          title: 'Machine Learning Engineer',
          status: 'DRAFT',
          skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps'],
          atsScore: 0,
          lastUpdated: new Date(),
        },
      ],
    };
  }

  async getAnalytics(userId: string) {
    return {
      success: true,
      data: {
        overview: {
          totalApplications: 24,
          activeApplications: 8,
          interviews: 5,
          offers: 2,
          rejections: 6,
          responseRate: 45.8,
        },
        weeklyActivity: Array.from({ length: 12 }, (_, i) => ({
          week: `Week ${i + 1}`,
          applications: Math.floor(Math.random() * 5),
          interviews: Math.floor(Math.random() * 2),
          saves: Math.floor(Math.random() * 8),
        })),
        atsScoreTrend: Array.from({ length: 6 }, (_, i) => ({
          month: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][i],
          score: 65 + i * 5 + Math.floor(Math.random() * 5),
        })),
        topSkills: [
          { skill: 'TypeScript', matchRate: 94 },
          { skill: 'React', matchRate: 91 },
          { skill: 'Node.js', matchRate: 88 },
          { skill: 'AWS', matchRate: 76 },
          { skill: 'Python', matchRate: 72 },
        ],
        countriesByApplications: [
          { country: 'United States', count: 10 },
          { country: 'Germany', count: 5 },
          { country: 'Canada', count: 4 },
          { country: 'United Kingdom', count: 3 },
          { country: 'Australia', count: 2 },
        ],
      },
    };
  }
}

