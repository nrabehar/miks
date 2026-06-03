'use client';

import {
	environmentManager,
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const makeQueryClient = () => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60,
			},
		},
	});
};

let browserQueryClient: QueryClient | undefined = undefined;

const getQueryClient = () => {
	if (environmentManager.isServer()) return makeQueryClient();

	if (!browserQueryClient) browserQueryClient = makeQueryClient();

	return browserQueryClient;
};

export const TanstackProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
};
