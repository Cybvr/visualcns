import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OWNER_EMAIL = 'jide.pinheiro@gmail.com';
const TEMPLATE_ID = 'danne-institute-website-check-in';

const template = {
  id: TEMPLATE_ID,
  name: 'Danne Institute website check-in',
  subject: 'Checking in about Danne Institute’s website',
  body: `Hello [Name],

I hope you’re well. I was thinking about the website I built for Danne Institute and wanted to check in. How has it been working for the team?

If you have any new programs, events, or updates coming up, I’d be happy to take a look and suggest a few practical improvements. I’m also available if you need ongoing website updates or maintenance.

I just wanted to reconnect and see how things are going.

Best,
[Your Name]
[Phone number] | [Website]`,
};

const app = getApps()[0] || initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

async function resolveOwner() {
  const snapshot = await db.collection('users').where('email', '==', OWNER_EMAIL).limit(1).get();

  if (snapshot.empty) throw new Error(`No users doc for ${OWNER_EMAIL}`);

  const owner = snapshot.docs[0];
  return { companyId: owner.data().companyId || owner.id, createdBy: owner.id };
}

async function seed() {
  const { companyId, createdBy } = await resolveOwner();
  const record = {
    ...template,
    companyId,
    createdBy,
    updatedAt: new Date().toISOString(),
  };

  await db.collection('emailTemplates').doc(`${companyId}__${TEMPLATE_ID}`).set(record, { merge: true });
  console.log(`Seeded ${TEMPLATE_ID} for ${companyId}`);
}

seed().catch((error) => {
  console.error('Failed to seed Danne Institute outreach template:', error);
  process.exitCode = 1;
});
