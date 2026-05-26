import { NextRequest, NextResponse } from "next/server";
import { issueSignedToken, presignUrl } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, contentType } = body;

  if (!filename || !contentType) {
    return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob not configured" }, { status: 500 });
  }

  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) {
    return NextResponse.json({ error: "Blob store not configured" }, { status: 500 });
  }

  const pathname = filename;
  const publicUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;
  try {
    const signedToken = await issueSignedToken({
      pathname: filename,
      operations: ["put"],
      validUntil: Date.now() + 3600_000,
      token,
    });

    const { presignedUrl } = await presignUrl(
      { clientSigningToken: signedToken.clientSigningToken, delegationToken: signedToken.delegationToken },
      {
        operation: "put",
        pathname: filename,
        access: "public",
        allowedContentTypes: [contentType],
      }
    );

    return NextResponse.json({ uploadUrl: presignedUrl, pathname, publicUrl });
  } catch (e) {
    console.error("Presign error:", e);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
