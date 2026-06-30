/**
 * CHARCHA Seed Script
 * ─────────────────────────────────────────────────────────
 * Populates MongoDB with realistic demo data mirroring the
 * Flutter frontend's MockDataService, so the hackathon demo
 * works end-to-end against the real backend.
 *
 * Run with:  npm run seed
 *
 * Creates:
 *  - 1 citizen (Aarav Sharma)
 *  - 3 authority users (super_admin, department_head, ward_officer)
 *  - 5 departments (Nagar Nigam, PWD, Jal Nigam, LES, Traffic Police)
 *  - 6 issues (full lifecycle: Reported → Resolved, with timelines)
 *  - 6 civic alerts
 *  - 6 heatmap zones
 *
 * All passwords: "password123"
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Issue from '../models/Issue.js';
import CivicAlert from '../models/CivicAlert.js';
import HeatmapZone from '../models/HeatmapZone.js';
import Notification from '../models/Notification.js';

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000);
const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
const hoursAhead = (h) => new Date(now + h * 60 * 60 * 1000);

const DEFAULT_PASSWORD = 'password123';

// ─────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────
const users = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Aarav Sharma',
    email: 'aarav.sharma@email.com',
    password: DEFAULT_PASSWORD,
    phone: '+91 98765 43210',
    role: 'citizen',
    reportsSubmitted: 18,
    issuesResolved: 11,
    verificationsSubmitted: 14,
    confirmationsSubmitted: 22,
    impactScore: 287,
    trustScore: 78,
    location: {
      type: 'Point',
      coordinates: [80.9485, 26.8512],
      areaName: 'Indiranagar, Lucknow',
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Dr. Ananya Mishra',
    email: 'commissioner@lucknowmc.gov.in',
    password: DEFAULT_PASSWORD,
    phone: '+91 94150 00001',
    role: 'super_admin',
    department: 'Lucknow Municipal Corporation',
    isVerifiedAuthority: true,
    designation: 'Municipal Commissioner, Lucknow',
    zone: 'Lucknow City',
    escalationLevel: 0,
    impactScore: 920,
    resolutionScore: 88,
    avgResolutionDays: 2.8,
    satisfactionRating: 4.7,
    location: {
      type: 'Point',
      coordinates: [80.9462, 26.8467],
      areaName: 'Lucknow Municipal Corporation',
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Rajesh Verma',
    email: 'ce-pwd@up.gov.in',
    password: DEFAULT_PASSWORD,
    phone: '+91 94150 11223',
    role: 'department_head',
    department: 'Public Works Department (PWD)',
    isVerifiedAuthority: true,
    designation: 'Chief Engineer, PWD Lucknow',
    zone: 'Lucknow City',
    escalationLevel: 0,
    impactScore: 640,
    issuesResolved: 142,
    resolutionScore: 81,
    avgResolutionDays: 3.4,
    satisfactionRating: 4.3,
    location: {
      type: 'Point',
      coordinates: [80.9462, 26.8467],
      areaName: 'PWD Lucknow Circle',
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Imran Khan',
    email: 'ward-hazratganj@lucknowmc.gov.in',
    password: DEFAULT_PASSWORD,
    phone: '+91 94150 44556',
    role: 'ward_officer',
    department: 'Nagar Nigam Lucknow',
    ward: 'Hazratganj',
    zone: 'Central Lucknow',
    isVerifiedAuthority: true,
    designation: 'Ward Officer, Hazratganj',
    escalationLevel: 0,
    impactScore: 410,
    issuesResolved: 67,
    resolutionScore: 74,
    avgResolutionDays: 4.1,
    satisfactionRating: 4.1,
    location: {
      type: 'Point',
      coordinates: [80.9462, 26.8467],
      areaName: 'Hazratganj Ward, Lucknow',
    },
  },
];

// Convenience references
const [aarav, ananya, rajesh, imran] = users;

// ─────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────
const departments = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Nagar Nigam Lucknow',
    responsibilityArea: 'Sanitation, Garbage Collection, Drainage, Roads',
    description:
      'Lucknow Municipal Corporation handles city sanitation, waste management, drainage, and local road maintenance.',
    contact: {
      phone: '+91 522 2654 321',
      email: 'contact@lucknowmc.gov.in',
      website: 'https://lucknowmc.gov.in',
      address: 'Lalbagh, Lucknow, UP 226001',
    },
    handledCategories: ['Garbage', 'Public Infrastructure Damage', 'Water Leakage'],
    serviceArea: 'Lucknow City',
    issueCount: 248,
    head: null, // set below
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Public Works Department (PWD)',
    responsibilityArea: 'Roads, Bridges, Highways, Potholes',
    description:
      'PWD Uttar Pradesh is responsible for construction and maintenance of state highways and major roads.',
    contact: {
      phone: '+91 522 2287 654',
      email: 'ce-pwd-up@up.gov.in',
      website: 'https://pwd.up.gov.in',
      address: 'Nirman Bhawan, Lucknow, UP 226001',
    },
    handledCategories: ['Pothole', 'Public Infrastructure Damage'],
    serviceArea: 'Uttar Pradesh',
    issueCount: 156,
    head: rajesh._id,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Jal Nigam Uttar Pradesh',
    responsibilityArea: 'Water Supply, Pipelines, Leakage',
    description:
      'Jal Nigam manages water supply infrastructure, pipeline maintenance, and water leakage repairs across UP.',
    contact: {
      phone: '+91 522 2234 567',
      email: 'info@jalnigamup.gov.in',
      website: 'https://jalnigam.up.nic.in',
      address: '7-Star House, Vidhan Sabha Marg, Lucknow, UP 226001',
    },
    handledCategories: ['Water Leakage'],
    serviceArea: 'Uttar Pradesh',
    issueCount: 89,
    head: null,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Lucknow Electricity Supply (LES)',
    responsibilityArea: 'Streetlights, Power Supply, Electrical Faults',
    description:
      'LES handles streetlight maintenance, power supply, and electrical infrastructure in Lucknow.',
    contact: {
      phone: '1912',
      email: 'support@lesltd.in',
      website: 'https://lesltd.in',
      address: 'Shakti Bhawan, Ashok Marg, Lucknow, UP 226001',
    },
    handledCategories: ['Broken Streetlight'],
    serviceArea: 'Lucknow City',
    issueCount: 73,
    head: null,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Traffic Police Lucknow',
    responsibilityArea: 'Traffic Management, Signals, Parking',
    description:
      'Lucknow Traffic Police manages traffic flow, signal maintenance, and parking enforcement.',
    contact: {
      phone: '+91 522 2456 789',
      email: 'traffic-lko@uppolice.gov.in',
      website: 'https://uppolice.gov.in',
      address: 'Traffic HQ, Hazratganj, Lucknow, UP 226001',
    },
    handledCategories: ['Public Infrastructure Damage'],
    serviceArea: 'Lucknow City',
    issueCount: 34,
    head: null,
  },
];

const [nagarNigam, pwd, jalNigam, les, traffic] = departments;

// ─────────────────────────────────────────────────────────
// ISSUES
// ─────────────────────────────────────────────────────────
const issues = [
  {
    title: 'Large pothole on MG Road causing accidents',
    description:
      'A deep pothole near the MG Road signal has been causing two-wheelers to skid. Multiple minor accidents reported in the last week. Needs urgent filling.',
    category: 'Pothole',
    severity: 'High',
    status: 'In Progress',
    imageUrl: 'https://images.unsplash.com/photo-1597007030739-6d2e7172ee5b?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9462, 26.8467],
      areaName: 'MG Road, Hazratganj',
    },
    ward: 'Hazratganj',
    suggestedDepartment: 'PWD',
    assignedDepartment: 'PWD',
    assignedTo: rajesh._id,
    assignedOfficer: 'Rajesh Verma',
    isAnonymous: false,
    reporterName: 'Priya Gupta',
    reportedBy: aarav._id,
    confirmationCount: 34,
    supportCount: 156,
    priorityScore: 82,
    priority: 'High',
    escalationLevel: 0,
    dueAt: hoursAhead(24 * 7 - 6),
    isOverdue: false,
    timeline: [
      { status: 'Reported', note: 'Issue reported by citizen with photo evidence', updatedByName: 'Priya Gupta', timestamp: hoursAgo(6) },
      { status: 'Verified', note: 'Issue verified by 34 community confirmations', updatedByName: 'System', timestamp: hoursAgo(4) },
      { status: 'Assigned', note: 'Assigned to PWD Lucknow', updatedByName: 'System', timestamp: hoursAgo(3) },
      { status: 'In Progress', note: 'Repair team dispatched to location', updatedBy: rajesh._id, updatedByName: 'Rajesh Verma', timestamp: hoursAgo(1) },
    ],
  },
  {
    title: 'Garbage pile near community park entrance',
    description:
      'Garbage has not been collected for 5 days near the Indiranagar park. Foul smell and risk of disease outbreak. Children play in this area daily.',
    category: 'Garbage',
    severity: 'Medium',
    status: 'Reported',
    imageUrl: 'https://images.unsplash.com/photo-1604188330237-9a5f7c6a4e7e?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9485, 26.8512],
      areaName: 'Indiranagar Park',
    },
    ward: 'Indiranagar',
    suggestedDepartment: 'Nagar Nigam',
    isAnonymous: true,
    reporterName: null,
    reportedBy: aarav._id,
    confirmationCount: 12,
    supportCount: 47,
    priorityScore: 38,
    priority: 'Medium',
    escalationLevel: 0,
    dueAt: hoursAhead(24 * 7 - 12),
    isOverdue: false,
    timeline: [
      { status: 'Reported', note: 'Issue reported anonymously', updatedByName: 'Community Member', timestamp: hoursAgo(12) },
    ],
  },
  {
    title: 'Streetlight broken on entire lane',
    description:
      'The streetlight on Lane 3, Gomti Nagar has been non-functional for 2 weeks. Area is pitch dark at night, safety concern for women and elderly.',
    category: 'Broken Streetlight',
    severity: 'High',
    status: 'Resolved',
    imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2ad1c2b1?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9500, 26.8520],
      areaName: 'Lane 3, Gomti Nagar',
    },
    ward: 'Gomti Nagar',
    suggestedDepartment: 'Electricity Department',
    assignedDepartment: 'Electricity Department',
    assignedTo: rajesh._id,
    assignedOfficer: 'Rajesh Verma',
    isAnonymous: false,
    reporterName: 'Mohit Singh',
    reportedBy: aarav._id,
    confirmationCount: 28,
    supportCount: 89,
    priorityScore: 64,
    priority: 'High',
    escalationLevel: 0,
    dueAt: daysAgo(5 - 7),
    isOverdue: false,
    resolutionImageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2ad1c2b1?w=800&sat=-100',
    resolutionNote: 'Streetlight replaced with new LED unit. Tested and working. Area now well-lit at night.',
    resolvedBy: rajesh._id,
    resolvedAt: hoursAgo(20),
    resolutionVerificationCount: 23,
    resolutionDisputeCount: 2,
    timeline: [
      { status: 'Reported', note: 'Issue reported with photo', updatedByName: 'Mohit Singh', timestamp: daysAgo(5) },
      { status: 'Verified', note: 'Verified by 28 community confirmations', updatedByName: 'System', timestamp: daysAgo(4) },
      { status: 'Assigned', note: 'Assigned to Electricity Department', updatedByName: 'System', timestamp: daysAgo(3) },
      { status: 'In Progress', note: 'Electrician team dispatched', updatedBy: rajesh._id, updatedByName: 'Rajesh Verma', timestamp: daysAgo(2) },
      { status: 'Resolved', note: 'Streetlight replaced and tested. After photo uploaded.', updatedBy: rajesh._id, updatedByName: 'Rajesh Verma', timestamp: hoursAgo(20) },
    ],
  },
  {
    title: 'Water leakage from main pipeline',
    description:
      'Continuous water leakage from the main pipeline near Charbagh station. Wasting thousands of liters daily. Road is waterlogged.',
    category: 'Water Leakage',
    severity: 'Critical',
    status: 'Assigned',
    imageUrl: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9340, 26.8390],
      areaName: 'Charbagh Station Road',
    },
    ward: 'Charbagh',
    suggestedDepartment: 'Jal Nigam',
    assignedDepartment: 'Jal Nigam',
    isAnonymous: false,
    reporterName: 'Sneha Reddy',
    reportedBy: aarav._id,
    confirmationCount: 56,
    supportCount: 203,
    priorityScore: 95,
    priority: 'Critical',
    escalationLevel: 0,
    dueAt: hoursAhead(24 * 7 - 18),
    isOverdue: false,
    timeline: [
      { status: 'Reported', note: 'Critical issue reported', updatedByName: 'Sneha Reddy', timestamp: hoursAgo(18) },
      { status: 'Verified', note: 'Verified by 56 confirmations - high priority', updatedByName: 'System', timestamp: hoursAgo(15) },
      { status: 'Assigned', note: 'Assigned to Jal Nigam - urgent', updatedByName: 'System', timestamp: hoursAgo(2) },
    ],
  },
  {
    title: 'Damaged footpath near school',
    description:
      'Footpath tiles are broken and uneven near City Montessori School. Risk of tripping for school children. Needs immediate repair.',
    category: 'Public Infrastructure Damage',
    severity: 'Medium',
    status: 'Verified',
    imageUrl: 'https://images.unsplash.com/photo-1531176175280-33e81d6b6a7e?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9550, 26.8600],
      areaName: 'Station Road, Aliganj',
    },
    ward: 'Aliganj',
    suggestedDepartment: 'Nagar Nigam',
    isAnonymous: true,
    reporterName: null,
    reportedBy: aarav._id,
    confirmationCount: 19,
    supportCount: 62,
    priorityScore: 45,
    priority: 'Medium',
    escalationLevel: 0,
    dueAt: hoursAhead(24 * 7 - 48),
    isOverdue: false,
    timeline: [
      { status: 'Reported', note: 'Issue reported anonymously', updatedByName: 'Community Member', timestamp: daysAgo(2) },
      { status: 'Verified', note: 'Verified by 19 community confirmations', updatedByName: 'System', timestamp: hoursAgo(20) },
    ],
  },
  {
    title: 'Overflowing drain causing waterlogging',
    description:
      'Drain near Aminabad market is overflowing onto the road. Dirty water causing health hazard and traffic disruption.',
    category: 'Water Leakage',
    severity: 'High',
    status: 'In Progress',
    imageUrl: 'https://images.unsplash.com/photo-1574359411659-8b1c2c0a5e7e?w=800',
    location: {
      type: 'Point',
      coordinates: [80.9400, 26.8470],
      areaName: 'Aminabad Market',
    },
    ward: 'Aminabad',
    suggestedDepartment: 'Nagar Nigam',
    assignedDepartment: 'Nagar Nigam',
    assignedTo: rajesh._id,
    assignedOfficer: 'Rajesh Verma',
    isAnonymous: false,
    reporterName: 'Vikram Patel',
    reportedBy: aarav._id,
    confirmationCount: 41,
    supportCount: 128,
    priorityScore: 71,
    priority: 'High',
    escalationLevel: 0,
    dueAt: hoursAhead(24 * 7 - 72),
    isOverdue: false,
    timeline: [
      { status: 'Reported', note: 'Issue reported', updatedByName: 'Vikram Patel', timestamp: daysAgo(3) },
      { status: 'Verified', note: 'Verified by 41 confirmations', updatedByName: 'System', timestamp: daysAgo(2) },
      { status: 'Assigned', note: 'Assigned to Nagar Nigam', updatedByName: 'System', timestamp: daysAgo(2) },
      { status: 'In Progress', note: 'Drain cleaning in progress', updatedBy: rajesh._id, updatedByName: 'Rajesh Verma', timestamp: hoursAgo(5) },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// CIVIC ALERTS
// ─────────────────────────────────────────────────────────
const alerts = [
  {
    title: 'Water Supply Disruption',
    message:
      'Water supply will be disrupted in Indiranagar and nearby areas from 10 AM to 4 PM today due to pipeline maintenance by Jal Nigam.',
    type: 'outage',
    areaName: 'Indiranagar, Lucknow',
    location: { type: 'Point', coordinates: [80.9485, 26.8512] },
    source: 'Jal Nigam Uttar Pradesh',
    expiresAt: hoursAhead(5),
    affectedCount: 1200,
  },
  {
    title: 'Pothole Repair Completed on MG Road',
    message:
      'The pothole near MG Road signal has been repaired by PWD. 23 citizens have verified the resolution. Thank you for reporting!',
    type: 'achievement',
    areaName: 'MG Road, Hazratganj',
    location: { type: 'Point', coordinates: [80.9462, 26.8467] },
    source: 'CHARCHA AI',
    affectedCount: 156,
  },
  {
    title: 'Dengue Prevention Advisory',
    message:
      'With monsoon approaching, Nagar Nigam urges residents to clear stagnant water. Free fogging available on request — call 1916.',
    type: 'advisory',
    areaName: 'Lucknow City',
    location: { type: 'Point', coordinates: [80.9462, 26.8467] },
    source: 'Nagar Nigam Lucknow',
    affectedCount: 0,
  },
  {
    title: 'High-Priority Issue Detected Nearby',
    message:
      'AI detected a Critical water leakage near Charbagh Station affecting 200+ residents. Jal Nigam has been auto-assigned.',
    type: 'warning',
    areaName: 'Charbagh Station Road',
    location: { type: 'Point', coordinates: [80.9340, 26.8390] },
    source: 'CHARCHA AI',
    affectedCount: 203,
  },
  {
    title: 'Streetlight Repair Scheduled',
    message:
      'Electricity Department has scheduled repair of broken streetlights in Gomti Nagar Lane 3 for tomorrow between 2–5 PM.',
    type: 'update',
    areaName: 'Gomti Nagar, Lucknow',
    location: { type: 'Point', coordinates: [80.9500, 26.8520] },
    source: 'Lucknow Electricity Supply (LES)',
    affectedCount: 89,
  },
  {
    title: 'Community Cleanup Drive This Sunday',
    message:
      "Join the community cleanup drive at Aminabad Market this Sunday 7 AM. Nagar Nigam will provide equipment. Let's keep our neighbourhood clean!",
    type: 'advisory',
    areaName: 'Aminabad Market',
    location: { type: 'Point', coordinates: [80.9400, 26.8470] },
    source: 'Nagar Nigam Lucknow',
    affectedCount: 0,
  },
];

// ─────────────────────────────────────────────────────────
// HEATMAP ZONES
// ─────────────────────────────────────────────────────────
const heatmapZones = [
  {
    areaName: 'Hazratganj',
    location: { type: 'Point', coordinates: [80.9462, 26.8467] },
    radiusKm: 1.5,
    healthScore: 72,
    totalIssues: 48,
    resolvedIssues: 35,
    openIssues: 13,
    avgResolutionDays: 3.2,
    topCategory: 'Pothole',
  },
  {
    areaName: 'Indiranagar',
    location: { type: 'Point', coordinates: [80.9485, 26.8512] },
    radiusKm: 1.2,
    healthScore: 58,
    totalIssues: 62,
    resolvedIssues: 36,
    openIssues: 26,
    avgResolutionDays: 5.1,
    topCategory: 'Garbage',
  },
  {
    areaName: 'Gomti Nagar',
    location: { type: 'Point', coordinates: [80.9500, 26.8520] },
    radiusKm: 2.0,
    healthScore: 81,
    totalIssues: 34,
    resolvedIssues: 28,
    openIssues: 6,
    avgResolutionDays: 2.4,
    topCategory: 'Broken Streetlight',
  },
  {
    areaName: 'Charbagh',
    location: { type: 'Point', coordinates: [80.9340, 26.8390] },
    radiusKm: 1.8,
    healthScore: 28,
    totalIssues: 95,
    resolvedIssues: 27,
    openIssues: 68,
    avgResolutionDays: 9.7,
    topCategory: 'Water Leakage',
  },
  {
    areaName: 'Aminabad',
    location: { type: 'Point', coordinates: [80.9400, 26.8470] },
    radiusKm: 1.3,
    healthScore: 44,
    totalIssues: 71,
    resolvedIssues: 31,
    openIssues: 40,
    avgResolutionDays: 6.8,
    topCategory: 'Water Leakage',
  },
  {
    areaName: 'Aliganj',
    location: { type: 'Point', coordinates: [80.9550, 26.8600] },
    radiusKm: 1.6,
    healthScore: 65,
    totalIssues: 42,
    resolvedIssues: 27,
    openIssues: 15,
    avgResolutionDays: 4.3,
    topCategory: 'Public Infrastructure Damage',
  },
];

// ─────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Wipe collections (idempotent re-seed)
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Issue.deleteMany({}),
      CivicAlert.deleteMany({}),
      HeatmapZone.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // Hash passwords
    console.log('👥 Seeding users...');
    const salt = await bcrypt.genSalt(10);
    for (const u of users) {
      u.password = await bcrypt.hash(u.password, salt);
    }
    await User.insertMany(users);

    // Set Nagar Nigam head to the ward officer (Imran) for demo richness
    departments[0].head = imran._id;
    console.log('🏛️  Seeding departments...');
    await Department.insertMany(departments);

    console.log('📋 Seeding issues...');
    await Issue.insertMany(issues);

    console.log('🔔 Seeding civic alerts...');
    await CivicAlert.insertMany(alerts);

    console.log('🗺️  Seeding heatmap zones...');
    await HeatmapZone.insertMany(heatmapZones);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅  CHARCHA DATABASE SEEDED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Users:        ${users.length}`);
    console.log(`  Departments:  ${departments.length}`);
    console.log(`  Issues:        ${issues.length}`);
    console.log(`  Alerts:        ${alerts.length}`);
    console.log(`  Heatmap zones: ${heatmapZones.length}`);
    console.log('───────────────────────────────────────────────────');
    console.log('  DEMO LOGIN CREDENTIALS (password: password123)');
    console.log('───────────────────────────────────────────────────');
    console.log('  👤 Citizen:           aarav.sharma@email.com');
    console.log('  🛡️  Super Admin:      commissioner@lucknowmc.gov.in');
    console.log('  🏛️  Dept Head (PWD):  ce-pwd@up.gov.in');
    console.log('  📍 Ward Officer:      ward-hazratganj@lucknowmc.gov.in');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedDatabase();
