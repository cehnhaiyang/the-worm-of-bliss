
// ============================================
// 设置面板组件 (Embedded Version)
// 音量控制、游戏存档、系统信息
// ============================================

import React, { useState, useEffect, memo } from 'react';
import { SoundCategory, AudioState, SaveSlotInfo } from '../../meta';
import { audioService, persistenceService, aiService } from '../../engines/services';
import { AVAILABLE_TEXT_MODELS } from '../../engines/services/AIService/TextService';
import { AVAILABLE_IMAGE_MODELS } from '../../engines/services/AIService/ImageService';

// ============================================
// Props 接口
// ============================================

interface SettingsProps {
  onSave: (slot: number) => Promise<void>;
  onLoad: (slot: number) => Promise<void>;
  onReset: () => Promise<void>;
  isInAbyss?: boolean;
}

// ============================================
// SVG 图标
// ============================================

const Icons = {
  Audio: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  Data: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  System: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
};

// ============================================
// 音量滑块组件 (Memoized)
// ============================================

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

const VolumeSlider = memo<VolumeSliderProps>(({ label, value, onChange, compact }) => (
  <div className={`flex items-center gap-2 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
    <span className="text-zinc-500 w-8 font-tech uppercase text-right shrink-0">{label}</span>
    <div className="flex-1 relative h-4 flex items-center group">
      <div className="absolute inset-0 bg-zinc-800/50 rounded-sm border border-zinc-700/50" />
      <div
        className="absolute left-0 top-0 bottom-0 bg-zinc-600/50 rounded-sm border-r border-zinc-500/50 transition-all duration-100 group-hover:bg-zinc-500/50"
        style={{ width: `${value * 100}%` }}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="relative w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
    <span className="text-zinc-500 w-6 font-mono text-right shrink-0">{Math.round(value * 100)}</span>
  </div>
));

VolumeSlider.displayName = 'VolumeSlider';

// ============================================
// 主组件
// ============================================

export const Settings: React.FC<SettingsProps> = memo(({
  onSave,
  onLoad,
  onReset,
  isInAbyss
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'data' | 'system'>('audio');
  const [audioState, setAudioState] = useState<AudioState>(audioService.getState());
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [textModel, setTextModel] = useState(aiService.getTextModel());
  const [imageModel, setImageModel] = useState(aiService.getImageModel());

  // 初始化加载存档信息
  useEffect(() => {
    persistenceService.getSaveSlots().then(setSaveSlots);
  }, []);

  const handleRefreshSlots = () => {
    persistenceService.getSaveSlots().then(setSaveSlots);
  };

  const handleMasterVolume = (value: number) => {
    audioService.setMasterVolume(value);
    setAudioState(audioService.getState());
  };

  const handleCategoryVolume = (category: SoundCategory, value: number) => {
    audioService.setCategoryVolume(category, value);
    setAudioState(audioService.getState());
  };

  const handleSaveWrapper = async () => {
    await onSave(selectedSlot);
    handleRefreshSlots();
  };

  const handleDeleteSave = async () => {
    const selectedSlotData = saveSlots.find(s => s.slot === selectedSlot);
    if (!selectedSlotData) return;
    if (!confirm(`确定要删除存档 ${selectedSlot} 吗？此操作不可撤销！`)) return;
    
    const success = await persistenceService.deleteSave(selectedSlot);
    if (success) {
      handleRefreshSlots();
    } else {
      alert('删除存档失败，请查看控制台日志');
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    aiService.setTextModel(newModel);
    setTextModel(newModel);
  };

  const handleImageModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    aiService.setImageModel(newModel);
    setImageModel(newModel);
  };

  const selectedSlotData = saveSlots.find(s => s.slot === selectedSlot);

  return (
    <div className={`panel flex flex-col shrink-0 ${isInAbyss ? 'panel-abyss' : ''}`}>
      {/* 顶部 Tab 栏 */}
      <div className="flex border-b border-zinc-800/50">
        {[
          { id: 'audio', icon: Icons.Audio, label: 'AUDIO' },
          { id: 'data', icon: Icons.Data, label: 'DATA' },
          { id: 'system', icon: Icons.System, label: 'SYSTEM' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-tech tracking-wider transition-all
              ${activeTab === tab.id
                ? 'bg-zinc-800/50 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-3 min-h-[160px]">

        {/* 音频设置 */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <VolumeSlider label="MAIN" value={audioState.masterVolume} onChange={handleMasterVolume} />
            <div className="h-px bg-zinc-800/50 my-2" />
            <VolumeSlider label="AMB" value={audioState.categoryVolumes[SoundCategory.AMBIENT]} onChange={(v) => handleCategoryVolume(SoundCategory.AMBIENT, v)} compact />
            <VolumeSlider label="UI" value={audioState.categoryVolumes[SoundCategory.UI]} onChange={(v) => handleCategoryVolume(SoundCategory.UI, v)} compact />
            <VolumeSlider label="SFX" value={audioState.categoryVolumes[SoundCategory.EVENT]} onChange={(v) => handleCategoryVolume(SoundCategory.EVENT, v)} compact />

            <button
              onClick={() => {
                audioService.toggleMute();
                setAudioState(audioService.getState());
              }}
              className={`w-full mt-2 py-1.5 text-[10px] font-tech uppercase border rounded transition-all ${audioState.isMuted
                ? 'bg-red-900/20 border-red-800/50 text-red-400'
                : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50'
                }`}
            >
              {audioState.isMuted ? 'Muted' : 'Mute Audio'}
            </button>
          </div>
        )}

        {/* 存档管理 */}
        {activeTab === 'data' && (
          <div className="space-y-3">
            {/* 槽位网格 */}
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map(slot => {
                const hasData = saveSlots.some(s => s.slot === slot);
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`aspect-square flex flex-col items-center justify-center rounded border transition-all ${selectedSlot === slot
                      ? 'bg-zinc-700/50 border-zinc-500 text-zinc-100 ring-1 ring-zinc-500/50'
                      : hasData
                        ? 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                        : 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 hover:border-zinc-700'
                      }`}
                  >
                    <span className="text-xs font-mono font-bold">{slot}</span>
                    <div className={`w-1 h-1 rounded-full mt-1 ${hasData ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                  </button>
                );
              })}
            </div>

            {/* 选中信息 */}
            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50 text-[10px] min-h-[40px] flex flex-col justify-center">
              {selectedSlotData ? (
                <>
                  <div className="flex justify-between text-zinc-400 font-mono">
                    <span>DAY {selectedSlotData.daysElapsed}</span>
                    <span>{new Date(selectedSlotData.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-zinc-500 truncate mt-0.5">
                    {selectedSlotData.slotName || 'Unknown Save'}
                  </div>
                </>
              ) : (
                <span className="text-zinc-600 text-center italic">EMPTY SLOT</span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveWrapper}
                className="flex-1 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-500/50 rounded text-[10px] font-tech text-zinc-300 transition-colors uppercase"
              >
                Overwrite
              </button>
              <button
                onClick={() => onLoad(selectedSlot)}
                disabled={!selectedSlotData}
                className="flex-1 py-1.5 bg-zinc-800/50 hover:bg-emerald-900/20 border border-zinc-700/50 hover:border-emerald-700/50 rounded text-[10px] font-tech text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors uppercase"
              >
                Load
              </button>
              <button
                onClick={handleDeleteSave}
                disabled={!selectedSlotData}
                className="flex-1 py-1.5 bg-zinc-800/50 hover:bg-red-900/20 border border-zinc-700/50 hover:border-red-700/50 rounded text-[10px] font-tech text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* 系统信息 */}
        {activeTab === 'system' && (
          <div className="space-y-3">
            {/* AI 模型选择 */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-tech uppercase">TEXT GENERATION MODEL</label>
              <select
                value={textModel}
                onChange={handleModelChange}
                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-600"
              >
                <optgroup label="Groq">
                  <option value={AVAILABLE_TEXT_MODELS.QWEN}>{AVAILABLE_TEXT_MODELS.QWEN}</option>
                  <option value={AVAILABLE_TEXT_MODELS.LLAMA_MAVERICK}>{AVAILABLE_TEXT_MODELS.LLAMA_MAVERICK}</option>
                  <option value={AVAILABLE_TEXT_MODELS.LLAMA_3_3_70B}>{AVAILABLE_TEXT_MODELS.LLAMA_3_3_70B}</option>
                  <option value={AVAILABLE_TEXT_MODELS.GROQ_COMPOUND}>{AVAILABLE_TEXT_MODELS.GROQ_COMPOUND}</option>
                </optgroup>
                <optgroup label="Agent2API (localhost:3065)">
                  <option value={AVAILABLE_TEXT_MODELS.GLM_5_2_CN}>{AVAILABLE_TEXT_MODELS.GLM_5_2_CN}</option>
                  <option value={AVAILABLE_TEXT_MODELS.GLM_5_2_GLOBAL}>{AVAILABLE_TEXT_MODELS.GLM_5_2_GLOBAL}</option>
                  <option value={AVAILABLE_TEXT_MODELS.STEP_5_PREVIEW_GLOBAL}>{AVAILABLE_TEXT_MODELS.STEP_5_PREVIEW_GLOBAL}</option>
                  <option value={AVAILABLE_TEXT_MODELS.STEP_5_PREVIEW_CN}>{AVAILABLE_TEXT_MODELS.STEP_5_PREVIEW_CN}</option>
                  <option value={AVAILABLE_TEXT_MODELS.GLM_5_3_FLASH}>{AVAILABLE_TEXT_MODELS.GLM_5_3_FLASH}</option>
                  <option value={AVAILABLE_TEXT_MODELS.GLM_5_2}>{AVAILABLE_TEXT_MODELS.GLM_5_2}</option>
                </optgroup>
              </select>
            </div>

            {/* 图像模型选择 */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-tech uppercase">IMAGE GENERATION MODEL</label>
              <select
                value={imageModel}
                onChange={handleImageModelChange}
                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1.5 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-600"
              >
                <option value={AVAILABLE_IMAGE_MODELS.FLUX}>{AVAILABLE_IMAGE_MODELS.FLUX}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] bg-zinc-900/30 p-1.5 rounded border border-zinc-800/30">
                <span className="text-zinc-500">CORE</span>
                <span className="text-zinc-300 font-mono">v0.2.1</span>
              </div>
              <div className="flex justify-between items-center text-[10px] bg-zinc-900/30 p-1.5 rounded border border-zinc-800/30">
                <span className="text-zinc-500">ENGINE</span>
                <span className="text-zinc-300 font-mono">REACT 19</span>
              </div>
            </div>

            <button
              onClick={onReset}
              className="w-full py-2 mt-2 bg-red-950/10 hover:bg-red-900/20 border border-red-900/30 hover:border-red-800/50 text-red-900 hover:text-red-500 rounded text-[10px] font-tech transition-all uppercase"
            >
              !!! FACTORY RESET !!!
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Settings.displayName = 'Settings';
