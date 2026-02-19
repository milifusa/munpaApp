import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Envuelve la app con StripeProvider para habilitar pagos
 * (Apple Pay, Google Pay, tarjeta).
 * Si no hay key configurada, renderiza children sin Stripe.
 */
export default function StripeProviderWrapper({ children }: StripeProviderWrapperProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('⚠️ [STRIPE] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY no configurada');
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.munpa"
    >
      {children}
    </StripeProvider>
  );
}
