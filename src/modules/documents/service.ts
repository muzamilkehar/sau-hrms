import { prisma } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireEmployeeId, type Actor } from "@/modules/types";
import { MAX_AVATAR_BYTES, MAX_DOCUMENTS_PER_EMPLOYEE, MAX_DOCUMENT_BYTES, safeFileName, validateUpload } from "./rules";

async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function uploadDocument(actor: Actor, file: File | null) {
  const employeeId = requireEmployeeId(actor);
  if (!file || typeof file === "string" || file.size === 0) throw new ValidationError("Choose a file to upload.", { file: ["Choose a file."] });
  if (file.size > MAX_DOCUMENT_BYTES) throw new ValidationError("The file is too large (maximum 4 MB).", { file: ["File too large."] });
  if ((await prisma.employeeDocument.count({ where: { employeeId } })) >= MAX_DOCUMENTS_PER_EMPLOYEE) throw new ConflictError(`You can store at most ${MAX_DOCUMENTS_PER_EMPLOYEE} documents. Delete one first.`);
  const bytes = await readFile(file);
  const kind = validateUpload({ bytes, allowed: ["application/pdf", "image/png", "image/jpeg", "image/webp"], maxBytes: MAX_DOCUMENT_BYTES });
  await prisma.employeeDocument.create({ data: { employeeId, name: safeFileName(file.name), mimeType: kind, size: bytes.byteLength, data: Buffer.from(bytes) } });
}

export async function uploadAvatar(actor: Actor, file: File | null) {
  const employeeId = requireEmployeeId(actor);
  if (!file || typeof file === "string" || file.size === 0) throw new ValidationError("Choose a photo.", { file: ["Choose a photo."] });
  if (file.size > MAX_AVATAR_BYTES) throw new ValidationError("The photo is too large (maximum 1 MB).", { file: ["File too large."] });
  const bytes = await readFile(file);
  const kind = validateUpload({ bytes, allowed: ["image/png", "image/jpeg", "image/webp"], maxBytes: MAX_AVATAR_BYTES });
  await prisma.employee.update({ where: { id: employeeId }, data: { avatarData: Buffer.from(bytes), avatarType: kind } });
}

export async function deleteDocument(actor: Actor, id: string) {
  const employeeId = requireEmployeeId(actor);
  const result = await prisma.employeeDocument.deleteMany({ where: { id, employeeId } });
  if (result.count === 0) throw new NotFoundError("Document not found.");
}

export function listDocuments(employeeId: string) {
  return prisma.employeeDocument.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, mimeType: true, size: true, createdAt: true } });
}

/** Owner or HR only. */
export async function getDocumentForDownload(actor: Actor, id: string) {
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError("Document not found.");
  if (actor.role !== "HR_ADMIN" && doc.employeeId !== actor.employeeId) throw new ForbiddenError();
  return doc;
}

export async function getAvatar(actor: Actor, employeeId: string) {
  if (actor.role !== "HR_ADMIN" && actor.employeeId !== employeeId) throw new ForbiddenError();
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { avatarData: true, avatarType: true } });
  if (!emp?.avatarData || !emp.avatarType) throw new NotFoundError("No photo.");
  return { data: emp.avatarData, type: emp.avatarType };
}
