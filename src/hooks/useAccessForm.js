import { useState, useCallback } from 'react';
import { AccessTypes } from '@/components/Anagrafica/AccessDialog/AccessTypes';
import { convertFileToBase64 } from '@/utils/fileUtils';

const initialFormState = AccessTypes.reduce((acc, type) => {
    acc[type.value] = {
        subCategories: [],
        altroText: "",
        content: "", // notes
        files: [],
        classification: "",
        referralEntity: "",
        reminderDate: null,
        reminderTime: "",
    };
    return acc;
}, {});

export function useAccessForm() {
    const [accessState, setAccessState] = useState(initialFormState);

    const updateAccessField = useCallback((typeVal, field, value) => {
        setAccessState((prev) => ({
            ...prev,
            [typeVal]: {
                ...prev[typeVal],
                [field]: value,
            },
        }));
    }, []);

    const resetAccessForm = useCallback(() => {
        setAccessState(initialFormState);
    }, []);

    const isAccessTypeValid = useCallback((typeVal) => {
        const s = accessState[typeVal];
        if (!s) return false;
        if (s.subCategories.length > 0) {
            if (s.subCategories.includes("Altro") && !s.altroText.trim()) return false;
            return true;
        }
        return false;
    }, [accessState]);

    const getValidAccessTypes = useCallback(() => {
        return AccessTypes.filter((t) => isAccessTypeValid(t.value));
    }, [isAccessTypeValid]);

    const prepareAccessPayload = useCallback(async () => {
        const validTypes = getValidAccessTypes();
        return await Promise.all(validTypes.map(async (type) => {
            const state = accessState[type.value];
            const cleanedState = {
                tipoAccesso: type.label,
            };
            if (state.subCategories.length > 0) cleanedState.sottoCategorie = state.subCategories;
            if (state.subCategories.includes("Altro") && state.altroText.trim() !== "")
                cleanedState.altro = state.altroText.trim();
            if (state.content.trim() !== "") cleanedState.note = state.content.trim();
            if (state.classification) cleanedState.classificazione = state.classification;
            if (state.referralEntity) cleanedState.enteRiferimento = state.referralEntity;

            if (state.files.length > 0) {
                cleanedState.files = await Promise.all(state.files.map(async (f) => {
                    const base64 = await convertFileToBase64(f.file);
                    return {
                        name: f.name,
                        creationDate: f.creationDate instanceof Date ? f.creationDate.toISOString() : f.creationDate,
                        expirationDate: f.expirationDate instanceof Date ? f.expirationDate.toISOString() : f.expirationDate,
                        base64,
                        type: f.file.type,
                        size: f.file.size
                    };
                }));
            }

            if (state.reminderDate) {
                const date = new Date(state.reminderDate);
                if (state.reminderTime) {
                    const [hours, minutes] = state.reminderTime.split(':');
                    date.setHours(parseInt(hours), parseInt(minutes));
                }
                cleanedState.reminderDate = date.toISOString();
            }

            return cleanedState;
        }));
    }, [accessState, getValidAccessTypes]);

    return {
        accessState,
        updateAccessField,
        resetAccessForm,
        isAccessTypeValid,
        getValidAccessTypes,
        prepareAccessPayload
    };
}
