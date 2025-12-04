export type GeneralModeResponse = {
    mode: 'general';
    distance: number | null;
    stores: any[];
}

export type StoreModeResponse = {
    mode: 'store';
    distance: number;
    store_id: number;
    store: any;
}

export type ModeResponse = GeneralModeResponse | StoreModeResponse;