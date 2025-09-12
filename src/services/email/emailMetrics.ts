// File: src/services/email/emailMetrics.ts
export interface EmailMetrics {
  emailsSent: number;
  errors: number;
  totalResponseTime: number;
  averageResponseTime: number;
  lastEmailSent?: Date;
  lastError?: Date;
  errorRate: number;
  templateUsage: Record<string, number>;
}

export class EmailMetricsService {
  private static instance: EmailMetricsService;
  private metrics: EmailMetrics;

  private constructor() {
    this.metrics = {
      emailsSent: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorRate: 0,
      templateUsage: {}
    };
  }

  static getInstance(): EmailMetricsService {
    if (!EmailMetricsService.instance) {
      EmailMetricsService.instance = new EmailMetricsService();
    }
    return EmailMetricsService.instance;
  }

  /**
   * Record successful email send with performance metrics
   */
  recordEmailSent(templateName: string, responseTime: number): void {
    this.metrics.emailsSent++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.emailsSent;
    this.metrics.lastEmailSent = new Date();
    this.metrics.errorRate = this.calculateErrorRate();

    // Track template usage
    this.metrics.templateUsage[templateName] = (this.metrics.templateUsage[templateName] || 0) + 1;
  }

  /**
   * Record email error with details
   */
  recordEmailError(templateName: string, errorMessage: string): void {
    this.metrics.errors++;
    this.metrics.lastError = new Date();
    this.metrics.errorRate = this.calculateErrorRate();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary for monitoring
   */
  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'poor' | 'critical';
    metrics: EmailMetrics;
    alerts: string[];
  } {
    const alerts: string[] = [];
    let status: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';

    // Check error rate (critical > 5%, poor > 2%, good > 1%)
    if (this.metrics.errorRate > 0.05) {
      status = 'critical';
      alerts.push(`High error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    } else if (this.metrics.errorRate > 0.02) {
      status = 'poor';
      alerts.push(`Elevated error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    } else if (this.metrics.errorRate > 0.01) {
      status = 'good';
      alerts.push(`Minor error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    }

    // Check average response time (critical > 2000ms, poor > 1000ms, good > 500ms)
    if (this.metrics.averageResponseTime > 2000) {
      status = status === 'excellent' ? 'critical' : status;
      alerts.push(`Slow response time: ${Math.round(this.metrics.averageResponseTime)}ms`);
    } else if (this.metrics.averageResponseTime > 1000) {
      status = status === 'excellent' ? 'poor' : status;
      alerts.push(`Elevated response time: ${Math.round(this.metrics.averageResponseTime)}ms`);
    } else if (this.metrics.averageResponseTime > 500) {
      status = status === 'excellent' ? 'good' : status;
    }

    return {
      status,
      metrics: this.getMetrics(),
      alerts
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      emailsSent: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorRate: 0,
      templateUsage: {}
    };
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const total = this.metrics.emailsSent + this.metrics.errors;
    return total > 0 ? this.metrics.errors / total : 0;
  }
}