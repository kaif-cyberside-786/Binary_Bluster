/**
 * AI Service HTTP Client
 * Dispatches analytical requests to the internal Python AI service.
 * Enforces timeout constraints and resilient error handling per rules.md §4, §12, §14.
 * Stateless; never connects to MongoDB directly.
 */
const config = require('../config/env');
const logger = require('../utils/logger');

class AiClient {
  constructor(baseUrl = config.aiServiceUrl, timeoutMs = config.aiServiceTimeoutMs) {
    this.baseUrl = (baseUrl || 'http://localhost:8000').replace(/\/+$/, '');
    this.timeoutMs = timeoutMs || 5000;
  }

  /**
   * Internal helper to execute POST request with abort timeout
   */
  async _post(endpoint, payload) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown AI service response');
        logger.warn(`AI Service endpoint ${endpoint} returned status ${response.status}`, {
          status: response.status,
          detail: errorText,
        });
        return {
          available: false,
          code: 'AI_ANALYSIS_ERROR',
          message: `AI service returned status ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        available: true,
        data,
      };
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err.name === 'AbortError';
      logger.warn(`AI Service unavailable on ${endpoint}: ${isTimeout ? 'Request timed out' : err.message}`);
      return {
        available: false,
        code: 'AI_ANALYSIS_UNAVAILABLE',
        message: isTimeout
          ? 'AI analysis timed out. Structured project information is still shown.'
          : 'AI analysis is temporarily unavailable. Structured project information is still shown.',
      };
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    const url = `${this.baseUrl}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }

  /**
   * AI-01 Cost Anomaly
   */
  async checkCostAnomaly(payload) {
    return this._post('/ai/cost-anomaly', payload);
  }

  /**
   * AI-02 Duplicate / Overlap Check
   */
  async checkDuplicates(payload) {
    return this._post('/ai/duplicate-check', payload);
  }

  /**
   * AI-03 Engineering Specification Comparison
   */
  async checkSpecComparison(payload) {
    return this._post('/ai/spec-comparison', payload);
  }

  /**
   * AI-04 Delay / Staleness Check
   */
  async checkDelay(payload) {
    return this._post('/ai/delay-check', payload);
  }

  /**
   * AI-05 Payment vs Progress Check
   */
  async checkPaymentProgress(payload) {
    return this._post('/ai/payment-progress-check', payload);
  }
}

module.exports = new AiClient();

