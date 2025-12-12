import { describe, it, expect } from '@jest/globals';
import {
  validateSendMessage,
  validateApprovalRequest,
  validatePollResponse,
  validateBatchNotifications
} from '../config/validation.js';

describe('Input Validation Tests', () => {
  describe('sendMessage validation', () => {
    it('should accept valid message', () => {
      expect(() => {
        validateSendMessage({ text: 'Hello world', priority: 'normal' });
      }).not.toThrow();
    });

    it('should reject empty text', () => {
      expect(() => {
        validateSendMessage({ text: '', priority: 'normal' });
      }).toThrow('text');
    });

    it('should reject missing text', () => {
      expect(() => {
        validateSendMessage({ priority: 'normal' });
      }).toThrow('text');
    });

    it('should reject invalid priority', () => {
      expect(() => {
        validateSendMessage({ text: 'Test', priority: 'urgent' });
      }).toThrow('priority');
    });

    it('should accept valid priorities', () => {
      ['low', 'normal', 'high'].forEach(priority => {
        expect(() => {
          validateSendMessage({ text: 'Test', priority });
        }).not.toThrow();
      });
    });
  });

  describe('sendApprovalRequest validation', () => {
    it('should accept valid approval request', () => {
      expect(() => {
        validateApprovalRequest({
          question: 'Choose one',
          options: [
            { label: 'Option 1', description: 'First' },
            { label: 'Option 2', description: 'Second' }
          ]
        });
      }).not.toThrow();
    });

    it('should reject empty question', () => {
      expect(() => {
        validateApprovalRequest({
          question: '',
          options: [{ label: 'A', description: 'B' }]
        });
      }).toThrow('question');
    });

    it('should reject empty options array', () => {
      expect(() => {
        validateApprovalRequest({
          question: 'Test',
          options: []
        });
      }).toThrow('options');
    });

    it('should reject option without label', () => {
      expect(() => {
        validateApprovalRequest({
          question: 'Test',
          options: [{ description: 'Test' }]
        });
      }).toThrow('label');
    });

    it('should reject option without description', () => {
      expect(() => {
        validateApprovalRequest({
          question: 'Test',
          options: [{ label: 'Test' }]
        });
      }).toThrow('description');
    });

    it('should accept optional header', () => {
      expect(() => {
        validateApprovalRequest({
          question: 'Test',
          options: [{ label: 'A', description: 'B' }],
          header: 'Choose'
        });
      }).not.toThrow();
    });
  });
});
