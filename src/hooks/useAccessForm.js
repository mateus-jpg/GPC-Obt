import { useState, useCallback, useMemo, useEffect } from 'react';
import { AccessTypes as DefaultAccessTypes } from '@/components/Anagrafica/AccessDialog/AccessTypes';
import { convertFileToBase64 } from '@/utils/fileUtils';

/**
 * Creates initial form state from a list of categories
 */
function createInitialState(categories) {
    return (categories || DefaultAccessTypes).reduce((acc, type) => {
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
}

export function useAccessForm(categories = null) {
    // Use provided categories or fall back to defaults
    const accessTypes = useMemo(() => {
        return categories && categories.length > 0 ? categories : DefaultAccessTypes;
    }, [categories]);

    const [accessState, setAccessState] = useState(() => createInitialState(accessTypes));

    // Update state when categories change (add new category types)
    useEffect(() => {
        setAccessState((prevState) => {
            const newState = { ...prevState };
            let hasChanges = false;

            for (const type of accessTypes) {
                if (!newState[type.value]) {
                    newState[type.value] = {
                        subCategories: [],
                        altroText: "",
                        content: "",
                        files: [],
                        classification: "",
                        referralEntity: "",
                        reminderDate: null,
                        reminderTime: "",
                    };
                    hasChanges = true;
                }
            }

            return hasChanges ? newState : prevState;
        });
    }, [accessTypes]);

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
        setAccessState(createInitialState(accessTypes));
    }, [accessTypes]);

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
        return accessTypes.filter((t) => isAccessTypeValid(t.value));
    }, [accessTypes, isAccessTypeValid]);

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
