/**
 * SC/ST Quota Compliance Evaluator
 * Continuously evaluates statutory earmarking compliance for a Member of Parliament
 * Category: QUOTA
 */
const { Project, ProjectRecommendation, ScStAreaReference, MpAllocation } = require('../../models');
const { evaluateScStMix } = require('./rules/scStMix');

async function evaluateMpScStStatus(mpId, user = null) {
  const normalizedMpId = (mpId || '').trim().toUpperCase();

  // Find MP's recommendations / projects
  const [recommendations, projects, scStReferences, allocationDoc] = await Promise.all([
    ProjectRecommendation.find({ mp_id: normalizedMpId }).lean(),
    Project.find({ mp_id: normalizedMpId }).lean(),
    ScStAreaReference.find({}).lean(),
    MpAllocation.findOne({ mp_id: normalizedMpId }).lean(),
  ]);

  // Merge projects and recommendations to compute comprehensive proposed outlay
  const projectMap = new Map();
  for (const p of projects) {
    projectMap.set(p.project_id, p);
  }

  const mergedItems = recommendations.map((rec) => {
    const prj = projectMap.get(rec.project_id);
    return {
      project_id: rec.project_id,
      estimated_cost: prj?.sanctioned_cost || rec.estimated_cost,
      state: prj?.state || user?.jurisdiction?.state || 'Madhya Pradesh',
      district: prj?.district || user?.jurisdiction?.district || 'Indore',
      constituency: user?.jurisdiction?.constituency || 'Indore',
      location_area_type: rec.location?.village_ward?.includes('SC')
        ? 'SC_MAJORITY'
        : rec.location?.village_ward?.includes('ST')
        ? 'ST_MAJORITY'
        : 'OTHER',
    };
  });

  // If no recommendations found but projects exist, use projects
  if (mergedItems.length === 0 && projects.length > 0) {
    for (const prj of projects) {
      mergedItems.push({
        project_id: prj.project_id,
        estimated_cost: prj.sanctioned_cost || prj.estimated_cost,
        state: prj.state,
        district: prj.district,
        constituency: prj.district,
        location_area_type: 'OTHER',
      });
    }
  }

  const annualAllocation = allocationDoc?.allocation_amount || 50000000;
  const evaluation = evaluateScStMix(mergedItems, scStReferences, annualAllocation);

  return {
    mp_id: normalizedMpId,
    annual_allocation: annualAllocation,
    recommendations_count: mergedItems.length,
    ...evaluation,
    evaluated_at: new Date(),
  };
}

module.exports = {
  evaluateMpScStStatus,
};

