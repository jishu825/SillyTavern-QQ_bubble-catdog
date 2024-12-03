
// 设置常量
const MODULE_NAME = 'chat-stylist';

// 引入 SillyTavern 核心功能
import { animation_duration, eventSource, event_types } from '../../../../script.js';

// 检查核心依赖
console.log('Loading Chat Stylist extension...');

if (!customElements.get('toolcool-color-picker')) {
    console.error('toolcool-color-picker component is not loaded. Please ensure the component is properly included.');
}

// 初始化必要的全局对象
if (!window.extension_settings) {
    console.log('Creating extension_settings object');
    window.extension_settings = {};
}

// 初始化模块设置
if (!window.extension_settings[MODULE_NAME]) {
    window.extension_settings[MODULE_NAME] = {
        styles: {},
        defaultStyle: {
            background: {
                type: 'solid',
                color: 'rgba(254, 222, 169, 0.5)',
                gradient: {
                    colors: ['rgba(254, 222, 169, 0.5)', 'rgba(255, 255, 255, 0.5)'],
                    positions: [0, 100],
                    angle: 90
                }
            },
            text: {
                main: 'rgba(208, 206, 196, 1)',
                italics: 'rgba(183, 160, 255, 1)',
                quote: 'rgba(224, 159, 254, 1)'
            },
            effects: {
                quoteGlow: {
                    enabled: false,
                    color: 'rgba(224, 159, 254, 0.8)',
                    intensity: 5
                }
            },
            padding: {
                top: 10,
                right: 15,
                bottom: 10,
                left: 15
            }
        }
    };
}

class ChatStylist {
    constructor() {
        this.settings = window.extension_settings[MODULE_NAME];
        this.currentCharacter = null;
        this.panel = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeStart = { width: 0, height: 0, x: 0, y: 0 };
    }

    async init() {
        try {
            console.log('Chat Stylist: Waiting for SillyTavern to be ready...');

            // 等待 SillyTavern 加载完成
            eventSource.once(event_types.APP_READY, () => {
                console.log('Chat Stylist: SillyTavern is ready.');
                this.createEditorPanel();
                this.initStyles();
                this.addSettingsButton();
                this.initEventListeners();
                console.log('Chat Stylist initialized successfully');
            });
        } catch (error) {
            console.error('Failed to initialize Chat Stylist:', error);
        }
    }

    initStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .style-editor-panel {
                position: fixed;
                top: 50px;
                right: 20px;
                width: 320px;
                min-width: 320px;
                min-height: 200px;
                background: #2d2d2d;
                border: 1px solid #444;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                z-index: 10000;
                resize: both;
                overflow: hidden;
                font-family: Arial, sans-serif;
                color: #fff;
            }

            .panel-content {
                padding: 15px;
                height: calc(100% - 50px);
                overflow-y: auto;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    createEditorPanel() {
        const panel = document.createElement('div');
        panel.id = 'style-editor-panel';
        panel.className = 'style-editor-panel';
        panel.style.display = 'none';

        panel.innerHTML = `
        <div class="panel-header">
            <div class="header-tabs">
                <button class="tab-button active" data-tab="bubble">气泡样式</button>
                <button class="tab-button" data-tab="text">文本样式</button>
            </div>
            <div class="header-controls">
                <button class="save-btn" title="保存样式"><i class="fa-solid fa-save"></i></button>
                <button class="reset-btn" title="重置样式"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="minimize-btn"><i class="fa-solid fa-minus"></i></button>
                <button class="close-btn"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
        <div class="panel-content">
            <!-- Character Selection -->
            <div class="control-group">
                <label>选择角色 / Select Character</label>
                <select id="character-select" class="form-control">
                    <option value="">选择角色...</option>
                </select>
            </div>

            <!-- Bubble Style Tab -->
            <div class="tab-content active" data-tab="bubble">
                <div class="control-group">
                    <label>背景样式 / Background Style</label>
                    <select id="background-type" class="form-control">
                        <option value="solid">纯色 / Solid</option>
                        <option value="linear">线性渐变 / Linear Gradient</option>
                        <option value="radial">径向渐变 / Radial Gradient</option>
                    </select>

                    <div id="solid-background" class="background-settings">
                        <div class="color-picker-wrapper">
                            <toolcool-color-picker id="background-color" color="rgba(254, 222, 169, 0.5)"></toolcool-color-picker>
                        </div>
                    </div>

                    <div id="gradient-background" class="background-settings" style="display: none;">
                        <div class="color-stop-container">
                            <div class="color-stop">
                                <toolcool-color-picker class="gradient-color" color="rgba(254, 222, 169, 0.5)"></toolcool-color-picker>
                                <div class="gradient-position-control">
                                    <label>位置 / Position (%)</label>
                                    <input type="number" class="gradient-position" value="0" min="0" max="100">
                                </div>
                            </div>
                            <div class="color-stop">
                                <toolcool-color-picker class="gradient-color" color="rgba(255, 255, 255, 0.5)"></toolcool-color-picker>
                                <div class="gradient-position-control">
                                    <label>位置 / Position (%)</label>
                                    <input type="number" class="gradient-position" value="100" min="0" max="100">
                                </div>
                            </div>
                        </div>
                        <div class="gradient-angle">
                            <label>渐变角度 / Angle: <span class="angle-value">90°</span></label>
                            <input type="range" class="gradient-angle-slider" min="0" max="360" value="90">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Text Style Tab -->
            <div class="tab-content" data-tab="text">
                <div class="control-group">
                    <label>主要文本 / Main Text</label>
                    <div class="color-picker-wrapper">
                        <toolcool-color-picker id="main-text-color" color="rgba(208, 206, 196, 1)"></toolcool-color-picker>
                    </div>
                </div>

                <div class="control-group">
                    <label>斜体文本 / Italic Text</label>
                    <div class="color-picker-wrapper">
                        <toolcool-color-picker id="italics-text-color" color="rgba(183, 160, 255, 1)"></toolcool-color-picker>
                    </div>
                </div>

                <div class="control-group">
                    <label>引用文本 / Quote Text</label>
                    <div class="color-picker-wrapper">
                        <toolcool-color-picker id="quote-text-color" color="rgba(224, 159, 254, 1)"></toolcool-color-picker>
                    </div>
                </div>
            </div>
        </div>
        <div class="panel-resize-handle"></div>`;
        document.body.appendChild(panel);
        this.panel = panel;

        setTimeout(() => {
            panel.querySelectorAll('toolcool-color-picker').forEach(picker => {
                if (!picker.initialized) {
                    picker.setAttribute('color', picker.getAttribute('color'));
                }
            });
        }, 100);
    }

    addSettingsButton() {
        const extensionHtml = `
            <div id="chat-stylist-settings" class="extension-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b class="inline-drawer-title">聊天气泡样式编辑器</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="chat-stylist-control">
                            <div id="chat-stylist-button" class="menu_button">
                                <i class="fa-solid fa-palette"></i>
                                <span class="button-label">打开样式编辑器</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        $('#extensions_settings2').append(extensionHtml);

        $('#chat-stylist-button').on('click', () => {
            this.showPanel();
        });
    }

    showPanel() {
        this.panel.style.display = 'block';
    }

    hidePanel() {
        this.panel.style.display = 'none';
    }
}

// 注册扩展
const chatStylist = new ChatStylist();
window.extensions = window.extensions || {};
window.extensions[MODULE_NAME] = chatStylist;

// 初始化扩展
jQuery(async () => {
    try {
        console.log('Starting Chat Stylist initialization...');
        await chatStylist.init();
    } catch (error) {
        console.error('Failed to initialize Chat Stylist:', error);
    }
});
