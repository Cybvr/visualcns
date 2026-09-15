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

// The four campaign concepts. Each ships as a film photo (9:16) and a text
// card (1:1) -> eight templates. subject is the headline, body the subheading.
// The "Book a call" CTA is mapped by id in TEMPLATE_CTA (dashboard/email/page).
const concepts = [
  { key: 'ai-build', subject: 'AI can build it. We make it work.', body: 'Custom tools your business can trust.', photoAlt: 'A Nigerian coffee shop owner checks a blue dashboard on her laptop.' },
  { key: 'anyone-build', subject: 'Anyone can build a tool now. Can you trust it?', body: 'We build the ones that hold up.', photoAlt: 'A Nigerian apparel studio owner beside a laptop showing a blue dashboard.' },
  { key: 'dashboard-right', subject: 'Your dashboard looks right. Is it?', body: 'We build tools that get the numbers right.', photoAlt: 'A Nigerian print studio owner checking figures on a laptop.' },
  { key: 'ten-tools', subject: 'You built ten tools. None of them talk.', body: 'We build one system that works.', photoAlt: 'A Nigerian shop owner holding a tablet showing one unified blue dashboard.' },
];

const formats = [
  { suffix: 'photo', label: 'photo 9:16' },
  { suffix: 'text', label: 'text 1:1' },
];

const templates = concepts.flatMap((c) =>
  formats.map((f) => {
    const id = `ad-${c.key}-${f.suffix}`;
    return {
      id,
      name: `Ad — ${c.subject} (${f.label})`,
      subject: c.subject,
      // The CTA button is baked into the body HTML so it shows in the editor
      // and code view, and travels with the template.
      body:
        `<p>${c.body}</p>` +
        '<p><a href="https://cal.com/pinheirojide/30min" style="display:inline-block;background:#2856d9;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Book a call</a></p>',
      imageUrl: `/ads/${id}.png`,
      imageAlt: f.suffix === 'photo' ? c.photoAlt : `VisualCNS ad — “${c.subject}”`,
    };
  })
);

async function resolveCompanyId() {
  const snapshot = await getDocs(
    query(collection(db, 'users'), where('email', '==', OWNER_EMAIL), limit(1))
  );
  if (snapshot.empty) throw new Error(`No users doc for ${OWNER_EMAIL}`);
  const owner = snapshot.docs[0];
  return { companyId: owner.data().companyId || owner.id, createdBy: owner.id };
}

async function seed() {
  console.log('Seeding ad templates...');
  const { companyId, createdBy } = await resolveCompanyId();
  const updatedAt = new Date().toISOString();

  for (const template of templates) {
    try {
      const record = { ...template, companyId, createdBy, updatedAt };
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
