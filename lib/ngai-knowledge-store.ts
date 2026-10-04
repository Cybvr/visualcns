import { doc, getDoc, setDoc } from "firebase/firestore"

import { auth, db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { knowledgeDocId, knowledgeText, MAX_KNOWLEDGE_LENGTH } from "./ngai-knowledge"

export async function getNgaiKnowledge(): Promise<string> {
  const snapshot = await getDoc(doc(db, "settings", knowledgeDocId(await getCurrentAgencyId())))
  return knowledgeText(snapshot.data())
}

export async function saveNgaiKnowledge(content: string): Promise<void> {
  const agencyId = await getCurrentAgencyId()
  await setDoc(doc(db, "settings", knowledgeDocId(agencyId)), {
    content: content.slice(0, MAX_KNOWLEDGE_LENGTH),
    agencyId,
    updatedBy: auth.currentUser?.uid || "",
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}
