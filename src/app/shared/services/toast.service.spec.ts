import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with no toasts', () => {
    expect(service.toasts()).toHaveLength(0);
  });

  it('should add a toast on show()', () => {
    service.show('Hello');
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('Hello');
    expect(service.toasts()[0].level).toBe('info');
  });

  it('should add a success toast via success()', () => {
    service.success('Saved!');
    expect(service.toasts()[0].level).toBe('success');
  });

  it('should add an error toast via error()', () => {
    service.error('Failed!');
    expect(service.toasts()[0].level).toBe('error');
  });

  it('should auto-dismiss after 3 seconds', () => {
    service.show('Auto dismiss');
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('should manually dismiss a toast by id', () => {
    service.show('Keep');
    service.show('Remove');
    const removeId = service.toasts()[1].id;
    service.dismiss(removeId);
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('Keep');
  });

  it('should support multiple toasts at once', () => {
    service.show('One');
    service.show('Two');
    service.show('Three');
    expect(service.toasts()).toHaveLength(3);
  });
});
