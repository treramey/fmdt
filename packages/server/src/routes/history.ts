import { Hono } from 'hono';
import { z } from 'zod/v4';
import { addHistoryEntry, loadHistory } from '../history/store.ts';
import { lazy } from '../util/lazy.ts';

const AddHistorySchema = z.object({
  entry: z.string().min(1),
});

export const HistoryRoutes = lazy(() =>
  new Hono()
    .get('/', async (c) => {
      const history = await loadHistory();
      return c.json(history);
    })
    .post('/', async (c) => {
      const body = await c.req.json();
      const parsed = AddHistorySchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
      }
      const updated = await addHistoryEntry(parsed.data.entry);
      return c.json(updated);
    }),
);
