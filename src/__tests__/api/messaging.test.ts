import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 7: Messaging", () => {
  // ─── Messages API Routes ─────────────────────────────────────────
  describe("Messages API — Thread List", () => {
    it("should have messages threads route at /api/messages/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "messages", "route.ts"))
      ).toBe(true);
    });

    it("threads route should handle GET for listing threads", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });

    it("threads route should require authentication", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("Unauthorized");
    });

    it("threads route should query deal_engagements for user's threads", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_engagements");
    });

    it("threads route should include deal headline and other party info", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("headline");
    });

    it("threads route should sort by most recent message", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("created_at");
    });
  });

  describe("Messages API — Thread Messages", () => {
    it("should have thread messages route at /api/messages/[threadId]/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"))
      ).toBe(true);
    });

    it("thread route should handle GET for fetching messages", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });

    it("thread route should handle POST for sending a message", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
    });

    it("thread route should verify user is participant (buyer or deal POC)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("point_of_contact_id");
    });

    it("thread route should query messages by engagement_id", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("engagement_id");
      expect(content).toContain("messages");
    });

    it("thread route should order messages chronologically", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("ascending");
    });

    it("thread route should insert message with sender_id, deal_id, engagement_id", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("sender_id");
      expect(content).toContain("deal_id");
      expect(content).toContain(".insert");
    });

    it("thread route should support attachment_path and attachment_name", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("attachment_path");
      expect(content).toContain("attachment_name");
    });

    it("thread route should include deal context (headline, stage)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("headline");
      expect(content).toContain("stage");
    });
  });

  // ─── Inbox Page ─────────────────────────────────────────────────
  describe("Inbox Page", () => {
    it("should have inbox page at (auth)/messages/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "messages", "page.tsx"))
      ).toBe(true);
    });

    it("inbox page should display thread list", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("thread");
    });

    it("inbox page should show other party name and firm", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("firm");
    });

    it("inbox page should show deal headline", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("headline");
    });

    it("inbox page should show last message preview", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("lastMessage");
    });

    it("inbox page should have unread indicator", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("unread");
    });

    it("inbox page should link to thread view", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/messages/");
    });

    it("inbox page should fetch from /api/messages", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/messages");
    });
  });

  // ─── Thread View Page ─────────────────────────────────────────────
  describe("Thread View Page", () => {
    it("should have thread page at (auth)/messages/[threadId]/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"))
      ).toBe(true);
    });

    it("thread page should display messages", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("messages");
    });

    it("thread page should have text input and send button", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Send");
      expect(content).toContain("newMessage");
    });

    it("thread page should have PDF attachment button", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("attachment");
    });

    it("thread page should show deal context header (headline, stage, link)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("headline");
      expect(content).toContain("stage");
    });

    it("thread page should show other party name and firm", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("otherParty");
    });

    it("thread page should use Supabase Realtime subscription", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("channel");
      expect(content).toContain("subscribe");
    });

    it("thread page should fetch from /api/messages/[threadId]", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/messages/");
    });

    it("thread page should send messages via POST to /api/messages/[threadId]", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("POST");
    });
  });

  // ─── One Thread Per Engagement ─────────────────────────────────
  describe("Thread = Engagement", () => {
    it("threadId should be engagement_id in API route", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      // threadId parameter used as engagement_id
      expect(content).toContain("threadId");
      expect(content).toContain("engagement_id");
    });
  });

  // ─── POC Enforcement ─────────────────────────────────────────────
  describe("Point of Contact Enforcement", () => {
    it("thread route should check deal point_of_contact_id for broker access", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("point_of_contact_id");
    });

    it("only POC or buyer should be allowed to send messages", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer_user_id");
      expect(content).toContain("Forbidden");
    });
  });

  // ─── File Attachment ─────────────────────────────────────────────
  describe("File Attachment", () => {
    it("thread route should reference message-attachments bucket", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("message-attachments");
    });

    it("thread page uploads attachments with a generated PDF key and preserves display name", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "[threadId]", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("`${threadId}/${crypto.randomUUID()}.pdf`");
      expect(content).toContain("attachmentName = attachment.name");
      expect(content).not.toContain("Date.now()}_${attachment.name}");
    });

    it("thread route only accepts generated PDF attachment paths under the thread", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("isValidMessageAttachmentPath");
      expect(content).toContain("UUID_PATTERN");
      expect(content).toContain("allowedPrefixes: [threadId]");
      expect(content).toContain("/${UUID_PATTERN}\\\\.pdf$");
      expect(content).toContain("generated PDF key");
    });

    it("has a guarded message attachment download route preserving UI links", () => {
      const routePath = path.join(SRC, "app", "api", "messages", "[threadId]", "attachment", "route.ts");
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("export async function GET");
      expect(content).toContain('searchParams.get("path")');
      expect(content).toContain("isValidMessageAttachmentPath");
      expect(content).toContain("allowedPrefixes: [threadId]");
      expect(content).toContain("UUID_PATTERN");
      expect(content).toContain('from("deal_engagements")');
      expect(content).toContain("buyer_user_id");
      expect(content).toContain("point_of_contact_id");
      expect(content).toContain('role === "admin"');
      expect(content).toContain('status === "approved"');
      expect(content).toContain('from("messages")');
      expect(content).toContain("attachment_path");
      expect(content).toContain('from("message-attachments")');
      expect(content).toContain("download(attachmentPath)");
      expect(content).toContain("Content-Disposition");
    });
  });
});
