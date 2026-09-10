/**
 * Default Users Seeder
 * Seeds standard accounts representing all 7 roles if the users collection is empty.
 */
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const logger = require('./logger');

const DEFAULT_USERS = [
  {
    user_id: 'ADMIN001',
    official_email: 'admin@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'Platform System Administrator',
    role: 'ADMIN',
    designation: 'Senior Technical Director (NIC/MoSPI)',
    phone: '9876543210',
    jurisdiction: { level: 'NATIONAL' },
  },
  {
    user_id: 'MP-IND-01',
    official_email: 'mp.indore@sansad.nic.in',
    password: 'Demo@12345',
    full_name: 'Hon. Member of Parliament (Indore)',
    role: 'MP',
    designation: 'Member of Parliament (Lok Sabha)',
    phone: '9876543211',
    jurisdiction: {
      level: 'CONSTITUENCY',
      state: 'Madhya Pradesh',
      constituency: 'Indore',
    },
  },
  {
    user_id: 'DA-IND-01',
    official_email: 'collector.indore@mp.gov.in',
    password: 'Demo@12345',
    full_name: 'District Collector & Magistrate',
    role: 'DISTRICT_AUTHORITY',
    designation: 'District Collector',
    phone: '9876543212',
    jurisdiction: {
      level: 'DISTRICT',
      state: 'Madhya Pradesh',
      district: 'Indore',
    },
  },
  {
    user_id: 'AG-PWD-01',
    official_email: 'ee.pwd.indore@mp.gov.in',
    password: 'Demo@12345',
    full_name: 'Executive Engineer (PWD Division 1)',
    role: 'IMPLEMENTING_AGENCY',
    designation: 'Executive Engineer',
    phone: '9876543213',
    jurisdiction: {
      level: 'AGENCY',
      agency_id: 'PWD-INDORE-01',
      district: 'Indore',
      state: 'Madhya Pradesh',
    },
  },
  {
    user_id: 'SA-MP-01',
    official_email: 'sna.mplads@mp.gov.in',
    password: 'Demo@12345',
    full_name: 'State Nodal Officer (MPLADS Cell)',
    role: 'STATE_NODAL_AUTHORITY',
    designation: 'Joint Secretary (Planning)',
    phone: '9876543214',
    jurisdiction: {
      level: 'STATE',
      state: 'Madhya Pradesh',
    },
  },
  {
    user_id: 'MIN-DIID-01',
    official_email: 'diid.director@mospi.gov.in',
    password: 'Demo@12345',
    full_name: 'Director (DIID, MoSPI)',
    role: 'MINISTRY',
    designation: 'Director (Data Informatics & Innovation)',
    phone: '9876543215',
    jurisdiction: { level: 'NATIONAL' },
  },
  {
    user_id: 'AUD-CAG-01',
    official_email: 'sr.auditor@cag.gov.in',
    password: 'Demo@12345',
    full_name: 'Senior Audit Officer (Central Audit)',
    role: 'AUDITOR',
    designation: 'Senior Audit Officer',
    phone: '9876543216',
    jurisdiction: { level: 'NATIONAL' },
  },
  // SIH Demo Quick-Fill Accounts (matching LoginPage.jsx quick-login buttons)
  {
    user_id: 'USR-ADMIN-01',
    official_email: 'usr.admin.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'System Administrator (Demo)',
    role: 'ADMIN',
    designation: 'Technical Director (NIC/MoSPI)',
    phone: '9876543220',
    jurisdiction: { level: 'NATIONAL' },
  },
  {
    user_id: 'USR-MP-01',
    official_email: 'usr.mp.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'Hon. Member of Parliament (Indore Demo)',
    role: 'MP',
    designation: 'Member of Parliament (Lok Sabha)',
    phone: '9876543221',
    jurisdiction: {
      level: 'CONSTITUENCY',
      state: 'Madhya Pradesh',
      constituency: 'Indore',
    },
  },
  {
    user_id: 'USR-DIST-01',
    official_email: 'usr.dist.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'District Collector & Magistrate (Indore Demo)',
    role: 'DISTRICT_AUTHORITY',
    designation: 'District Collector',
    phone: '9876543222',
    jurisdiction: {
      level: 'DISTRICT',
      state: 'Madhya Pradesh',
      district: 'Indore',
    },
  },
  {
    user_id: 'USR-AGENCY-01',
    official_email: 'usr.agency.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'Executive Engineer (RES Indore Demo)',
    role: 'IMPLEMENTING_AGENCY',
    designation: 'Executive Engineer',
    phone: '9876543223',
    jurisdiction: {
      level: 'AGENCY',
      agency_id: 'RES-INDORE-01',
      district: 'Indore',
      state: 'Madhya Pradesh',
    },
  },
  {
    user_id: 'USR-STATE-01',
    official_email: 'usr.state.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'State Nodal Officer (MPLADS Cell Demo)',
    role: 'STATE_NODAL_AUTHORITY',
    designation: 'Joint Secretary (Planning)',
    phone: '9876543224',
    jurisdiction: {
      level: 'STATE',
      state: 'Madhya Pradesh',
    },
  },
  {
    user_id: 'USR-MINISTRY-01',
    official_email: 'usr.ministry.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'Director (DIID, MoSPI Demo)',
    role: 'MINISTRY',
    designation: 'Director (Data Informatics & Innovation)',
    phone: '9876543225',
    jurisdiction: { level: 'NATIONAL' },
  },
  {
    user_id: 'USR-AUDITOR-01',
    official_email: 'usr.auditor.01@mplads.gov.in',
    password: 'Demo@12345',
    full_name: 'Senior Audit Officer (Central Audit Demo)',
    role: 'AUDITOR',
    designation: 'Senior Audit Officer',
    phone: '9876543226',
    jurisdiction: { level: 'NATIONAL' },
  },
];

async function seedDefaultUsers() {
  try {
    for (const u of DEFAULT_USERS) {
      const existing = await User.findOne({ user_id: u.user_id });
      const password_hash = await bcrypt.hash(u.password, 12);

      if (!existing) {
        const user = new User({
          user_id: u.user_id,
          official_email: u.official_email,
          password_hash,
          full_name: u.full_name,
          role: u.role,
          designation: u.designation,
          phone: u.phone,
          jurisdiction: u.jurisdiction,
          is_active: true,
          failed_login_attempts: 0,
          lockout_until: null,
        });
        await user.save();
        logger.info(`Seeded user account: ${u.user_id} (${u.role})`);
      } else {
        // Ensure specified test credentials and jurisdiction remain synchronized
        existing.password_hash = password_hash;
        existing.is_active = true;
        existing.failed_login_attempts = 0;
        existing.lockout_until = null;
        existing.jurisdiction = u.jurisdiction;
        await existing.save();
      }
    }

    // Ensure existing sanctioned works in Indore have implementing_agency_id assigned
    const { Project } = require('../models');
    if (Project) {
      await Project.updateMany(
        {
          district: new RegExp('^indore$', 'i'),
          status: { $in: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] },
          $or: [
            { implementing_agency_id: null },
            { implementing_agency_id: { $exists: false } },
            { implementing_agency_id: '' },
          ],
        },
        { $set: { implementing_agency_id: 'PWD-INDORE-01' } }
      );
    }

    logger.info('Default user accounts verified and synchronized for 7 platform roles.');
  } catch (err) {
    logger.error('Failed to seed default users', { error: err.message });
  }
}

module.exports = {
  seedDefaultUsers,
  DEFAULT_USERS,
};

