
// ============================================
// 车厢面板统一入口
// 组装地图、详情、系统状态和设置
// ============================================

import React, { memo } from 'react';
import { Map } from './Map';
import { Detail } from './Detail';
import { Status } from './Status';
import { Settings } from './Settings';
import { Carriage, SystemState, Maiden } from '../../meta';
import { ABYSS_TYPES } from '../../constants';

interface CarriagePanelProps {
    carriages: Map<string, Carriage>;
    maidens?: Map<string, Maiden>;
    masterCarriageId: string;
    onCarriageClick: (carriageId: string) => void;
    focusedMaidenCarriageId?: string;
    onHubShuffle?: () => void;
    currentCarriage?: Carriage;
    occupantCount: number;
    systemState: SystemState;
    // 设置相关 Props
    onSave: (slot: number) => Promise<void>;
    onLoad: (slot: number) => Promise<void>;
    onReset: () => Promise<void>;
}

export const CarriagePanel: React.FC<CarriagePanelProps> = memo((props) => {
    const isInAbyss = props.currentCarriage ? ABYSS_TYPES.includes(props.currentCarriage.type) : false;

    return (
        <div className={`w-96 shrink-0 border-l flex flex-col p-2.5 gap-2.5 overflow-y-auto custom-scrollbar transition-colors duration-300 ${isInAbyss ? 'border-purple-900/30 bg-gradient-to-b from-purple-950/20 to-black/80' : 'border-zinc-800/50 bg-gradient-to-b from-zinc-900/40 to-black/80'} backdrop-blur-sm h-full`}>
            {/* 1. 地图区域 */}
            <Map
                carriages={props.carriages}
                masterCarriageId={props.masterCarriageId}
                onCarriageClick={props.onCarriageClick}
                focusedMaidenCarriageId={props.focusedMaidenCarriageId}
                onHubShuffle={props.onHubShuffle}
            />

            {/* 2. 详情区域 */}
            <Detail
                carriage={props.currentCarriage}
                occupantCount={props.occupantCount}
            />

            {/* 3. 状态区域 */}
            <Status
                systemState={props.systemState}
                carriages={props.carriages}
                maidens={props.maidens}
                maidensInCarriageCount={props.occupantCount}
                isInAbyss={isInAbyss}
            />

            {/* 4. 设置与控制区域 (直接展示) */}
            <Settings
                onSave={props.onSave}
                onLoad={props.onLoad}
                onReset={props.onReset}
                isInAbyss={isInAbyss}
            />
        </div>
    );
});

CarriagePanel.displayName = 'CarriagePanel';
