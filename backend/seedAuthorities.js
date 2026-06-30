import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const ATLAS_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  phone: String,
  avatarUrl: { type: String, default: null },
  role: { type: String, enum: ['citizen', 'ward_officer', 'department_head', 'super_admin'], default: 'citizen' },
  department: { type: String, default: null },
  ward: { type: String, default: null },
  zone: { type: String, default: null },
  designation: { type: String, default: null },
  isVerifiedAuthority: { type: Boolean, default: false },
  impactScore: { type: Number, default: 0 },
  reportsSubmitted: { type: Number, default: 0 },
  issuesResolved: { type: Number, default: 0 },
  resolutionScore: { type: Number, default: 0 },
  avgResolutionDays: { type: Number, default: 0 },
  satisfactionRating: { type: Number, default: 0 },
  trustScore: { type: Number, default: 50 },
  isShadowBanned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    areaName: { type: String, default: '' },
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Berni, Uttar Pradesh — Shravasti district area
// Coordinates: approximately 27.3°N, 81.9°E
const BERNI_COORDS = [81.9, 27.3]; // [lng, lat]
const AREA = 'Berni';
const ZONE = 'Shravasti';

const authorities = [
  // Super Admin — District Magistrate level
  {
    name: 'Shri Devendra Kumar Pandey',
    email: 'dm-shravasti@up.gov.in',
    password: 'Admin@1234',
    phone: '9415001001',
    role: 'super_admin',
    department: 'District Administration, Shravasti',
    designation: 'District Magistrate, Shravasti',
    zone: ZONE,
    ward: null,
    isVerifiedAuthority: true,
    impactScore: 340,
    issuesResolved: 28,
    resolutionScore: 88,
    avgResolutionDays: 4.2,
    satisfactionRating: 4.5,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },

  // Department Head — Public Works (PWD)
  {
    name: 'Er. Ramesh Chandra Gupta',
    email: 'ee-pwd-shravasti@up.gov.in',
    password: 'Pwd@1234',
    phone: '9415001002',
    role: 'department_head',
    department: 'Public Works Department (PWD)',
    designation: 'Executive Engineer, PWD Shravasti',
    zone: ZONE,
    ward: null,
    isVerifiedAuthority: true,
    impactScore: 210,
    issuesResolved: 18,
    resolutionScore: 82,
    avgResolutionDays: 6.1,
    satisfactionRating: 4.1,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },

  // Department Head — Jal Nigam (Water)
  {
    name: 'Smt. Anita Srivastava',
    email: 'ee-jalnigam-shravasti@upjn.org',
    password: 'Water@1234',
    phone: '9415001003',
    role: 'department_head',
    department: 'Jal Nigam (Water Supply)',
    designation: 'Executive Engineer, Jal Nigam Shravasti',
    zone: ZONE,
    ward: null,
    isVerifiedAuthority: true,
    impactScore: 180,
    issuesResolved: 14,
    resolutionScore: 79,
    avgResolutionDays: 5.5,
    satisfactionRating: 4.0,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },

  // Department Head — Vidyut Vibhag (Electricity)
  {
    name: 'Shri Ashok Kumar Verma',
    email: 'ae-pvvnl-berni@pvvnl.org',
    password: 'Bijli@1234',
    phone: '9415001004',
    role: 'department_head',
    department: 'Vidyut Vibhag (Electricity)',
    designation: 'Assistant Engineer, PVVNL Berni',
    zone: ZONE,
    ward: null,
    isVerifiedAuthority: true,
    impactScore: 155,
    issuesResolved: 22,
    resolutionScore: 85,
    avgResolutionDays: 3.8,
    satisfactionRating: 4.3,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },

  // Ward Officer — Berni Gram Panchayat
  {
    name: 'Shri Mahendra Prasad Yadav',
    email: 'pradhan-berni@upgov.in',
    password: 'Ward@1234',
    phone: '9415001005',
    role: 'ward_officer',
    department: 'Gram Panchayat, Berni',
    designation: 'Gram Pradhan, Berni Gram Panchayat',
    zone: ZONE,
    ward: 'Berni',
    isVerifiedAuthority: true,
    impactScore: 130,
    issuesResolved: 11,
    resolutionScore: 74,
    avgResolutionDays: 7.2,
    satisfactionRating: 3.9,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },

  // Ward Officer — Sanitation
  {
    name: 'Shri Suresh Kumar',
    email: 'sanitation-berni@upgov.in',
    password: 'San@1234',
    phone: '9415001006',
    role: 'ward_officer',
    department: 'Nagar Panchayat (Sanitation)',
    designation: 'Sanitation Inspector, Berni Block',
    zone: ZONE,
    ward: 'Berni',
    isVerifiedAuthority: true,
    impactScore: 90,
    issuesResolved: 9,
    resolutionScore: 71,
    avgResolutionDays: 5.0,
    satisfactionRating: 3.7,
    location: { type: 'Point', coordinates: BERNI_COORDS, areaName: AREA },
  },
];

async function seed() {
  try {
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to MongoDB Atlas');

    const hashedAuthorities = await Promise.all(
      authorities.map(async (a) => ({
        ...a,
        password: await bcrypt.hash(a.password, 12),
      }))
    );

    let inserted = 0;
    let skipped = 0;
    for (const auth of hashedAuthorities) {
      const exists = await User.findOne({ email: auth.email });
      if (exists) {
        console.log(`Skipping (already exists): ${auth.email}`);
        skipped++;
        continue;
      }
      await User.create(auth);
      console.log(`Created: ${auth.name} (${auth.role})`);
      inserted++;
    }

    console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
