import { doc, getDoc, setDoc } from "firebase/firestore"

import { auth, db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { knowledgeDocId, toKnowledge, type NgaiKnowledge } from "./ngai-knowledge"

export async function getNgaiKnowledge(): Promise<NgaiKnowledge> {
  const snapshot = await getDoc(doc(db, "settings", knowledgeDocId(await getCurrentAgencyId())))
  return toKnowledge(snapshot.data())
}

export async function saveNgaiKnowledge(knowledge: NgaiKnowledge): Promise<void> {
  const agencyId = await getCurrentAgencyId()
  await setDoc(doc(db, "settings", knowledgeDocId(agencyId)), {
    ...toKnowledge(knowledge),
    agencyId,
    updatedBy: auth.currentUser?.uid || "",
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}
