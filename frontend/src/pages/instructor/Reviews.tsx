import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instructorApi, instructorPublicApi } from '@/api/endpoints';
import { Avatar, Button, Card, Empty, Spinner, Stars, Textarea } from '@/components/ui';
import { dateOnly } from '@/lib/format';

export default function Reviews({ instructorId }: { instructorId?: number }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', instructorId, 0],
    queryFn: () => instructorPublicApi.reviews(instructorId!),
    enabled: !!instructorId,
  });
  const reply = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => instructorApi.reply(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', instructorId] }),
  });

  if (!instructorId || isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="page-title">Reviews</h1>
      {!data?.content.length ? <Empty title="No reviews yet">Reviews appear after completed sessions. (Visible once your profile is approved.)</Empty> : data.content.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Avatar src={r.customerAvatar} name={r.customerName} size={36} />
            <div><p className="font-medium">{r.customerName}</p><p className="text-xs text-slate-500">{dateOnly(r.createdAt)}</p></div>
            <div className="ml-auto"><Stars value={r.rating} /></div>
          </div>
          {r.comment && <p className="mt-2">{r.comment}</p>}
          {r.instructorResponse ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><b>Your response:</b> {r.instructorResponse}</p>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea maxLength={3000} placeholder="Write a public response…" value={drafts[r.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
              <Button disabled={!drafts[r.id]?.trim()} loading={reply.isPending} onClick={() => reply.mutate({ id: r.id, text: drafts[r.id] })}>Respond</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
