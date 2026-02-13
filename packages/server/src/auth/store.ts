import type { AuthStore } from '@fmdt/core';
import { AuthInfoSchema } from '@fmdt/core';
import { Entry } from '@napi-rs/keyring';

const KEYRING_SERVICE = 'fmdt';

function keyringKey(providerId: string): string {
  return `${KEYRING_SERVICE}:${providerId}`;
}

/** System-keyring-backed credential store. Keys: `fmdt:<providerId>`. */
export function createKeyringAuthStore(): AuthStore {
  return {
    async get(providerId) {
      try {
        const entry = new Entry(KEYRING_SERVICE, keyringKey(providerId));
        const raw = entry.getPassword();
        if (!raw) return null;
        return AuthInfoSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async set(providerId, info) {
      const entry = new Entry(KEYRING_SERVICE, keyringKey(providerId));
      entry.setPassword(JSON.stringify(info));
    },

    async remove(providerId) {
      try {
        const entry = new Entry(KEYRING_SERVICE, keyringKey(providerId));
        entry.deletePassword();
      } catch {
        // Ignore if not found
      }
    },
  };
}
