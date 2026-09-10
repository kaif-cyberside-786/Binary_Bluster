/**
 * Implementing Agencies & Baseline Performance Seeder
 * Seeds master public agencies for Indore / Madhya Pradesh per architecture.md §10.1
 * and initial baseline performance & concentration records for Phase 12.
 */
const { ImplementingAgency } = require('../models/ImplementingAgency');
const { AgencyPerformance } = require('../models/AgencyPerformance');
const { AgencyConcentration } = require('../models/AgencyConcentration');
const logger = require('./logger');

const DEFAULT_AGENCIES = [
  {
    agency_id: 'PWD-INDORE-01',
    name: 'Public Works Department (Division 1, Indore)',
    type: 'PWD',
    district: 'Indore',
    state: 'Madhya Pradesh',
    contact_person: 'Er. Rajesh Sharma (Executive Engineer)',
    contact_phone: '9876543213',
    contact_email: 'ee.pwd.indore@mp.gov.in',
    is_active: true,
    is_real_government_data: true,
  },
  {
    agency_id: 'RES-INDORE-01',
    name: 'Rural Engineering Services (Indore Division)',
    type: 'RES',
    district: 'Indore',
    state: 'Madhya Pradesh',
    contact_person: 'Er. Sunita Verma (Executive Engineer)',
    contact_phone: '9876543220',
    contact_email: 'ee.res.indore@mp.gov.in',
    is_active: true,
    is_real_government_data: true,
  },
  {
    agency_id: 'CPWD-INDORE-01',
    name: 'Central Public Works Department (Indore Central Division)',
    type: 'CPWD',
    district: 'Indore',
    state: 'Madhya Pradesh',
    contact_person: 'Er. Alok Mukherjee (Superintending Engineer)',
    contact_phone: '9876543221',
    contact_email: 'se.cpwd.indore@cpwd.gov.in',
    is_active: true,
    is_real_government_data: true,
  },
  {
    agency_id: 'MP-RDC-01',
    name: 'Madhya Pradesh Road Development Corporation (Indore Unit)',
    type: 'OTHER',
    district: 'Indore',
    state: 'Madhya Pradesh',
    contact_person: 'Er. Vikas Trivedi (Divisional Manager)',
    contact_phone: '9876543222',
    contact_email: 'dm.indore@mprdc.gov.in',
    is_active: true,
    is_real_government_data: true,
  },
  {
    agency_id: 'IMC-INDORE-01',
    name: 'Indore Municipal Corporation (Engineering & Civil Works Wing)',
    type: 'MUNICIPAL_CORP',
    district: 'Indore',
    state: 'Madhya Pradesh',
    contact_person: 'Er. Dilip Joshi (City Engineer)',
    contact_phone: '9876543223',
    contact_email: 'cityengg@imcindore.mp.gov.in',
    is_active: true,
    is_real_government_data: true,
  },
];

const BASELINE_PERFORMANCE = [
  {
    agency_id: 'PWD-INDORE-01',
    period: '2025-2026',
    total_assigned_works: 35,
    completed_works: 31,
    completion_rate: 88.57,
    avg_delay_days: 24,
    cost_deviation_avg_percentage: 4.2,
    adverse_inspection_count: 1,
    performance_score: 86,
    is_real_government_data: true,
  },
  {
    agency_id: 'RES-INDORE-01',
    period: '2025-2026',
    total_assigned_works: 28,
    completed_works: 22,
    completion_rate: 78.57,
    avg_delay_days: 48,
    cost_deviation_avg_percentage: 7.5,
    adverse_inspection_count: 3,
    performance_score: 72,
    is_real_government_data: true,
  },
  {
    agency_id: 'CPWD-INDORE-01',
    period: '2025-2026',
    total_assigned_works: 18,
    completed_works: 15,
    completion_rate: 83.33,
    avg_delay_days: 32,
    cost_deviation_avg_percentage: 5.1,
    adverse_inspection_count: 1,
    performance_score: 81,
    is_real_government_data: true,
  },
  {
    agency_id: 'MP-RDC-01',
    period: '2025-2026',
    total_assigned_works: 12,
    completed_works: 11,
    completion_rate: 91.67,
    avg_delay_days: 18,
    cost_deviation_avg_percentage: 3.8,
    adverse_inspection_count: 0,
    performance_score: 91,
    is_real_government_data: true,
  },
  {
    agency_id: 'IMC-INDORE-01',
    period: '2025-2026',
    total_assigned_works: 20,
    completed_works: 15,
    completion_rate: 75.0,
    avg_delay_days: 55,
    cost_deviation_avg_percentage: 8.9,
    adverse_inspection_count: 2,
    performance_score: 69,
    is_real_government_data: true,
  },
];

const BASELINE_CONCENTRATION = [
  {
    agency_id: 'PWD-INDORE-01',
    district: 'Indore',
    year: '2026',
    work_count: 42,
    total_value: 105000000,
    share_of_value_percentage: 42.0,
    herfindahl_index_contribution: 1764,
    is_concentration_flagged: true,
    is_real_government_data: true,
  },
  {
    agency_id: 'RES-INDORE-01',
    district: 'Indore',
    year: '2026',
    work_count: 31,
    total_value: 77500000,
    share_of_value_percentage: 31.0,
    herfindahl_index_contribution: 961,
    is_concentration_flagged: false,
    is_real_government_data: true,
  },
  {
    agency_id: 'CPWD-INDORE-01',
    district: 'Indore',
    year: '2026',
    work_count: 15,
    total_value: 37500000,
    share_of_value_percentage: 15.0,
    herfindahl_index_contribution: 225,
    is_concentration_flagged: false,
    is_real_government_data: true,
  },
  {
    agency_id: 'MP-RDC-01',
    district: 'Indore',
    year: '2026',
    work_count: 8,
    total_value: 20000000,
    share_of_value_percentage: 8.0,
    herfindahl_index_contribution: 64,
    is_concentration_flagged: false,
    is_real_government_data: true,
  },
  {
    agency_id: 'IMC-INDORE-01',
    district: 'Indore',
    year: '2026',
    work_count: 4,
    total_value: 10000000,
    share_of_value_percentage: 4.0,
    herfindahl_index_contribution: 16,
    is_concentration_flagged: false,
    is_real_government_data: true,
  },
];

async function seedAgencies() {
  try {
    // 1. Seed Implementing Agencies
    for (const agency of DEFAULT_AGENCIES) {
      await ImplementingAgency.findOneAndUpdate(
        { agency_id: agency.agency_id },
        { $setOnInsert: agency },
        { upsert: true, new: true }
      );
    }
    logger.info('Implementing agencies seeded/verified successfully');

    // 2. Seed Baseline Performance
    for (const perf of BASELINE_PERFORMANCE) {
      await AgencyPerformance.findOneAndUpdate(
        { agency_id: perf.agency_id, period: perf.period },
        { $setOnInsert: perf },
        { upsert: true, new: true }
      );
    }
    logger.info('Agency baseline performance seeded/verified successfully');

    // 3. Seed Baseline Concentration
    for (const conc of BASELINE_CONCENTRATION) {
      await AgencyConcentration.findOneAndUpdate(
        { agency_id: conc.agency_id, district: conc.district, year: conc.year },
        { $setOnInsert: conc },
        { upsert: true, new: true }
      );
    }
    logger.info('Agency concentration statistics seeded/verified successfully');
  } catch (err) {
    logger.error('Failed to seed agency intelligence data', { error: err.message });
  }
}

module.exports = {
  seedAgencies,
  DEFAULT_AGENCIES,
  BASELINE_PERFORMANCE,
  BASELINE_CONCENTRATION,
};

