"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formToObject, parse, run, success } from "@/lib/action";
import { actionUser } from "@/lib/session";
import { contactSchema } from "@/modules/employees/schema";
import { updateOwnContact } from "@/modules/employees/service";
import { deleteDocument, uploadAvatar, uploadDocument } from "@/modules/documents/service";

type State = import("@/lib/action").FormState;
const asFile = (v: FormDataEntryValue | null): File | null => (v && typeof v !== "string" ? v : null);

export async function updateContactAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    await updateOwnContact(user, parse(contactSchema, formToObject(formData)));
    revalidatePath("/app/profile");
    return success(undefined, "Your details were saved.");
  });
}

export async function uploadAvatarAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    await uploadAvatar(user, asFile(formData.get("file")));
    revalidatePath("/app/profile");
    return success(undefined, "Photo updated.");
  });
}

export async function uploadDocumentAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    await uploadDocument(user, asFile(formData.get("file")));
    revalidatePath("/app/profile");
    return success(undefined, "Document uploaded.");
  });
}

export async function deleteDocumentAction(_prev: State, formData: FormData) {
  return run(async () => {
    const user = await actionUser("EMPLOYEE");
    await deleteDocument(user, parse(z.string().min(1), formData.get("id")));
    revalidatePath("/app/profile");
    return success(undefined, "Document deleted.");
  });
}
