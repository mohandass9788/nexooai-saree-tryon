import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it('should add a toast and auto-dismiss after duration', () => {
    vi.useFakeTimers();

    const id = service.showToast('Test Message', 'success', 1000);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Test Message');
    expect(service.toasts()[0].type).toBe('success');

    vi.advanceTimersByTime(1100);
    expect(service.toasts().length).toBe(0);

    vi.useRealTimers();
  });

  it('should support manual toast dismissal', () => {
    const id = service.showToast('Dismiss me', 'error', 10000);
    expect(service.toasts().length).toBe(1);

    service.dismissToast(id);
    expect(service.toasts().length).toBe(0);
  });

  it('should handle modal confirmation resolution (true)', async () => {
    const promise = service.confirm({
      title: 'Delete Item',
      message: 'Are you sure?',
      confirmText: 'Yes',
      cancelText: 'No',
    });

    expect(service.activeDialog()).not.toBeNull();
    expect(service.activeDialog()?.title).toBe('Delete Item');

    service.resolveActiveDialog(true);
    const result = await promise;
    expect(result).toBe(true);
    expect(service.activeDialog()).toBeNull();
  });

  it('should handle modal confirmation cancellation (false)', async () => {
    const promise = service.confirm({
      title: 'Cancel Action',
      message: 'Proceed?',
    });

    service.resolveActiveDialog(false);
    const result = await promise;
    expect(result).toBe(false);
    expect(service.activeDialog()).toBeNull();
  });

  it('should handle modal alert resolution', async () => {
    const promise = service.alert('Notice', 'Information stored', 'Got it');
    expect(service.activeDialog()?.confirmText).toBe('Got it');

    service.resolveActiveDialog(true);
    await promise;
    expect(service.activeDialog()).toBeNull();
  });
});
