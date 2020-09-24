export const OPEN_POPUP = 'OPEN_POPUP';
export const CLOSE_POPUP = 'CLOSE_POPUP';

export const openPopup = (payload: string) => ({
    type: OPEN_POPUP,
    payload,
});

export const closePopup = (payload: string) => ({
    type: CLOSE_POPUP,
    payload,
});
