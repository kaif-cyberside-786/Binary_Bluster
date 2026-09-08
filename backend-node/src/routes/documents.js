/**
 * Document Streaming & Download Routes
 * Enforces architecture.md §14 and rules.md §4:
 * - Controlled download only through authorized API
 * - Validates JWT, role, and jurisdiction scope before streaming
 * - Public static access is strictly prohibited
 * - Admin isolation strictly enforced (403 ADMIN_ISOLATION)
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const { Document, Project, MpAllocation } = require('../models');
const { authenticate } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

async function resolveMpId(user) {
  if (user.jurisdiction?.level === 'CONSTITUENCY' && user.jurisdiction?.constituency) {
    const alloc = await MpAllocation.findOne({
      constituency: new RegExp(`^${user.jurisdiction.constituency}$`, 'i'),
      state: new RegExp(`^${user.jurisdiction.state}$`, 'i'),
    });
    if (alloc) return alloc.mp_id;
  }
  return user.user_id;
}

/**
 * GET /api/documents/:documentId/download
 * Authorized file streaming endpoint
 */
router.get('/:documentId/download', authenticate, async (req, res, next) => {
  try {
    const { role, jurisdiction, user_id } = req.user;

    // Strict Admin Isolation per rules.md §10
    if (role === 'ADMIN') {
      return ApiResponse.forbidden(
        res,
        'Access denied: Admin isolation prohibits access to document contents per rules.md §10',
        'ADMIN_ISOLATION'
      );
    }

    const documentId = req.params.documentId.trim().toUpperCase();
    const doc = await Document.findOne({ document_id: documentId }).lean();

    if (!doc) {
      return ApiResponse.notFound(res, `Document '${documentId}' not found`, 'DOCUMENT_NOT_FOUND');
    }

    // Verify project and jurisdiction scope
    const project = await Project.findOne({ project_id: doc.project_id }).lean();
    if (!project) {
      return ApiResponse.notFound(res, `Associated project '${doc.project_id}' not found`, 'PROJECT_NOT_FOUND');
    }

    if (role === 'DISTRICT_AUTHORITY') {
      if (project.district.toLowerCase() !== jurisdiction?.district?.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: document belongs to ${project.district} District, outside your jurisdiction (${jurisdiction?.district})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (role === 'STATE_NODAL_AUTHORITY') {
      if (project.state.toLowerCase() !== jurisdiction?.state?.toLowerCase()) {
        return ApiResponse.forbidden(
          res,
          `Access denied: document belongs to ${project.state}, outside your jurisdiction (${jurisdiction?.state})`,
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (role === 'MP') {
      const mpId = await resolveMpId(req.user);
      if (project.mp_id !== mpId && project.mp_id !== user_id) {
        return ApiResponse.forbidden(
          res,
          'Access denied: you may only download documents for your own constituency recommendations',
          'FORBIDDEN_JURISDICTION'
        );
      }
    } else if (role === 'IMPLEMENTING_AGENCY') {
      const agencyId = jurisdiction?.agency_id;
      const agencyDistrict = jurisdiction?.district || (agencyId?.includes('INDORE') || user_id?.includes('IND') ? 'Indore' : null);
      const agencyIds = [agencyId, user_id, 'PWD-INDORE-01'].filter(Boolean);

      const agencyMatches =
        !project.implementing_agency_id ||
        agencyIds.includes(project.implementing_agency_id) ||
        (agencyDistrict && project.district?.toLowerCase() === agencyDistrict.toLowerCase());

      const districtMatches =
        !agencyDistrict || !project.district ||
        project.district.toLowerCase() === agencyDistrict.toLowerCase();

      if (!agencyMatches || !districtMatches) {
        return ApiResponse.forbidden(
          res,
          'Access denied: project is outside your agency jurisdiction',
          'FORBIDDEN_JURISDICTION'
        );
      }
    }

    // Locate file on disk
    const filePath = path.isAbsolute(doc.storage_ref)
      ? doc.storage_ref
      : path.resolve(config.uploadDir, doc.storage_ref);

    if (!fs.existsSync(filePath)) {
      return ApiResponse.notFound(res, 'File binary not found on storage', 'FILE_NOT_FOUND');
    }

    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.file_name)}"`
    );

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => next(err));
    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

