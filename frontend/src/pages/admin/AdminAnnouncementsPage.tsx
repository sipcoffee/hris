import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/useAnnouncements";
import { apiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Required").max(200),
  body: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export function AdminAnnouncementsPage() {
  const { data, isLoading } = useAnnouncements(100);
  const create = useCreateAnnouncement();
  const remove = useDeleteAnnouncement();
  const [creating, setCreating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "" },
  });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success("Announcement posted");
      reset({ title: "", body: "" });
      setCreating(false);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Announcements</h1>
          <p className="text-muted-foreground">Visible to every signed-in employee.</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {creating ? "Close" : "New announcement"}
        </Button>
      </div>

      {creating && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New announcement</CardTitle>
            <CardDescription>It will appear on every dashboard once posted.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" rows={5} {...register("body")} />
                {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Posting…" : "Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm text-muted-foreground">Post one to greet the team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{a.title}</CardTitle>
                  <CardDescription>
                    {formatDateTime(a.posted_at)} · {a.posted_by.email}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete "${a.title}"?`)) return;
                    try {
                      await remove.mutateAsync(a.id);
                      toast.success("Deleted");
                    } catch (err) {
                      toast.error(apiError(err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
