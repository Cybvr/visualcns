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

// A styled button, baked straight into the email body so it shows in the editor
// and code view and travels with the template.
function ctaButton(url, text) {
  return `<p><a href="${url}" style="display:inline-block;background:#2856d9;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${text}</a></p>`;
}

// Announcement email the agency can send to clients. "Hi there," is a safe
// default — the composer swaps it for the recipient's name when one is known.
const announcementTemplates = [
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
      ctaButton('/portal', 'Open your portal'),
      '<p>Best regards,<br />The VisualCNS team</p>',
    ].join(''),
  },
];

// Marketing ad campaigns. Each concept ships as a film photo (9:16) and a text
// card (1:1) -> eight templates. subject is the headline, body the subheading,
// followed by a "Book a call" button.
const AD_CTA = 'https://cal.com/pinheirojide/30min';
const adConcepts = [
  { key: 'ai-build', subject: 'AI can build it. We make it work.', body: 'Custom tools your business can trust.', photoAlt: 'A Nigerian coffee shop owner checks a blue dashboard on her laptop.' },
  { key: 'anyone-build', subject: 'Anyone can build a tool now. Can you trust it?', body: 'We build the ones that hold up.', photoAlt: 'A Nigerian apparel studio owner beside a laptop showing a blue dashboard.' },
  { key: 'dashboard-right', subject: 'Your dashboard looks right. Is it?', body: 'We build tools that get the numbers right.', photoAlt: 'A Nigerian print studio owner checking figures on a laptop.' },
  { key: 'ten-tools', subject: 'You built ten tools. None of them talk.', body: 'We build one system that works.', photoAlt: 'A Nigerian shop owner holding a tablet showing one unified blue dashboard.' },
];
const adFormats = [
  { suffix: 'photo', label: 'photo 9:16' },
  { suffix: 'text', label: 'text 1:1' },
];
const adTemplates = adConcepts.flatMap((c) =>
  adFormats.map((f) => {
    const id = `ad-${c.key}-${f.suffix}`;
    return {
      id,
      name: `Ad — ${c.subject} (${f.label})`,
      subject: c.subject,
      body: `<p>${c.body}</p>${ctaButton(AD_CTA, 'Book a call')}`,
      imageUrl: `/ads/${id}.png`,
      imageAlt: f.suffix === 'photo' ? c.photoAlt : `VisualCNS ad — “${c.subject}”`,
    };
  })
);

const templates = [...announcementTemplates, ...adTemplates];

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
