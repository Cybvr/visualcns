import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  limit,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Owner whose workspace the templates live in. companyId defaults to the uid
// (see lib/users.ts), so we read it off the users doc rather than hardcoding.
const OWNER_EMAIL = 'jide.pinheiro@gmail.com';

// Announcement emails the agency can send to clients. subject is the email
// subject line; body is the HTML shown in the editor. "Hi there," is a safe
// default — the composer swaps it for the recipient's name when one is known.
const templates = [
  {
    id: 'announce-insights',
    name: 'Announcement — Insights',
    subject: 'Introducing Insights in your portal',
    body: [
      '<p>Hi there,</p>',
      '<p>We’ve added a new section to your portal called Insights.</p>',
      '<p>It gives you practical suggestions for growing your business across four areas: your website, your social media, your brand and design, and your content and marketing. Each suggestion is based on your account and the work we’re already doing together, so they’re specific to you rather than generic advice.</p>',
      '<p>You can open Insights any time from your portal, and refresh it whenever you’d like a fresh set of ideas.</p>',
      '<p>Take a look when you have a moment, and let us know which suggestions you’d like us to take on. We’re happy to talk any of them through.</p>',
      '<p><a href="/portal" style="display:inline-block;background:#2856d9;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Open your portal</a></p>',
      '<p>Best regards,<br />The VisualCNS team</p>',
    ].join(''),
  },
];

async function resolveOwner() {
  const snapshot = await getDocs(
    query(collection(db, 'users'), where('email', '==', OWNER_EMAIL), limit(1))
  );
  if (snapshot.empty) throw new Error(`No users doc for ${OWNER_EMAIL}`);
  const owner = snapshot.docs[0];
  const data = owner.data();
  return {
    companyId: data.companyId || owner.id,
    createdBy: owner.id,
    tenantId: data.tenantId || 'legacy-visualcns',
  };
}

async function seed() {
  console.log('Seeding email templates...');
  const { companyId, createdBy, tenantId } = await resolveOwner();
  const updatedAt = new Date().toISOString();

  for (const template of templates) {
    try {
      const record = { ...template, companyId, createdBy, tenantId, updatedAt };
      await setDoc(doc(db, 'emailTemplates', `${companyId}__${template.id}`), record, { merge: true });
      console.log(`Seeded ${template.id}`);
    } catch (e) {
      console.error(`Failed to seed ${template.id}:`, e);
    }
  }
  console.log('Seeding finished.');
  process.exit(0);
}

seed();
