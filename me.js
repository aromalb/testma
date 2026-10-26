import { aiProvider } from '../lib/ai-provider.js';
import { currentUser, send, fail } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    const user = await currentUser(req);
    send(res, 200, { user, ai: !!aiProvider(process.env) });
  } catch (e) {
    fail(res, e);
  }
}
