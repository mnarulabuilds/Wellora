import { Stack, useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen title="Page not found" showBack>
        <EmptyState
          icon="compass-outline"
          title="This screen doesn't exist."
          message="The link may be outdated."
          actionLabel="Go to Home"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    </>
  );
}
