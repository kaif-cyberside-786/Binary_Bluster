/**
 * AI Gateway Abstraction (Express Backend)
 * Hides underlying LLM providers (Gemini, Ollama, Mock) behind a provider-neutral interface.
 * Dispatches structured de-identified evidence solely through Python AI service.
 * Enforces architecture.md §13, §15.5 and rules.md §10, §12.
 */
const aiClient = require('./aiClient');
const config = require('../config/env');
const logger = require('../utils/logger');

class AiGateway {
  constructor(provider = config.aiGatewayProvider || 'gemini') {
    this.provider = provider;
  }

  /**
   * Deterministic fallback explanation generated directly from structured evidence
   */
  buildRuleBasedExplanation(overallScore, riskLevel, topContributors = []) {
    const lines = [`Overall Risk: ${riskLevel} — ${overallScore}`];
    if (topContributors && topContributors.length > 0) {
      lines.push('\nMain contributing signals:');
      for (const c of topContributors.slice(0, 3)) {
        const typeName = (c.type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
        lines.push(`• ${typeName} — ${c.severity || 'MEDIUM'}: ${c.reason || 'Elevated variance detected'}.`);
      }
    }
    lines.push('\nReview recommended by authorized administrative official.');
    return lines.join('\n');
  }

  /**
   * Generate natural language explanation for project risk assessment
   * @param {Object} params
   * @param {number} params.overallScore - 0-100 overall score
   * @param {string} params.riskLevel - LOW | MEDIUM | HIGH
   * @param {string} params.category - Work sector
   * @param {Array} params.topContributors - Ranked contributing signals
   * @param {Object} params.evidence - De-identified evidence metrics
   * @returns {Promise<Object>} { status, explanation, provider, model }
   */
  async generateExplanation({
    overallScore,
    riskLevel,
    category = '',
    topContributors = [],
    evidence = {},
    providerOverride = null,
  }) {
    const provider = providerOverride || this.provider;

    const payload = {
      overall_score: overallScore,
      risk_level: riskLevel,
      category,
      top_contributors: topContributors,
      evidence,
      provider,
      model: config.geminiModel,
    };

    try {
      const response = await aiClient.generateExplanation(payload);

      if (!response.available || !response.data) {
        logger.warn('AI Gateway explanation unavailable from microservice, falling back to rule-based copy', {
          code: response.code,
        });

        return {
          status: 'AI_ANALYSIS_UNAVAILABLE',
          explanation:
            'AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.\n\n' +
            this.buildRuleBasedExplanation(overallScore, riskLevel, topContributors),
          provider,
          model: config.geminiModel,
          data_minimized: true,
        };
      }

      return {
        status: response.data.status || 'AI_ANALYSIS_COMPLETE',
        explanation: response.data.explanation || this.buildRuleBasedExplanation(overallScore, riskLevel, topContributors),
        provider: response.data.provider || provider,
        model: response.data.model || config.geminiModel,
        data_minimized: true,
      };
    } catch (err) {
      logger.error('Error invoking AI Gateway explanation', { error: err.message });
      return {
        status: 'AI_ANALYSIS_UNAVAILABLE',
        explanation:
          'AI analysis temporarily unavailable. The risk score and underlying evidence are still available for review.\n\n' +
          this.buildRuleBasedExplanation(overallScore, riskLevel, topContributors),
        provider,
        model: config.geminiModel,
        data_minimized: true,
      };
    }
  }
}

module.exports = new AiGateway();

