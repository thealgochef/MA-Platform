import { NextResponse } from "next/server";
import { isAuthResponse, requireApprovedUser } from "@/server/auth";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File must be an image (PNG, JPEG, WEBP, or GIF)" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
  }

  const avatarStoragePath = `${user.id}/avatar`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(avatarStoragePath, arrayBuffer, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || "Failed to upload profile picture" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_path: avatarStoragePath })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to save profile picture" }, { status: 500 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("profile-pictures")
    .createSignedUrl(avatarStoragePath, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Failed to access profile picture" }, { status: 500 });
  }

  return NextResponse.json({ avatarPath: avatarStoragePath, avatarUrl: signedUrlData.signedUrl });
}
