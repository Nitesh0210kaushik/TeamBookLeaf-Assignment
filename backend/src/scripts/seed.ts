/**
 * Seeds MongoDB from data/bookleaf_sample_data.json (the dataset provided with the assignment).
 *
 *   npm run seed            # wipes the portal collections and re-seeds
 *
 * Creates: 10 authors + 18 books (exactly as in the dataset), a login per author, two admins,
 * and a handful of realistic tickets in different states so the admin queue isn't empty on first run.
 */
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import type { TicketStatus } from "../constants/ticket";
import { classifyWithRules } from "../modules/ai/fallback/rule-classifier";
import { AiDraftModel } from "../modules/ai/models/ai-draft.model";
import { AiUsageLogModel } from "../modules/ai/models/ai-usage-log.model";
import { UserModel } from "../modules/auth/models/user.model";
import { AuthorModel } from "../modules/authors/models/author.model";
import { BookModel } from "../modules/books/models/book.model";
import { CounterModel, nextSequence } from "../modules/tickets/models/counter.model";
import { TicketEventModel } from "../modules/tickets/models/ticket-event.model";
import { TicketMessageModel } from "../modules/tickets/models/ticket-message.model";
import { TicketNoteModel } from "../modules/tickets/models/ticket-note.model";
import { TicketModel } from "../modules/tickets/models/ticket.model";
import { priorityFields, statusFields } from "../modules/tickets/services/ticket-access";

export const DEMO_AUTHOR_PASSWORD = "Author@123";
export const DEMO_ADMIN_PASSWORD = "Admin@123";

const ADMINS = [
  { name: "Riya Mehta", email: "admin@bookleaf.com" },
  { name: "Karan Singh", email: "ops@bookleaf.com" },
];

// ------------------------------------------------------------------ dataset schema

const nullableDate = z
  .string()
  .nullable()
  .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));

const datasetSchema = z.object({
  authors: z.array(
    z.object({
      author_id: z.string(),
      name: z.string(),
      email: z.email(),
      phone: z.string().nullable(),
      city: z.string().nullable(),
      joined_date: nullableDate,
      books: z.array(
        z.object({
          book_id: z.string(),
          title: z.string(),
          isbn: z.string().nullable(),
          genre: z.string().nullable(),
          publication_date: nullableDate,
          status: z.string(),
          mrp: z.number().nullable(),
          author_royalty_per_copy: z.number().nullable(),
          total_copies_sold: z.number(),
          total_royalty_earned: z.number(),
          royalty_paid: z.number(),
          royalty_pending: z.number(),
          last_royalty_payout_date: nullableDate,
          print_partner: z.string().nullable(),
          available_on: z.array(z.string()),
        }),
      ),
    }),
  ),
});

type Dataset = z.infer<typeof datasetSchema>;

function loadDataset(): Dataset {
  const file = path.resolve(__dirname, "../../data/bookleaf_sample_data.json");
  return datasetSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

/** Flags inconsistencies in the source data without blocking the seed. */
function checkIntegrity(dataset: Dataset) {
  for (const author of dataset.authors) {
    for (const book of author.books) {
      if (book.royalty_paid + book.royalty_pending !== book.total_royalty_earned) {
        logger.warn({ book: book.book_id }, "Royalty paid + pending does not equal total earned");
      }
      if (
        book.author_royalty_per_copy !== null &&
        book.author_royalty_per_copy * book.total_copies_sold !== book.total_royalty_earned
      ) {
        logger.warn(
          { book: book.book_id },
          "Copies × royalty per copy does not equal total earned",
        );
      }
    }
  }
}

// ------------------------------------------------------------------ demo tickets

type DemoTicket = {
  authorCode: string;
  bookCode: string | null;
  subject: string;
  description: string;
  hoursAgo: number;
  status: TicketStatus;
  assignToAdmin?: number;
  /** [role, hoursAgo, body] */
  conversation?: Array<["author" | "admin", number, string]>;
  note?: string;
};

const DEMO_TICKETS: DemoTicket[] = [
  {
    authorCode: "AUTH003",
    bookCode: "BK005",
    subject: "No royalty received since my book was published",
    description:
      "My book Between Two Temples was published in July 2024 and I have not received a single rupee in royalty. The dashboard shows ₹2,546 pending. It has been more than a year now. Please tell me what is going on.",
    hoursAgo: 52,
    status: "open",
  },
  {
    authorCode: "AUTH002",
    bookCode: "BK003",
    subject: "Different ISBN on Amazon than on my printed copy",
    description:
      "The Amazon India listing for Code & Karma shows a different ISBN from the one printed on the back cover of my author copies. Readers are confused and I'm worried this is affecting sales.",
    hoursAgo: 30,
    status: "open",
  },
  {
    authorCode: "AUTH005",
    bookCode: "BK009",
    subject: "Book showing Currently Unavailable on Amazon US",
    description:
      "Letters from Lakshadweep is showing as 'Currently Unavailable' on Amazon US since last week. A few readers from the US have messaged me that they cannot order it.",
    hoursAgo: 46,
    status: "in_progress",
    assignToAdmin: 0,
    conversation: [
      [
        "admin",
        40,
        "Dear Meera,\n\nThank you for flagging this — I understand how frustrating it is when readers can't order your book. This is usually a stock sync issue with the platform, and I've asked our distribution team to trigger a re-sync. The listing should be live again within 24–48 hours.\n\nWe'll confirm here once it's back.\n\nWarm regards,\nBookLeaf Author Support",
      ],
      [
        "author",
        3,
        "Thanks for the quick reply. It's been almost two days and it still shows unavailable. Can you check again?",
      ],
    ],
    note: "Re-sync request raised with distribution on day 1. Check if Amazon US needs a manual stock push.",
  },
  {
    authorCode: "AUTH007",
    bookCode: "BK013",
    subject: "When will Midnight in Mysore be ready?",
    description:
      "My thriller has been in cover design for quite a while now. Could you tell me the expected timeline for the remaining stages and when it might go live?",
    hoursAgo: 120,
    status: "open",
  },
  {
    authorCode: "AUTH004",
    bookCode: null,
    subject: "Can I update my author bio?",
    description:
      "Hi team, how do I update my author bio that appears on my Amazon book pages? I have a new job title I'd like to mention.",
    hoursAgo: 20,
    status: "open",
  },
  {
    authorCode: "AUTH009",
    bookCode: "BK016",
    subject: "Royalty for The Nagpur Notebooks not paid",
    description:
      "My dashboard shows ₹850 pending for The Nagpur Notebooks but I did not get paid in the last payout cycle. Can you please check why?",
    hoursAgo: 6,
    status: "open",
  },
  {
    authorCode: "AUTH001",
    bookCode: "BK001",
    subject: "Blurry images in my author copies",
    description:
      "I received 20 author copies of Whispers of the Ganges and the photographs in chapter 3 are blurry, and a few pages are slightly misaligned.",
    hoursAgo: 240,
    status: "resolved",
    assignToAdmin: 1,
    conversation: [
      [
        "admin",
        230,
        "Dear Priya,\n\nI'm really sorry the copies didn't meet the standard you expected. Could you share a few photos of the affected pages? Once verified, we'll arrange a free reprint — typically 5–7 business days.\n\nWarm regards,\nBookLeaf Author Support",
      ],
      ["author", 220, "Sharing photos of pages 41–48 here. Thank you for the quick response."],
      [
        "admin",
        200,
        "Thank you, Priya — verified. Your reprint of 20 copies is confirmed and will be dispatched within 5–7 business days.\n\nWarm regards,\nBookLeaf Author Support",
      ],
    ],
  },
  {
    authorCode: "AUTH010",
    bookCode: "BK017",
    subject: "Request for a royalty breakdown",
    description:
      "Could I get a detailed breakdown of how my royalty for Durga's Daughters is calculated per platform? I want to understand the numbers better.",
    hoursAgo: 480,
    status: "closed",
    assignToAdmin: 0,
    conversation: [
      [
        "admin",
        470,
        "Dear Diya,\n\nOf course. Your royalty is 80% of the net profit per copy (MRP minus printing, platform commission and shipping). The per-platform breakdown is available in your dashboard, and I've also emailed you a line-by-line statement.\n\nWarm regards,\nBookLeaf Author Support",
      ],
      ["author", 460, "Got it, thank you!"],
    ],
  },
];

// ------------------------------------------------------------------ seed

async function seed() {
  const dataset = loadDataset();
  checkIntegrity(dataset);
  await connectDatabase();

  await Promise.all(
    [
      UserModel,
      AuthorModel,
      BookModel,
      TicketModel,
      TicketMessageModel,
      TicketNoteModel,
      TicketEventModel,
      AiDraftModel,
      AiUsageLogModel,
      CounterModel,
    ].map((model) => (model as typeof UserModel).deleteMany({})),
  );

  const [authorHash, adminHash] = await Promise.all([
    bcrypt.hash(DEMO_AUTHOR_PASSWORD, 10),
    bcrypt.hash(DEMO_ADMIN_PASSWORD, 10),
  ]);

  const authorIds = new Map<string, string>();
  const authorUserIds = new Map<string, string>();
  const bookIds = new Map<string, string>();

  for (const entry of dataset.authors) {
    const author = await AuthorModel.create({
      authorCode: entry.author_id,
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      city: entry.city,
      joinedDate: entry.joined_date,
    });
    authorIds.set(entry.author_id, String(author._id));

    const user = await UserModel.create({
      email: entry.email,
      passwordHash: authorHash,
      name: entry.name,
      role: "author",
      author: author._id,
    });
    authorUserIds.set(entry.author_id, String(user._id));

    for (const book of entry.books) {
      const created = await BookModel.create({
        bookCode: book.book_id,
        author: author._id,
        title: book.title,
        isbn: book.isbn,
        genre: book.genre,
        publicationDate: book.publication_date,
        status: book.status,
        mrp: book.mrp,
        authorRoyaltyPerCopy: book.author_royalty_per_copy,
        totalCopiesSold: book.total_copies_sold,
        totalRoyaltyEarned: book.total_royalty_earned,
        royaltyPaid: book.royalty_paid,
        royaltyPending: book.royalty_pending,
        lastRoyaltyPayoutDate: book.last_royalty_payout_date,
        printPartner: book.print_partner,
        availableOn: book.available_on,
      });
      bookIds.set(book.book_id, String(created._id));
    }
  }

  const admins = await UserModel.insertMany(
    ADMINS.map((admin) => ({ ...admin, passwordHash: adminHash, role: "admin" })),
  );

  const now = Date.now();
  const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000);

  for (const demo of DEMO_TICKETS) {
    const createdAt = hoursAgo(demo.hoursAgo);
    const rules = classifyWithRules({
      subject: demo.subject,
      description: demo.description,
      book: null,
    });
    const conversation = demo.conversation ?? [];
    const adminReplies = conversation.filter(([role]) => role === "admin");
    const authorReplies = conversation.filter(([role]) => role === "author");
    const assignee = demo.assignToAdmin !== undefined ? admins[demo.assignToAdmin] : null;
    const lastActivity = conversation.length
      ? hoursAgo(Math.min(...conversation.map(([, h]) => h)))
      : createdAt;

    const ticket = await TicketModel.create({
      ticketNumber: await nextSequence("ticketNumber"),
      author: authorIds.get(demo.authorCode),
      createdBy: authorUserIds.get(demo.authorCode),
      book: demo.bookCode ? bookIds.get(demo.bookCode) : null,
      subject: demo.subject,
      description: demo.description,
      ...statusFields(demo.status, {}, lastActivity),
      category: rules.category,
      categorySource: "rules",
      ...priorityFields(rules.priority, createdAt),
      prioritySource: "rules",
      triage: {
        status: "fallback",
        suggestedCategory: rules.category,
        suggestedPriority: rules.priority,
        confidence: rules.confidence,
        reasoning: `Seed data, classified by the rule-based classifier. Use "Re-run AI triage" to classify with AI.`,
        fallbackReason: "seed",
        completedAt: createdAt,
      },
      assignee: assignee?._id ?? null,
      messageCount: conversation.length,
      firstResponseAt: adminReplies.length
        ? hoursAgo(Math.max(...adminReplies.map(([, h]) => h)))
        : null,
      lastAdminReplyAt: adminReplies.length
        ? hoursAgo(Math.min(...adminReplies.map(([, h]) => h)))
        : null,
      lastAuthorMessageAt: authorReplies.length
        ? hoursAgo(Math.min(...authorReplies.map(([, h]) => h)))
        : createdAt,
      lastActivityAt: lastActivity,
      createdAt,
      updatedAt: lastActivity,
    });

    for (const [role, hours, body] of conversation) {
      await TicketMessageModel.create({
        ticket: ticket._id,
        sender:
          role === "admin" ? (assignee?._id ?? admins[0]._id) : authorUserIds.get(demo.authorCode),
        senderRole: role,
        body,
        createdAt: hoursAgo(hours),
      });
    }

    if (demo.note) {
      await TicketNoteModel.create({
        ticket: ticket._id,
        createdBy: assignee?._id ?? admins[0]._id,
        body: demo.note,
      });
    }

    await TicketEventModel.insertMany([
      { ticket: ticket._id, actor: authorUserIds.get(demo.authorCode), type: "created", createdAt },
      {
        ticket: ticket._id,
        actor: null,
        type: "triaged",
        to: `${rules.category} / ${rules.priority}`,
        meta: { source: "rules" },
        createdAt,
      },
    ]);
  }

  logger.info(
    {
      authors: dataset.authors.length,
      books: bookIds.size,
      admins: admins.length,
      tickets: DEMO_TICKETS.length,
    },
    "Seed complete",
  );
  logger.info(`Author login: <author email from dataset> / ${DEMO_AUTHOR_PASSWORD}`);
  logger.info(`Admin login:  ${ADMINS[0].email} / ${DEMO_ADMIN_PASSWORD}`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  logger.fatal({ err: error }, "Seed failed");
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
