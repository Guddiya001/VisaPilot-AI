import * as crypto from 'node:crypto';

export interface SnapshotPersonaRecord {
    id?: string;
    name: string;
    isActive?: boolean;
    contactInfo: Record<string, any>;
    workHistory: Array<Record<string, any>>;
    education: Array<Record<string, any>>;
    skills: Record<string, any>;
    demographicsEeo?: Record<string, any>;
    visaWorkAuth?: Record<string, any>;
    lockedFacts: Record<string, any>;
}

export interface SnapshotSelectorRecord {
    domain: string;
    fieldSignature: string;
    cssOrXpath: string;
    mappedProfileKey?: string | null;
    fieldType: string;
    formatMask?: string | null;
    confidence?: number;
    hitCount?: number;
}

export interface SnapshotQaMemoryRecord {
    category: string;
    rawQuestion: string;
    normalizedQuestion: string;
    answerTemplate: string;
    embedding?: number[] | null;
    maxCharLimit?: number | null;
    usageCount?: number;
}

export interface VisaPilotMemorySnapshot {
    version: number;
    exportedAt: string;
    personas: SnapshotPersonaRecord[];
    domainSelectors: SnapshotSelectorRecord[];
    qaSemanticMemory: SnapshotQaMemoryRecord[];
}

export interface MemoryPersistenceAdapter {
    restoreSnapshot: (snapshot: VisaPilotMemorySnapshot) => Promise<{
        personasRestored: number;
        selectorsRestored: number;
        qaMemoriesRestored: number;
    }>;
}

const MAGIC_HEADER = Buffer.from('VPENC01', 'ascii'); // 7 bytes
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class CryptoVault {
    /**
     * Encrypts memory snapshot into an opaque AES-256-GCM encrypted binary buffer.
     */
    static exportEncryptedMemory(
        snapshot: VisaPilotMemorySnapshot,
        passphrase: string
    ): Buffer {
        const payloadJson = JSON.stringify(snapshot);
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);

        const key = crypto.scryptSync(passphrase, salt, 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([
            cipher.update(payloadJson, 'utf-8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, encrypted]);
    }

    /**
     * Decrypts an encrypted memory snapshot binary buffer and restores records.
     */
    static async importEncryptedMemory(
        encryptedBuffer: Buffer,
        passphrase: string,
        persistenceAdapter?: MemoryPersistenceAdapter
    ): Promise<{
        snapshot: VisaPilotMemorySnapshot;
        persistenceResult?: {
            personasRestored: number;
            selectorsRestored: number;
            qaMemoriesRestored: number;
        };
    }> {
        const headerLen = MAGIC_HEADER.length;
        const minLen = headerLen + SALT_LENGTH + IV_LENGTH + TAG_LENGTH;

        if (
            encryptedBuffer.length < minLen ||
            !encryptedBuffer.subarray(0, headerLen).equals(MAGIC_HEADER)
        ) {
            throw new Error(
                'INVALID_PASSPHRASE_OR_CORRUPTED_ARCHIVE: Magic header mismatch or payload too short.'
            );
        }

        let offset = headerLen;
        const salt = encryptedBuffer.subarray(offset, offset + SALT_LENGTH);
        offset += SALT_LENGTH;

        const iv = encryptedBuffer.subarray(offset, offset + IV_LENGTH);
        offset += IV_LENGTH;

        const authTag = encryptedBuffer.subarray(offset, offset + TAG_LENGTH);
        offset += TAG_LENGTH;

        const ciphertext = encryptedBuffer.subarray(offset);

        try {
            const key = crypto.scryptSync(passphrase, salt, 32);
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);

            const snapshot: VisaPilotMemorySnapshot = JSON.parse(
                decrypted.toString('utf-8')
            );

            let persistenceResult;
            if (persistenceAdapter) {
                persistenceResult = await persistenceAdapter.restoreSnapshot(snapshot);
            }

            return { snapshot, persistenceResult };
        } catch (err: any) {
            throw new Error(
                `INVALID_PASSPHRASE_OR_CORRUPTED_ARCHIVE: Decryption or authentication failed (${err.message}).`
            );
        }
    }
}
