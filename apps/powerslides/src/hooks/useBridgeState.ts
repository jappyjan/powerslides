import { CreateStartUpPageContainer, RebuildPageContainer, StartUpPageCreateResult, TextContainerProperty, waitForEvenAppBridge, type EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { create } from 'zustand';


interface BridgeState {
    initialized: boolean;
    bridge: EvenAppBridge | null;
    initialize: (container: CreateStartUpPageContainer) => Promise<EvenAppBridge>;
}

export const useBridgeState = create<BridgeState>((set) => ({
    initialized: false,
    bridge: null,
    initialize: async (container) => {
        const bridge = await waitForEvenAppBridge();
        const result = await bridge.createStartUpPageContainer(container);

        if (result !== StartUpPageCreateResult.success) {
            set({ initialized: false, bridge });
            throw new Error('Failed to create startup page');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        set({ bridge, initialized: true });
        return bridge;
    },
}));