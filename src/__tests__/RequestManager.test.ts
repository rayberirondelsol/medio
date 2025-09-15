import { RequestManager } from '../utils/axiosConfig';

describe('RequestManager', () => {
  beforeEach(() => {
    // Clear all controllers before each test
    RequestManager.cancelAllRequests();
  });

  describe('createController', () => {
    it('should create a new AbortController', () => {
      const controller = RequestManager.createController('test');
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal).toBeDefined();
      expect(controller.signal.aborted).toBe(false);
    });

    it('should cancel existing controller with same key', () => {
      const controller1 = RequestManager.createController('test');
      const abortSpy = jest.spyOn(controller1, 'abort');
      
      const controller2 = RequestManager.createController('test');
      
      expect(abortSpy).toHaveBeenCalled();
      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(false);
    });

    it('should handle multiple different keys', () => {
      const controller1 = RequestManager.createController('key1');
      const controller2 = RequestManager.createController('key2');
      const controller3 = RequestManager.createController('key3');
      
      expect(controller1.signal.aborted).toBe(false);
      expect(controller2.signal.aborted).toBe(false);
      expect(controller3.signal.aborted).toBe(false);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a specific request', () => {
      const controller = RequestManager.createController('test');
      const abortSpy = jest.spyOn(controller, 'abort');
      
      RequestManager.cancelRequest('test');
      
      expect(abortSpy).toHaveBeenCalled();
      expect(controller.signal.aborted).toBe(true);
    });

    it('should handle canceling non-existent request', () => {
      // Should not throw error
      expect(() => {
        RequestManager.cancelRequest('non-existent');
      }).not.toThrow();
    });

    it('should remove controller after canceling', () => {
      const controller1 = RequestManager.createController('test');
      RequestManager.cancelRequest('test');
      
      const controller2 = RequestManager.createController('test');
      // If the old controller was properly removed, the new one should not be aborted
      expect(controller2.signal.aborted).toBe(false);
    });
  });

  describe('cancelAllRequests', () => {
    it('should cancel all active requests', () => {
      const controller1 = RequestManager.createController('test1');
      const controller2 = RequestManager.createController('test2');
      const controller3 = RequestManager.createController('test3');
      
      const abort1Spy = jest.spyOn(controller1, 'abort');
      const abort2Spy = jest.spyOn(controller2, 'abort');
      const abort3Spy = jest.spyOn(controller3, 'abort');
      
      RequestManager.cancelAllRequests();
      
      expect(abort1Spy).toHaveBeenCalled();
      expect(abort2Spy).toHaveBeenCalled();
      expect(abort3Spy).toHaveBeenCalled();
      
      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(true);
      expect(controller3.signal.aborted).toBe(true);
    });

    it('should clear all controllers', () => {
      RequestManager.createController('test1');
      RequestManager.createController('test2');
      
      RequestManager.cancelAllRequests();
      
      // Creating new controllers with same keys should work fine
      const newController1 = RequestManager.createController('test1');
      const newController2 = RequestManager.createController('test2');
      
      expect(newController1.signal.aborted).toBe(false);
      expect(newController2.signal.aborted).toBe(false);
    });

    it('should handle empty controller map', () => {
      // Should not throw error
      expect(() => {
        RequestManager.cancelAllRequests();
      }).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle rapid creation and cancellation', () => {
      for (let i = 0; i < 10; i++) {
        const controller = RequestManager.createController(`test-${i}`);
        expect(controller.signal.aborted).toBe(false);
      }
      
      RequestManager.cancelAllRequests();
      
      // All should be canceled, and we should be able to create new ones
      for (let i = 0; i < 10; i++) {
        const controller = RequestManager.createController(`test-${i}`);
        expect(controller.signal.aborted).toBe(false);
      }
    });

    it('should handle reusing same key multiple times', () => {
      const controllers = [];
      
      for (let i = 0; i < 5; i++) {
        const controller = RequestManager.createController('reused-key');
        controllers.push(controller);
      }
      
      // All but the last should be aborted
      for (let i = 0; i < controllers.length - 1; i++) {
        expect(controllers[i].signal.aborted).toBe(true);
      }
      expect(controllers[controllers.length - 1].signal.aborted).toBe(false);
    });
  });
});