import { STATUS_TYPE } from "../components/Swap/Text/components/StatusText";

export const getStatusTextByString = (status: string | null) => {
    switch (status?.toLowerCase()) {
        case 'filled':
            return 'Filled';
        case 'partial':
            return 'Partial';
        case 'cancelled':
            return 'Cancelled';
        default:
            return 'Open';
    }
};

export const getStatusIconByString = (status: string | null) => {
    switch (status?.toLowerCase()) {
        case 'filled':
            return STATUS_TYPE.FILLED;
        case 'partial':
            return STATUS_TYPE.PARTIAL;
        case 'cancelled':
            return STATUS_TYPE.CANCELLED;
        default:
            return STATUS_TYPE.OPEN;
    }
};
