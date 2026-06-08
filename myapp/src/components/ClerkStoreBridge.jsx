'use client';

import { useEffect } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import useAppStore from '../store/useAppStore';

/**
 * Bridges Clerk's session state into the plain (non-hook) Zustand store so that
 * existing store logic can read `isLoggedIn` / `currentUser`, fetch a fresh Clerk
 * token via `getToken`, and prompt sign-in via `requireAuth`.
 */
export default function ClerkStoreBridge() {
    const { isSignedIn, isLoaded, getToken } = useAuth();
    const { user } = useUser();
    const { openSignIn } = useClerk();

    useEffect(() => {
        if (!isLoaded) return;

        useAppStore.setState({
            isLoggedIn: !!isSignedIn,
            currentUser: isSignedIn && user
                ? {
                    id: user.id,
                    name: user.fullName || user.firstName || user.username || 'مستخدم',
                    email: user.primaryEmailAddress?.emailAddress || '',
                    role: user.publicMetadata?.role || 'user',
                }
                : null,
            // Async getter for a fresh Clerk session JWT (used as Bearer token).
            getToken: () => getToken(),
            requireAuth: () => openSignIn(),
        });
    }, [isLoaded, isSignedIn, user, getToken, openSignIn]);

    return null;
}
