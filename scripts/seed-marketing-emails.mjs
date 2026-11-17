// Saves the Marketing launch emails as email templates in the owner's workspace.
// Plain-text style: short, from a person, one link or a reply.
// Run: node scripts/seed-marketing-emails.mjs
// Needs FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (the admin service account).
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'visualhqportfolio';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!clientEmail || !privateKey) {
  console.error('Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY first.');
  process.exit(1);
}

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

// Same owner as scripts/seed-email-templates.mjs.
const OWNER_EMAIL = 'jide.pinheiro@gmail.com';
const SIGNUP = 'https://www.visualcns.com/signup';

const p = (text) => `<p>${text}</p>`;
const link = (url, text) => `<p><a href="${url}">${text}</a></p>`;

const SIGN = '<p>Jide from VisualCNS</p>';
const GREETING = p('Hi there,');

// Facts: BrightLocal Local Consumer Review Survey 2026, DataReportal Digital 2026, Buffer 2026.
const templates = [
  {
    id: 'marketing-launch',
    name: 'Marketing — Launch',
    subject: 'we built something for your business',
    body: [
      GREETING,
      p('A 2026 BrightLocal survey found that 97% of people read reviews before choosing a local business, and almost half now ask AI tools like ChatGPT for recommendations too. Being easy to find and well reviewed matters more than ever, which is why we built Marketing. It puts your social media, Google search, reviews and ads in one place and tells you what to do next. You can try it free for 30 days.'),
      link(SIGNUP, 'Start your free trial'),
      SIGN,
    ].join(''),
  },
  {
    id: 'marketing-question',
    name: 'Marketing — One question',
    subject: 'google or instagram?',
    body: [
      GREETING,
      p('Two in every three people on Earth now use social media, according to DataReportal’s 2026 global report, yet most people still check Google before they buy. I’m curious which one is harder for you right now, getting found on Google or keeping up with Instagram. Reply with whichever it is and I’ll send you the one change that would make the biggest difference.'),
      SIGN,
    ].join(''),
  },
  {
    id: 'marketing-free-check',
    name: 'Marketing — Free check',
    subject: 'want a free 10-minute check?',
    body: [
      GREETING,
      p('Three in four people only trust reviews from the last three months, according to BrightLocal’s 2026 survey, so an old listing quietly costs you customers. If you reply with “check”, we’ll look at your Google listing and your Instagram this week and send you the three things we’d fix first. You don’t need to book a call, and there’s nothing to buy.'),
      SIGN,
    ].join(''),
  },
  {
    id: 'marketing-week',
    name: 'Marketing — A week with Marketing',
    subject: 'what a week with Marketing looks like',
    body: [
      GREETING,
      p('Buffer found that accounts posting three to five times a week reach more people with every post than accounts posting once or twice, yet many small businesses only manage once a week. Here’s how Marketing helps. On Monday you see the three things worth fixing on your Google listing and website. By Wednesday your posts for the week are drafted and scheduled, and by Friday every new review has a reply. You can try it free for 30 days.'),
      link(SIGNUP, 'Try it free'),
      SIGN,
    ].join(''),
  },
  {
    id: 'marketing-trial',
    name: 'Marketing — Free trial',
    subject: 'your free trial is waiting',
    body: [
      GREETING,
      p('Nearly a third of people now only consider businesses rated 4.5 stars or higher, almost double last year. If getting more good reviews and showing up on Google is on your list this year, Marketing is free for your first 30 days, so it’s worth a proper try.'),
      link(SIGNUP, 'Start free'),
      SIGN,
    ].join(''),
  },
];

// Earlier versions that the ones above replace.
const RETIRED = ['marketing-client-story', 'marketing-trial-deadline'];

async function resolveOwner() {
  const snapshot = await db.collection('users').where('email', '==', OWNER_EMAIL).limit(1).get();
  if (snapshot.empty) throw new Error(`No users doc for ${OWNER_EMAIL}`);
  const owner = snapshot.docs[0];
  const data = owner.data();
  if (!data.agencyId) throw new Error(`No agencyId for ${OWNER_EMAIL}`);
  return { companyId: data.companyId || owner.id, createdBy: owner.id, agencyId: data.agencyId };
}

const { companyId, createdBy, agencyId } = await resolveOwner();
const updatedAt = new Date().toISOString();
for (const template of templates) {
  await db.collection('emailTemplates').doc(`${companyId}__${template.id}`).set({ ...template, companyId, createdBy, agencyId, updatedAt }, { merge: true });
  console.log(`Saved ${template.id}`);
}
for (const id of RETIRED) {
  await db.collection('emailTemplates').doc(`${companyId}__${id}`).delete();
  console.log(`Removed ${id}`);
}
console.log('Done.');
process.exit(0);
