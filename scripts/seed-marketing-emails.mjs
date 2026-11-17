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
const SIGN_OFF = '<p>Jide<br />VisualCNS</p>';

const p = (text) => `<p>${text}</p>`;
const link = (url, text) => `<p><a href="${url}">${text}</a></p>`;

// "[Customer Name]" is swapped for the recipient's name when the email is sent.
const templates = [
  {
    id: 'marketing-launch',
    name: 'Marketing — Launch',
    subject: 'we built something for your business',
    body: [
      p('Hi [Customer Name],'),
      p('Most of the businesses we work with have the same problem: posting is on and off, Google barely shows them, and reviews sit unanswered.'),
      p('So we built Marketing. Social, SEO, reviews and ads in one place, with a short list of what to do next.'),
      p('It’s free for 30 days.'),
      link(SIGNUP, 'Start your free trial'),
      SIGN_OFF,
    ].join(''),
  },
  {
    id: 'marketing-question',
    name: 'Marketing — One question',
    subject: 'google or instagram?',
    body: [
      p('Hi [Customer Name],'),
      p('One question: what’s harder for you right now, getting found on Google or posting on Instagram consistently?'),
      p('Just reply with one word. I’ll send you the one thing that would help most.'),
      SIGN_OFF,
    ].join(''),
  },
  {
    id: 'marketing-free-check',
    name: 'Marketing — Free check',
    subject: 'want a free 10-minute check?',
    body: [
      p('Hi [Customer Name],'),
      p('Reply “check” and we’ll look at your Google listing and your Instagram this week.'),
      p('You’ll get the 3 things worth fixing first. No call, no pitch.'),
      SIGN_OFF,
    ].join(''),
  },
  {
    id: 'marketing-client-story',
    name: 'Marketing — Client story (fill in before sending)',
    subject: 'how [Client] started showing up on google',
    body: [
      p('Hi [Customer Name],'),
      p('[Client] is a [type of business] in [area]. In [month], they barely showed up when people searched for them.'),
      p('They added their keywords, fixed their Google listing and started replying to reviews. [Result, e.g. calls doubled in 6 weeks].'),
      p('Same steps, same tools, now in Marketing.'),
      link(SIGNUP, 'Try it free for 30 days'),
      SIGN_OFF,
    ].join(''),
  },
  {
    id: 'marketing-trial-deadline',
    name: 'Marketing — Last call',
    subject: 'last call: 30 days free',
    body: [
      p('Hi [Customer Name],'),
      p('The 30-day free trial of Marketing ends for new sign-ups this [day].'),
      p('If getting found and posting regularly is on your list this year, now’s the easy time to start.'),
      link(SIGNUP, 'Start free'),
      SIGN_OFF,
    ].join(''),
  },
];

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
console.log('Done.');
process.exit(0);
