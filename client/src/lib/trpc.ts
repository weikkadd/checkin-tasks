import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://checkin-tasks.onrender.com/api/trpc',
    }),
  ],
});
