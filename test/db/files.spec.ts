/**
 * Case files: the private bucket, its policies and add_file, against the
 * LOCAL stack (`npm run test:db`).
 *
 * What this proves:
 *  - PG A can't list, download, sign a URL for, or overwrite PG B's files,
 *    even knowing the exact path, and can't read B's file rows
 *  - A can't upload into B's folder, or into a case that isn't A's
 *  - a file row can't be saved before its upload has finished
 *  - add_file is retry-safe
 *  - a file added during Update Visit is linked to that visit and its stage,
 *    whether the visit was saved before or after the upload finished
 *  - a soft-deleted file can no longer be read
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { storagePathFor, thumbPathFor } from "@/lib/files/paths";
import { CASE_FILES_BUCKET } from "@/lib/files/rules";
import { loadTemplates, onboardedPg, signedInUser, type Client, type TemplateCaseType } from "./helpers";

let a: { client: Client; id: string };
let b: { client: Client; id: string };
let tpl: TemplateCaseType;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);

async function newCase(client: Client) {
  const caseId = randomUUID();
  const { error } = await client.rpc("create_patient_with_case", {
    p_patient_id: randomUUID(),
    p_full_name: "File Test",
    p_phone: "9876543210",
    p_case_id: caseId,
    p_case_type_id: tpl.id,
    p_stage_id: tpl.stageIds[0]!,
    p_tooth: "36",
  });
  if (error) throw error;
  return caseId;
}

function bucket(client: Client) {
  return client.storage.from(CASE_FILES_BUCKET);
}

async function upload(pg: { client: Client; id: string }, caseId: string, fileId = randomUUID()) {
  const path = storagePathFor({ pgId: pg.id, caseId, fileId, mime: "image/jpeg" });
  const { error } = await bucket(pg.client).upload(path, new Blob([JPEG], { type: "image/jpeg" }), {
    contentType: "image/jpeg",
  });
  return { fileId, path, error };
}

function addFile(client: Client, args: { id: string; caseId: string; path: string; thumb?: string; visitId?: string }) {
  return client.rpc("add_file", {
    p_id: args.id,
    p_case_id: args.caseId,
    p_kind: "xray",
    p_storage_path: args.path,
    p_mime_type: "image/jpeg",
    p_size_bytes: JPEG.byteLength,
    p_label: "Test label",
    p_original_name: "IMG_0001.jpg",
    p_thumb_path: args.thumb,
    p_visit_id: args.visitId,
  });
}

/** A saved file of PG B's, for A to try to reach. */
let bCase: string;
let bFile: { fileId: string; path: string };

beforeAll(async () => {
  const reader = await signedInUser("files-tpl");
  const templates = Object.values(await loadTemplates(reader.client));
  tpl = templates.find((t) => t.stageIds.length >= 3 && t.toothRequired)!;
  a = await onboardedPg("files-a", tpl.specialtyId);
  b = await onboardedPg("files-b", tpl.specialtyId);

  bCase = await newCase(b.client);
  const up = await upload(b, bCase);
  expect(up.error).toBeNull();
  const saved = await addFile(b.client, { id: up.fileId, caseId: bCase, path: up.path });
  expect(saved.error).toBeNull();
  bFile = up;
});

describe("the bucket", () => {
  it("is private", async () => {
    const { data } = await bucket(a.client).getPublicUrl(bFile.path);
    const res = await fetch(data.publicUrl);
    expect(res.ok).toBe(false);
  });

  it("lets the owner sign a URL and read their own file", async () => {
    const signed = await bucket(b.client).createSignedUrl(bFile.path, 60);
    expect(signed.error).toBeNull();
    const res = await fetch(signed.data!.signedUrl);
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG);
  });
});

describe("PG A cannot reach PG B's files, even with the exact path", () => {
  it("can't read B's file rows", async () => {
    const { data } = await a.client.from("file").select("id").eq("id", bFile.fileId);
    expect(data).toEqual([]);
  });

  it("can't list B's folders", async () => {
    const { data } = await bucket(a.client).list(`${b.id}/${bCase}/${bFile.fileId}`);
    expect(data ?? []).toEqual([]);
    const top = await bucket(a.client).list(b.id);
    expect(top.data ?? []).toEqual([]);
  });

  it("can't download B's file", async () => {
    const { data, error } = await bucket(a.client).download(bFile.path);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("can't sign a URL for B's file", async () => {
    const one = await bucket(a.client).createSignedUrl(bFile.path, 60);
    expect(one.data).toBeNull();
    expect(one.error).not.toBeNull();
    const many = await bucket(a.client).createSignedUrls([bFile.path], 60);
    expect(many.data?.every((d) => d.error || !d.signedUrl) ?? true).toBe(true);
  });

  it("can't overwrite or remove B's file", async () => {
    const put = await bucket(a.client).upload(bFile.path, new Blob([JPEG], { type: "image/jpeg" }), { upsert: true, contentType: "image/jpeg" });
    expect(put.error?.message).toMatch(/row-level security|not found|Unauthorized/i);
    await bucket(a.client).remove([bFile.path]);
    const still = await bucket(b.client).download(bFile.path);
    expect(still.error).toBeNull();
  });

  it("can't upload into B's folder, or into B's case from A's folder", async () => {
    const intoB = await bucket(a.client).upload(
      `${b.id}/${bCase}/${randomUUID()}/original.jpg`,
      new Blob([JPEG], { type: "image/jpeg" }),
      { contentType: "image/jpeg" },
    );
    expect(intoB.error?.message).toMatch(/row-level security/i);
    const bCaseFromA = await upload(a, bCase);
    expect(bCaseFromA.error?.message).toMatch(/row-level security/i);
  });

  it("can't save a file row pointing at B's object", async () => {
    const aCase = await newCase(a.client);
    const { error } = await addFile(a.client, { id: randomUUID(), caseId: aCase, path: bFile.path });
    expect(error).not.toBeNull();
  });
});

describe("add_file", () => {
  it("refuses a row before its upload has finished", async () => {
    const caseId = await newCase(a.client);
    const fileId = randomUUID();
    const path = storagePathFor({ pgId: a.id, caseId, fileId, mime: "image/jpeg" });
    const { error } = await addFile(a.client, { id: fileId, caseId, path });
    expect(error?.message).toMatch(/not finished uploading/);
    const { data } = await a.client.from("file").select("id").eq("id", fileId);
    expect(data).toEqual([]);
  });

  it("is retry-safe: the same id twice is one file", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    expect(up.error).toBeNull();
    expect((await addFile(a.client, { id: up.fileId, caseId, path: up.path })).error).toBeNull();
    expect((await addFile(a.client, { id: up.fileId, caseId, path: up.path })).error).toBeNull();
    const { data } = await a.client.from("file").select("id, label, original_name, kind").eq("case_id", caseId);
    expect(data).toEqual([{ id: up.fileId, label: "Test label", original_name: "IMG_0001.jpg", kind: "xray" }]);
  });

  it("saves the thumbnail path when its upload has finished", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    const thumb = thumbPathFor({ pgId: a.id, caseId, fileId: up.fileId });
    const missing = await addFile(a.client, { id: up.fileId, caseId, path: up.path, thumb });
    expect(missing.error).not.toBeNull();
    const thumbUp = await bucket(a.client).upload(thumb, new Blob([JPEG], { type: "image/jpeg" }), { contentType: "image/jpeg" });
    expect(thumbUp.error).toBeNull();
    const ok = await addFile(a.client, { id: up.fileId, caseId, path: up.path, thumb });
    expect(ok.error).toBeNull();
  });

  it("refuses a path that isn't laid out as <pg>/<case>/<file id>/original.*", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    const { error } = await addFile(a.client, { id: randomUUID(), caseId, path: up.path });
    expect(error).not.toBeNull();
  });
});

describe("files added during Update Visit", () => {
  async function todaysVisit(caseId: string) {
    const { data } = await a.client.from("visit").select("id").eq("case_id", caseId).is("deleted_at", null).single();
    return data!.id;
  }

  function recordVisit(caseId: string, newVisitId: string, stageIds: string[]) {
    return a.client.rpc("record_visit", {
      p_case_id: caseId,
      p_stage_ids: stageIds,
      p_outcome: "partial",
      p_complete_case: false,
      p_new_visit_id: newVisitId,
      p_next_stage_id: stageIds[stageIds.length - 1]!,
    });
  }

  it("links to the visit and its stage when the visit already exists, and follows edits", async () => {
    const caseId = await newCase(a.client);
    const visitId = await todaysVisit(caseId);
    const up = await upload(a, caseId);
    expect((await addFile(a.client, { id: up.fileId, caseId, path: up.path, visitId })).error).toBeNull();

    let row = await a.client.from("file").select("visit_id, stage_id, pending_visit_id").eq("id", up.fileId).single();
    expect(row.data).toEqual({ visit_id: visitId, stage_id: tpl.stageIds[0], pending_visit_id: null });

    // The visit is saved with two stages: the file goes under the furthest one.
    expect((await recordVisit(caseId, randomUUID(), [tpl.stageIds[0]!, tpl.stageIds[1]!])).error).toBeNull();
    row = await a.client.from("file").select("visit_id, stage_id, pending_visit_id").eq("id", up.fileId).single();
    expect(row.data).toEqual({ visit_id: visitId, stage_id: tpl.stageIds[1], pending_visit_id: null });
  });

  it("waits for a visit that isn't saved yet, then links when it is", async () => {
    const caseId = await newCase(a.client);
    // No visit today yet (as for a case started on an earlier day).
    await a.client.from("visit").update({ deleted_at: new Date().toISOString() }).eq("case_id", caseId);
    const newVisitId = randomUUID();

    const up = await upload(a, caseId);
    expect((await addFile(a.client, { id: up.fileId, caseId, path: up.path, visitId: newVisitId })).error).toBeNull();
    let row = await a.client.from("file").select("visit_id, stage_id, pending_visit_id").eq("id", up.fileId).single();
    expect(row.data).toEqual({ visit_id: null, stage_id: null, pending_visit_id: newVisitId });

    expect((await recordVisit(caseId, newVisitId, [tpl.stageIds[2]!])).error).toBeNull();
    row = await a.client.from("file").select("visit_id, stage_id, pending_visit_id").eq("id", up.fileId).single();
    expect(row.data).toEqual({ visit_id: newVisitId, stage_id: tpl.stageIds[2], pending_visit_id: null });
  });

  it("a file added from the Patient screen stays with the case only", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    await addFile(a.client, { id: up.fileId, caseId, path: up.path });
    await recordVisit(caseId, randomUUID(), [tpl.stageIds[0]!]);
    const row = await a.client.from("file").select("visit_id, stage_id").eq("id", up.fileId).single();
    expect(row.data).toEqual({ visit_id: null, stage_id: null });
  });
});

describe("deleting", () => {
  it("is soft: the row stays, but the file can no longer be read or signed", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    await addFile(a.client, { id: up.fileId, caseId, path: up.path });
    expect((await bucket(a.client).createSignedUrl(up.path, 60)).error).toBeNull();

    const del = await a.client.from("file").update({ deleted_at: new Date().toISOString() }).eq("id", up.fileId);
    expect(del.error).toBeNull();
    expect((await a.client.from("file").delete().eq("id", up.fileId)).error).not.toBeNull();

    expect((await bucket(a.client).createSignedUrl(up.path, 60)).data).toBeNull();
    expect((await bucket(a.client).download(up.path)).data).toBeNull();
    // A saved file's bytes can't be erased either.
    await bucket(a.client).remove([up.path]);
    const { data } = await a.client.from("file").select("id").eq("id", up.fileId);
    expect(data).toHaveLength(1);
  });

  it("an upload that never became a file can be removed (cancel)", async () => {
    const caseId = await newCase(a.client);
    const up = await upload(a, caseId);
    const removed = await bucket(a.client).remove([up.path]);
    expect(removed.error).toBeNull();
    expect(removed.data).toHaveLength(1);
  });
});
