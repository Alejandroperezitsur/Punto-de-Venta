import { createLogger } from './structuredLogger';

const logger = createLogger('BackgroundScheduler');

export interface ScheduledTask {
  name: string;
  interval: number;
  handler: () => void | Promise<void>;
  priority: 'critical' | 'normal' | 'low';
}

class BackgroundScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private healthTickTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  register(task: ScheduledTask): void {
    this.tasks.set(task.name, task);
  }

  unregister(name: string): void {
    this.tasks.delete(name);
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const [name, task] of this.tasks) {
      if (task.priority === 'critical') {
        this.timers.set(name, setInterval(() => {
          try { task.handler(); } catch (e) { logger.error(`Task ${name} failed`, e); }
        }, task.interval));
      } else if (task.priority === 'normal') {
        this.timers.set(name, setInterval(() => {
          try { task.handler(); } catch (e) { logger.error(`Task ${name} failed`, e); }
        }, task.interval));
      } else {
        this.timers.set(name, setInterval(() => {
          try { task.handler(); } catch (e) { logger.error(`Task ${name} failed`, e); }
        }, task.interval));
      }
    }

    logger.info(`Background scheduler started with ${this.tasks.size} tasks`);
  }

  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.running = false;
    logger.info('Background scheduler stopped');
  }

  pause(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.running = false;
  }

  resume(): void {
    this.start();
  }

  getRegisteredTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const backgroundScheduler = new BackgroundScheduler();
