import { deleteObject, ref, uploadBytes } from "firebase/storage"

import { prepareImageForUpload } from "@/lib/image-upload"
import { storage } from "@/lib/firebase"
import type { StoredEmailAttachment } from "@/lib/email-attachments"

export async function prepareEmailAttachment(file: File) {
  return prepareImageForUpload(file)
}

export async function uploadEmailAttachments(files: File[], userId: string): Promise<StoredEmailAttachment[]> {
  const uploaded: StoredEmailAttachment[] = []
  try {
    for (const file of files) {
      const storagePath = `email-attachments/${userId}/${crypto.randomUUID()}/${crypto.randomUUID()}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" })
      uploaded.push({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        storagePath,
      })
    }
    return uploaded
  } catch (error) {
    await removeUploadedEmailAttachments(uploaded)
    throw error
  }
}

export async function removeUploadedEmailAttachments(attachments: StoredEmailAttachment[]) {
  await Promise.allSettled(attachments.map((attachment) => deleteObject(ref(storage, attachment.storagePath))))
}
