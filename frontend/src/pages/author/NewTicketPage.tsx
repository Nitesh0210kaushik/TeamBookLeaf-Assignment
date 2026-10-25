import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AttachmentPicker } from "@/components/tickets/AttachmentPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PageHeader, Spinner } from "@/components/ui/States";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { useGetBooksQuery } from "@/store/api/accountApi";
import { useCreateTicketMutation } from "@/store/api/ticketsApi";

const DESCRIPTION_MAX = 5000;

// Mirrors the backend rules so most mistakes are caught before the request.
const schema = z.object({
  bookId: z.string(),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters.").max(150, "Keep the subject under 150 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Please describe the issue in at least 20 characters so we can help faster.")
    .max(DESCRIPTION_MAX, `Description cannot exceed ${DESCRIPTION_MAX} characters.`),
});
type FormValues = z.infer<typeof schema>;

const TOPIC_PRESETS: Record<string, string> = {
  royalty: "Royalty payout not received",
};

export function NewTicketPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: books, isLoading: booksLoading } = useGetBooksQuery();
  const [createTicket, { isLoading }] = useCreateTicketMutation();
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookId: params.get("bookId") ?? "",
      subject: TOPIC_PRESETS[params.get("topic") ?? ""] ?? "",
      description: "",
    },
  });

  const descriptionLength = watch("description")?.length ?? 0;

  const onSubmit = async (values: FormValues) => {
    try {
      const ticket = await createTicket({
        bookId: values.bookId || null,
        subject: values.subject,
        description: values.description,
        attachments: files.map((file) => ({ fileName: file.name, fileSize: file.size, mimeType: file.type || null })),
      }).unwrap();
      toast.success(`Ticket #${ticket.ticketNumber} submitted`);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (field in schema.shape) setError(field as keyof FormValues, { message: messages[0] });
      }
      toast.error(getErrorMessage(error));
    }
  };

  if (booksLoading) return <Spinner />;

  return (
    <>
      <PageHeader title="Submit a support query" description="Tell us what's going on — the more specific, the faster we can help." />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Which book is this about?" htmlFor="bookId" error={errors.bookId?.message}>
              <Select id="bookId" {...register("bookId")}>
                <option value="">General / Account Level</option>
                {books?.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                    {book.production.isPublished ? "" : " (in production)"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Subject" htmlFor="subject" error={errors.subject?.message}>
              <Input id="subject" placeholder="e.g. Royalty for Q2 not received" aria-invalid={!!errors.subject} {...register("subject")} />
            </Field>

            <Field
              label="Describe the issue"
              htmlFor="description"
              error={errors.description?.message}
              hint={
                <span className="flex justify-between gap-4">
                  <span>Include dates, amounts, platform names or order numbers if you have them.</span>
                  <span className="tabular-nums">{descriptionLength}/{DESCRIPTION_MAX}</span>
                </span>
              }
            >
              <Textarea
                id="description"
                rows={8}
                placeholder="What happened, what you expected, and anything you've already tried…"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
            </Field>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-ink">
                Attachments <span className="font-normal text-muted">(optional)</span>
              </span>
              <AttachmentPicker files={files} onChange={setFiles} />
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-5">
              <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={isLoading} icon={<Send className="size-4" />}>Submit query</Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-brand-600" />What happens next</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              <li>1. Your query is routed to the right team automatically.</li>
              <li>2. Urgent issues — missing royalties, ISBN errors — are prioritised first.</li>
              <li>3. You'll see our reply under <span className="font-medium text-ink">My Tickets</span> the moment it's sent.</li>
            </ol>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-brand-600" />Quick answers</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Royalties are paid within 45 days after each quarter, once your balance is at least ₹1,000.</li>
              <li>New listings go live 7–10 business days after publication.</li>
              <li>Description changes reflect on stores within 3–5 business days.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
