import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { api } from "../../../scripts/api.js";


// 修改类名以避免冲突
class TransformBoxPro {
    constructor(image, canvas, initialOpacity = 1.0) {
        this.image = image;
        this.canvas = canvas;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.position = { x: 0, y: 0 };
        
        // 动态计算控制点和边框尺寸
        this.calculateSizes();
        
        // 添加原始尺寸记录
        this.originalWidth = image.width;
        this.originalHeight = image.height;
        
        // 计算初始缩放以适应画布
        this.initializeScale();
        this.opacity = initialOpacity;

        // 添加主题颜色
        this.colors = {
            primary: '#2196F3',     // 蓝色主色调
            handle: '#FFFFFF',      // 白色控制点
            border: '#2196F3',      // 蓝色边框
            shadow: 'rgba(0,0,0,0.3)', // 阴影颜色
            hover: '#64B5F6'        // 悬停时的颜色
        };
    }
    
    // 添加动态尺寸计算方法
    calculateSizes() {
        // 获取屏幕分辨率
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        
        // 使用屏幕对角线长度作为参考
        const screenDiagonal = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
        
        // 设置各个尺寸（使用屏幕对角线的比例）
        this.borderWidth = screenDiagonal * 0.002;     // 屏幕对角线的0.2%
        this.handleSize = screenDiagonal * 0.008;      // 屏幕对角线的0.8%
        this.rotateHandleDistance = screenDiagonal * 0.02;  // 屏幕对角线的2%
        this.hitTestArea = screenDiagonal * 0.01;      // 屏幕对角线的1%
        
        // 设置最小值，确保在任何分辨率下都清晰可见
        this.borderWidth = Math.max(4, this.borderWidth);    // 最小4像素
        this.handleSize = Math.max(16, this.handleSize);     // 最小16像素
        this.rotateHandleDistance = Math.max(48, this.rotateHandleDistance);  // 最小48像素
        this.hitTestArea = Math.max(32, this.hitTestArea);   // 最小32像素
    }
    
    // 修改绘制方法
    draw(ctx) {
        ctx.save();
        
        // 应用变换
        ctx.translate(this.canvas.width/2 + this.position.x, 
                     this.canvas.height/2 + this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        // 使用更细腻的虚线边框
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = this.borderWidth;
        ctx.setLineDash([this.borderWidth * 4, this.borderWidth * 4]);
        
        // 添加边框阴影效果
        ctx.shadowColor = this.colors.shadow;
        ctx.shadowBlur = this.borderWidth * 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // 绘制外框
        const padding = this.handleSize;
        ctx.strokeRect(
            -this.image.width/2 - padding,
            -this.image.height/2 - padding,
            this.image.width + padding * 2,
            this.image.height + padding * 2
        );
        
        // 清除阴影效果，以免影响控制点
        ctx.shadowColor = 'transparent';
        
        // 绘制控制点
        ctx.setLineDash([]);
        this.drawHandles(ctx);
        
        // 绘制旋转指示器
        this.drawRotationIndicator(ctx);
        
        ctx.restore();
    }
    
    // 修改控制点绘制
    drawHandles(ctx) {
        const handles = this.getHandlePositions();
        
        handles.forEach(handle => {
            if (handle.type === 'rotate') return; // 旋转控制点单独处理

            // 绘制控制点外圈
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, this.handleSize * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.shadow;
            ctx.fill();
            
            // 绘制控制点内圈
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, this.handleSize * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.handle;
            ctx.strokeStyle = this.colors.primary;
            ctx.lineWidth = this.borderWidth;
            ctx.fill();
            ctx.stroke();
        });
    }
    
    // 修改旋转指示器
    drawRotationIndicator(ctx) {
        const centerY = -this.image.height/2 - this.handleSize;
        
        // 绘制旋转线
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(0, centerY - this.rotateHandleDistance);
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = this.borderWidth;
        ctx.setLineDash([this.borderWidth * 2, this.borderWidth * 2]);
        ctx.stroke();
        
        // 绘制旋转控制点
        ctx.setLineDash([]); // 清除虚线
        const rotateHandleSize = this.handleSize * 0.8;
        
        // 绘制旋转控制点的阴影
        ctx.beginPath();
        ctx.arc(0, centerY - this.rotateHandleDistance, rotateHandleSize * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.shadow;
        ctx.fill();
        
        // 绘制旋转控制点的主体
        ctx.beginPath();
        ctx.arc(0, centerY - this.rotateHandleDistance, rotateHandleSize, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.handle;
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = this.borderWidth;
        ctx.fill();
        ctx.stroke();
        
        // 绘制旋转图标
        ctx.beginPath();
        const iconSize = rotateHandleSize * 0.6;
        ctx.arc(0, centerY - this.rotateHandleDistance, iconSize, 0, 1.5 * Math.PI);
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = this.borderWidth * 1.5;
        ctx.stroke();
        
        // 绘制箭头
        const arrowSize = iconSize * 0.3;
        ctx.beginPath();
        ctx.moveTo(-arrowSize, centerY - this.rotateHandleDistance - iconSize);
        ctx.lineTo(0, centerY - this.rotateHandleDistance - iconSize - arrowSize);
        ctx.lineTo(arrowSize, centerY - this.rotateHandleDistance - iconSize);
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = this.borderWidth * 1.5;
        ctx.stroke();
    }
    
    // 初始化缩放比例
    initializeScale() {
        const canvasRatio = this.canvas.width / this.canvas.height;
        const imageRatio = this.originalWidth / this.originalHeight;
        
        if (imageRatio > canvasRatio) {
            // 图片更宽,按宽度缩放
            this.scaleX = this.scaleY = (this.canvas.width * 0.8) / this.originalWidth;
        } else {
            // 图片更高,按高度缩放
            this.scaleX = this.scaleY = (this.canvas.height * 0.8) / this.originalHeight;
        }
    }
    
    // 获取控制点位置
    getHandlePositions() {
        const w = this.image.width;
        const h = this.image.height;
        const padding = this.handleSize;
        
        return [
            // 四角
            {x: -w/2 - padding, y: -h/2 - padding, type: 'corner'},
            {x: w/2 + padding, y: -h/2 - padding, type: 'corner'},
            {x: w/2 + padding, y: h/2 + padding, type: 'corner'},
            {x: -w/2 - padding, y: h/2 + padding, type: 'corner'},
            
            // 边中点
            {x: 0, y: -h/2 - padding, type: 'edge'},
            {x: w/2 + padding, y: 0, type: 'edge'},
            {x: 0, y: h/2 + padding, type: 'edge'},
            {x: -w/2 - padding, y: 0, type: 'edge'},
            
            // 旋转点 - 调整位置
            {x: 0, y: -h/2 - padding - this.rotateHandleDistance, type: 'rotate'}
        ];
    }
    
    // 检测点击的控制点
    hitTest(x, y) {
        // 获取画布中心点
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 将点击坐标转换为相对于画布中心的坐标
        const relativeX = x - centerX - this.position.x;
        const relativeY = y - centerY - this.position.y;

        // 应用逆变换
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        
        // 旋转
        const rotatedX = relativeX * cos - relativeY * sin;
        const rotatedY = relativeX * sin + relativeY * cos;
        
        // 缩放
        const scaledX = rotatedX / this.scaleX;
        const scaledY = rotatedY / this.scaleY;

        // 检查每个控制点
        const handles = this.getHandlePositions();
        for(let handle of handles) {
            const dist = Math.sqrt(
                Math.pow(scaledX - handle.x, 2) + 
                Math.pow(scaledY - handle.y, 2)
            );
            
            if(dist <= this.hitTestArea) {
                // 设置鼠标样式
                switch(handle.type) {
                    case 'corner':
                        this.canvas.style.cursor = 'nw-resize';
                        break;
                    case 'rotate':
                        this.canvas.style.cursor = 'crosshair';
                        break;
                    default:
                        this.canvas.style.cursor = 'move';
                }
                return handle;
            }
            
            // 检查是否在变换框内部
            const padding = this.handleSize;
            const isInside = Math.abs(scaledX) <= (this.image.width/2 + padding) &&
                            Math.abs(scaledY) <= (this.image.height/2 + padding);
            
            if(isInside) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }
        
        return null;
    }
    
    // 完全重写transform方法中的旋转处理
    transform(handle, dx, dy, shiftKey = false) {
        if (!handle) return;
        
        switch(handle.type) {
            case 'rotate':
                // 获取变换中心点
                const centerX = this.canvas.width/2 + this.position.x;
                const centerY = this.canvas.height/2 + this.position.y;
                
                // 获取鼠标相对于中心点的位置
                const mouseX = dx;
                const mouseY = dy;
                
                if (!this._rotateStart) {
                    this._rotateStart = {
                        angle: this.rotation,
                        startAngle: Math.atan2(mouseY - centerY, mouseX - centerX),
                        lastAngle: Math.atan2(mouseY - centerY, mouseX - centerX)
                    };
                    return;
                }
                
                // 计算当前角度
                const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
                
                // 计算角度差，并应用平滑因子
                let deltaAngle = currentAngle - this._rotateStart.lastAngle;
                
                // 处理角度跳变
                if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
                
                // 应用平滑旋转
                this.rotation += deltaAngle;
                
                // 更新最后的角度
                this._rotateStart.lastAngle = currentAngle;
                
                // 如果按住Shift键，则限制为15度的倍数
                if (shiftKey) {
                    const snapAngle = Math.PI / 12; // 15度
                    this.rotation = Math.round(this.rotation / snapAngle) * snapAngle;
                }
                break;
                
            case 'corner':
                const scaleFactor = 0.005;
                const cornerX = handle.x;
                const cornerY = handle.y;
                const scaleDirectionX = Math.sign(cornerX);
                const scaleDirectionY = Math.sign(cornerY);
                
                let scaleX = 1 + (dx * scaleFactor * scaleDirectionX);
                let scaleY = 1 + (dy * scaleFactor * scaleDirectionY);
                
                if (shiftKey) {
                    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
                    scaleX = scaleY = scale;
                }
                
                // 移除最大缩放限制，只保留最小值防止缩放为0
                this.scaleX = Math.max(0.0001, this.scaleX * scaleX);
                this.scaleY = Math.max(0.0001, this.scaleY * scaleY);
                break;
                
            default:
                this.position.x += dx;
                this.position.y += dy;
        }
    }
    
    // 添加鼠标释放时的清理
    clearRotation() {
        this._rotateStart = null;
        this._lastAngle = null;
    }
}

// 修改类名以避免冲突
class LayerPanelPro {
    constructor(container, layers) {
        this.container = container;
        this.layers = layers;
        this.activeLayerIndex = 0;
        this.render();
    }

    render() {
        const layerComponent = $el("div.layer-component", {
            style: {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                background: "#1a1a1a",
                borderRadius: "8px",
                border: "1px solid #333",
                overflow: "hidden"
            }
        }, [
            // 图层列表
            $el("div.layer-list", {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    // padding: "8px",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden"
                }
            }, this.layers.slice().reverse().map((layer, idx) => {
                const realIndex = this.layers.length - 1 - idx;
                return this.createLayerItem(layer, realIndex);
            }))
        ]);

        this.container.innerHTML = '';
        this.container.appendChild(layerComponent);
    }

    createLayerItem(layer, index) {
        return $el("div.layer-item", {
            style: {
                display: "flex",
                alignItems: "center",
                padding: "6px",
                background: index === this.activeLayerIndex ? "#444" : "#2a2a2a",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
                minHeight: "42px"
            },
            onclick: () => this.setActiveLayer(index)
        }, [
            // 缩略图
            $el("img", {
                src: layer.url,
                style: {
                    width: "30px",
                    height: "30px",
                    objectFit: "cover",
                    marginRight: "8px",
                    borderRadius: "3px",
                    border: "1px solid #444",
                    flexShrink: 0
                }
            }),
            // 图层名称
            $el("span", {
                style: {
                    color: "#fff",
                    fontSize: "13px",
                    flex: "1 1 auto",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                }
            }, [layer.name]),
            // 添加下拉列表
            $el("select", {
                onchange: (e) => {
                    const newIndex = parseInt(e.target.value);
                    this.updateLayerIndex(index, newIndex);
                },
                style: {
                    marginLeft: "8px",
                    background: "#444",
                    color: "#fff",
                    border: "1px solid #555",
                    borderRadius: "4px"
                }
            }, [
                ...Array.from({ length: this.layers.length }, (_, i) => 
                    $el("option", {
                        value: i + 1,
                        selected: i + 1 === index + 1
                    }, [i + 1])
                )
            ])
        ]);
    }

    setActiveLayer(index) {
        if (this.activeLayerIndex === index) return;
        
        this.activeLayerIndex = index;
        dialogPro.switchActiveLayer(index);
        
        // 更新UI
        const items = this.container.querySelectorAll(".layer-item");
        items.forEach(item => item.style.background = "#2a2a2a");
        items[this.layers.length - 1 - index].style.background = "#444";
    }

    updateLayerIndex(oldIndex, newIndex) {
        if (newIndex < 1 || newIndex > this.layers.length) return;
        newIndex = newIndex - 1; // 转换为0基数的索引

        // 同时更新layers和layerImages数组
        const layer = this.layers.splice(oldIndex, 1)[0];
        const layerImage = dialogPro.layerImages.splice(oldIndex, 1)[0];
        
        this.layers.splice(newIndex, 0, layer);
        dialogPro.layerImages.splice(newIndex, 0, layerImage);

        // 如果移动的是当前活动图层，更新activeLayerIndex
        if (this.activeLayerIndex === oldIndex) {
            this.activeLayerIndex = newIndex;
        } else if (oldIndex < this.activeLayerIndex && newIndex >= this.activeLayerIndex) {
            this.activeLayerIndex--;
        } else if (oldIndex > this.activeLayerIndex && newIndex <= this.activeLayerIndex) {
            this.activeLayerIndex++;
        }

        // 重新渲染图层面板
        this.render();
        
        // 强制更新活动图层的 TransformBox
        dialogPro.switchActiveLayer(this.activeLayerIndex);
    }
}

// 修改对象名以避免冲突
const dialogPro = {
    // 保持原有属性
    element: null,
    canvas: null,
    ctx: null,
    backImage: null,
    foreImage: null,
    isDragging: false,
    lastPoint: null,
    transformBox: null,

    // 添加图层相关属性
    layerPanel: null,
    layers: [],
    layerImages: [],
    activeLayerIndex: 0,

    // 保持原有 show 方法签名
    show(node, backImagePath, foreImagePath, canvasWidth, canvasHeight, maskValue = 1.0) {
        // 存储窗口ID
        
        if (this.element) {
            this.element.remove();
        }

        // 添加背景模糊层
        this.overlay = $el("div.canvas-overlay", {
            parent: document.body,
            style: {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.7)", // 半透明黑色背景
                backdropFilter: "blur(5px)", // 背景模糊效果
                zIndex: 9999
            }
        });

        // 修改布局计算
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 30; // 增加边距
        const toolbarWidth = 220;
        
        // 使用更大的显示区域，但保留边距
        const maxCanvasWidth = Math.min(
            viewportWidth * 0.95 - toolbarWidth - margin * 4, // 增加左右边距
            viewportWidth - toolbarWidth - margin * 4
        );
        const maxCanvasHeight = Math.min(
            viewportHeight * 0.95 - margin * 2,
            viewportHeight - margin * 2
        );
        
        // 计算画布尺寸（保持比例）
        const aspectRatio = canvasWidth / canvasHeight;
        let canvasDisplayWidth, canvasDisplayHeight;
        
        if (aspectRatio > maxCanvasWidth / maxCanvasHeight) {
            canvasDisplayWidth = maxCanvasWidth;
            canvasDisplayHeight = maxCanvasWidth / aspectRatio;
        } else {
            canvasDisplayHeight = maxCanvasHeight;
            canvasDisplayWidth = maxCanvasHeight * aspectRatio;
        }

        // 修改弹窗尺寸计算
        this.element = $el("div.web-canvas-dialog", {
            parent: document.body,
            style: {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: `${viewportWidth - margin * 4}px`, // 增加左右边距
                height: `${viewportHeight - margin * 2}px`,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "#1a1a1a",
                borderRadius: "12px",
                zIndex: 10000,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)"
            }
        }, [
            // 顶部信息栏
            $el("div.properties-panel", {
                style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    padding: "15px 20px",
                    background: "#222",
                    borderBottom: "1px solid #333"
                }
            }, [
                // 尺寸信息
                $el("div.size-info", {
                    style: {
                        display: "flex",
                        gap: "20px",
                        color: "#aaa",
                        fontSize: "13px"
                    }
                }, [
                    $el("span", {}, ["尺寸: ", $el("span.value", { style: { color: "#fff" } })]),
                    $el("span", {}, ["缩放: ", $el("span.scale-value", { style: { color: "#fff" } })]),
                    $el("span", {}, ["旋转: ", $el("span.rotation-value", { style: { color: "#fff" } })]),
                    $el("span", {}, ["透明度: ", $el("span.opacity-value", { style: { color: "#fff" } })])
                ])
            ]),
            
            // LeonTools标题 - 放在右上角
            $el("div.toolbar-title", {
                style: {
                    position: "absolute",
                    top: "15px",
                    right: "20px",
                    color: "#fff",
                    fontSize: "20px",
                    fontWeight: "800",
                    letterSpacing: "1.5px",
                    fontFamily: "'Segoe UI', Arial, sans-serif",
                    textTransform: "uppercase",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    zIndex: "1001"
                }
            }, ["LeonTools"]),
            
            // 主要内容区域
            $el("div.main-content", {
                style: {
                    display: "flex",
                    flex: 1,
                    gap: "20px", // 增加间距
                    padding: "0 20px 20px 20px" // 增加内边距
                }
            }, [
                // 画布容器
                $el("div.canvas-container", {
                    style: {
                        flex: 1,
                        position: "relative",
                        background: "repeating-conic-gradient(#404040 0% 25%, #303030 0% 50%) 50% / 20px 20px",
                        borderRadius: "8px",
                        overflow: "hidden"
                    }
                }, [
                    $el("canvas", {
                        id: "editor-canvas",
                        width: canvasWidth,
                        height: canvasHeight,
                        style: {
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            maxWidth: "100%",
                            maxHeight: "100%"
                        }
                    }),
                    // 添加快捷键提示
                    this.createShortcutHints()
                ]),
                
                // 右侧工具栏
                $el("div.toolbar", {
                    style: {
                        width: `${toolbarWidth}px`,
                        minWidth: `${toolbarWidth}px`,
                        display: "flex",
                        flexDirection: "column",
                        background: "#222",
                        padding: "20px",
                        borderRadius: "8px",
                        height: "100%",
                        maxHeight: `${viewportHeight - margin * 4}px`,
                        overflow: "hidden"
                    }
                }, [
                    // 1. 顶部控制区
                    $el("div.controls-section", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            flexShrink: 0, // 防止压缩
                            marginBottom: "10px", // 增加底部间距
                            position: "relative", // 确保z-index生效
                            zIndex: 2 // 确保控制区在上层
                        }
                    }, [
                        // 透明度控制
                        this.createOpacityControl(maskValue),
                        
                        $el("div.rotation-buttons", {
                            style: {
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "8px",
                                width: "100%"
                            }
                        }, [
                            this.createToolButton("左旋转", () => this.rotate(-90)),
                            this.createToolButton("右旋转", () => this.rotate(90))
                        ]),
                        
                        this.createScaleInput(),
                        this.createToolButton("重置", () => this.resetTransform())
                    ]),
                    
                    // 2. 中间图层区域
                    $el("div.layers-section", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            minHeight: "100px",
                            position: "relative", // 确保z-index生效
                            zIndex: 1, // 图层区域在控制区下方
                            overflow: "hidden"
                        }
                    }, [
                        $el("div.layer-container", {
                            style: {
                                height: "100%",
                                overflow: "auto",
                                padding: "4px" // 添加内边距
                            }
                        })
                    ]),
                    
                    // 3. 底部按钮区
                    $el("div.bottom-buttons", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            flexShrink: 0,
                            marginTop: "10px", // 增加顶部间距
                            paddingTop: "15px",
                            borderTop: "1px solid #333",
                            position: "relative", // 确保z-index生效
                            zIndex: 2 // 确保按钮区在上层
                        }
                    }, [
                        this.createButton("确认", () => this.save(), "#4CAF50"),
                        this.createButton("取消", () => this.cancel())
                    ])
                ])
            ])
        ]);

        // 初始化画布
        this.canvas = document.getElementById("editor-canvas");
        this.ctx = this.canvas.getContext("2d");
        
        // 加载图片
        this.loadImages(backImagePath, foreImagePath, maskValue);
        
        // 设置事件
        this.setupEvents();
    },
    
    // 修改加载图片方法
    loadImages(backPath, forePath, maskValue = 1.0) {
        this.backImage = new Image();
        this.backImage.crossOrigin = "anonymous";
        this.backImage.onload = () => {
            // 加载所有图层图片
            Promise.all(this.layers.map(layer => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.src = layer.url;
                });
            })).then(images => {
                this.layerImages = images;
                this.activeLayerIndex = 0;
                this.foreImage = images[0];
                
                // 初始化图层状态
                this.layers.forEach((layer, index) => {
                    layer.transform = {
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                        opacity: 1.0
                    };
                });
                
                // 创建变换框
                this.transformBox = new TransformBoxPro(
                    this.foreImage, 
                    this.canvas,
                    1.0
                );
                
                // 创建图层面板
                this.layerPanel = new LayerPanelPro(
                    this.element.querySelector('.layer-container'),
                    this.layers
                );
                
                // 更新透明度控制器
                const opacitySlider = this.element.querySelector('.opacity-control input[type="range"]');
                const opacityValue = this.element.querySelector('.opacity-value');
                if (opacitySlider && opacityValue) {
                    // 设置初始值为100%
                    const percentage = 100;
                    opacitySlider.value = percentage;
                    opacityValue.textContent = percentage + '%';
                    opacitySlider.style.background = `linear-gradient(to right, #4CAF50 ${percentage}%, #333 ${percentage}%)`;
                }
                
                this.render();
            });
        };
        this.backImage.src = backPath;
    },

    // 修改 switchActiveLayer 方法
    switchActiveLayer(index) {
        if (this.activeLayerIndex === index) return;
        
        // 保存当前图层状态
        if (this.transformBox) {
            const currentLayer = this.layers[this.activeLayerIndex];
            currentLayer.transform = {
                position: { ...this.transformBox.position },
                rotation: this.transformBox.rotation,
                scaleX: this.transformBox.scaleX,
                scaleY: this.transformBox.scaleY,
                opacity: this.transformBox.opacity
            };
        }

        // 更新活动图层索引
        this.activeLayerIndex = index;
        const layer = this.layers[index];
        const img = this.layerImages[index];
        
        if (img) {
            this.foreImage = img;
            
            // 使用图层已保存的变换状态创建新的变换框
            const transform = layer.transform || {
                position: { x: 0, y: 0 },
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                opacity: 1.0
            };
            
            this.transformBox = new TransformBoxPro(img, this.canvas, transform.opacity);
            this.transformBox.position = { ...transform.position };
            this.transformBox.rotation = transform.rotation;
            this.transformBox.scaleX = transform.scaleX;
            this.transformBox.scaleY = transform.scaleY;
            
            // 更新透明度控制器
            const opacitySlider = this.element.querySelector('.opacity-control input[type="range"]');
            const opacityValue = this.element.querySelector('.opacity-control .opacity-value');
            if (opacitySlider && opacityValue) {
                const percentage = Math.round(transform.opacity * 100);
                opacitySlider.value = percentage;
                opacityValue.textContent = percentage + '%';
                opacitySlider.style.background = `linear-gradient(to right, #4CAF50 ${percentage}%, #333 ${percentage}%)`;
            }
            
            this.render();
        }
    },
    
    // 创建工具按钮
    createToolButton(text, onClick) {
        return $el("button", {
            onclick: onClick,
            style: {
                padding: "8px 12px",
                width: "100%", // 让按钮填满容器
                background: "#333",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                transition: "background 0.2s",
                textAlign: "center",
                ":hover": {
                    background: "#444"
                }
            }
        }, [text]);
    },
    
    // 创建缩放输入框
    createScaleInput() {
        return $el("div.scale-control", {
            style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#333",
                padding: "8px 12px",
                borderRadius: "4px",
                width: "100%"
            }
        }, [
            $el("span", {
                style: {
                    color: "#fff",
                    fontSize: "13px",
                    whiteSpace: "nowrap"
                }
            }, ["缩放:"]),
            $el("input", {
                type: "number",
                min: "0.01", // 最小值改为0.01
                // 移除max属性，允许任意大的数值
                value: "100",
                style: {
                    width: "60px", // 增加输入框宽度以适应更大的数字
                    padding: "4px",
                    background: "#444",
                    border: "1px solid #555",
                    borderRadius: "3px",
                    color: "#fff",
                    fontSize: "13px"
                },
                oninput: (e) => this.setScale(e.target.value / 100)
            })
        ]);
    },
    
    // 创建按钮
    createButton(text, onClick, bgColor = "#333") {
        return $el("button", {
            onclick: onClick,
            style: {
                padding: "8px 25px",
                background: bgColor,
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background 0.2s"
            }
        }, [text]);
    },

    // 渲染画布
    render() {
        if (!this.ctx || !this.backImage || !this.foreImage) return;

        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.ctx.drawImage(this.backImage, 0, 0, this.canvas.width, this.canvas.height);

        // 遍历所有图层
        this.layers.forEach((layer, index) => {
            const img = this.layerImages[index];
            if (!img) return;

            this.ctx.save();
            
            const transform = index === this.activeLayerIndex ? 
                this.transformBox : layer.transform;

            // 应用变换 - 确保与输出时完全一致的变换顺序
            this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
            this.ctx.translate(transform.position.x, transform.position.y);
            this.ctx.rotate(transform.rotation);
            this.ctx.scale(transform.scaleX, transform.scaleY);
            this.ctx.translate(-img.width/2, -img.height/2);
            
            // 应用透明度
            this.ctx.globalAlpha = transform.opacity;

            // 绘制图层
            this.ctx.drawImage(img, 0, 0);
            
            this.ctx.restore();
        });

        // 只为活动图层绘制变换框
        if (this.transformBox) {
            this.transformBox.draw(this.ctx);
        }

        // 更新信息显示
        this.updateInfo();
    },
    
    // 设置事件处理
    setupEvents() {
        let activeHandle = null;
        let startX, startY;
        let isShiftPressed = false;
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Shift') {
                isShiftPressed = true;
            } else if(e.key === 'Escape') {
                this.cancel();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if(e.key === 'Shift') {
                isShiftPressed = false;
            }
        });

        // 鼠标按下事件
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            activeHandle = this.transformBox.hitTest(x, y);
            
            if(activeHandle) {
                startX = x;
                startY = y;
                // 根据控制点类型设置不同的光标
                switch(activeHandle.type) {
                    case 'rotate':
                        this.canvas.style.cursor = 'crosshair';
                        break;
                    case 'corner':
                        this.canvas.style.cursor = 'nw-resize';
                        break;
                    default:
                        this.canvas.style.cursor = 'move';
                }
            } else {
                this.isDragging = true;
                this.lastPoint = { x, y };
                this.canvas.style.cursor = 'grabbing';
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if(!activeHandle && !this.isDragging) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            if(activeHandle) {
                const dx = x - startX;
                const dy = y - startY;
                
                this.transformBox.transform(activeHandle, dx, dy, isShiftPressed);
                this.render();
                
                // 只有在非旋转操作时更新起始点
                if(activeHandle.type !== 'rotate') {
                    startX = x;
                    startY = y;
                }
            } else if(this.isDragging) {
                const dx = x - this.lastPoint.x;
                const dy = y - this.lastPoint.y;
                
                this.transformBox.position.x += dx;
                this.transformBox.position.y += dy;
                
                this.lastPoint = { x, y };
                this.render();
            }
        });

        // 鼠标释放事件
        document.addEventListener('mouseup', () => {
            if(this.transformBox) {
                this.transformBox.clearRotation();
            }
            activeHandle = null;
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        // 修改滚轮事件处理
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.altKey) {
                // Alt+滚轮旋转
                const rotationDelta = e.deltaY > 0 ? -5 : 5;
                this.rotate(rotationDelta);
            } else {
                // 普通滚轮缩放
                const scaleDelta = e.deltaY > 0 ? 0.95 : 1.05;
                const newScale = this.transformBox.scaleX * scaleDelta;
                this.setScale(newScale);
            }
        }, { passive: false });

        // 添加鼠标悬停效果
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.transformBox) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            const handle = this.transformBox.hitTest(x, y);
            
            // 根据不同的控制点类型设置不同的光标
            if (handle) {
                switch (handle.type) {
                    case 'corner':
                        this.canvas.style.cursor = 'nw-resize';
                        break;
                    case 'edge':
                        this.canvas.style.cursor = handle.x === 0 ? 'ns-resize' : 'ew-resize';
                        break;
                    case 'rotate':
                        this.canvas.style.cursor = 'crosshair';
                        break;
                }
            } else {
                this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
            }
        });
    },
    
    // 更新信息显示
    updateInfo() {
        const transform = this.transformBox;
        if (!transform) return;

        const scalePercent = Math.round(transform.scaleX * 100);
        const rotation = Math.round((transform.rotation * 180 / Math.PI) % 360);
        // 将透明度值转换为百分比
        const opacity = Math.round(transform.opacity * 100);
        
        const sizeInfo = this.element.querySelector('.size-info');
        if (sizeInfo) {
            sizeInfo.children[0].querySelector('.value').textContent = 
                `${this.canvas.width} × ${this.canvas.height}`;
            sizeInfo.children[1].querySelector('.scale-value').textContent = 
                `${scalePercent}%`;
            sizeInfo.children[2].querySelector('.rotation-value').textContent = 
                `${rotation}°`;
            sizeInfo.children[3].querySelector('.opacity-value').textContent = 
                `${opacity}%`;
        }
    },
    
    // 旋转图片
    rotate(angle) {
        this.transformBox.rotation += angle * Math.PI / 180;
        this.render();
    },
    
    // 重置变换
    resetTransform() {
        this.transformBox.position = { x: 0, y: 0 };
        this.transformBox.rotation = 0;
        this.transformBox.scaleX = 1;
        this.transformBox.scaleY = 1;
        this.transformBox.initializeScale();
        this.render();
    },
    
    // 设置缩放
    setScale(scale) {
        this.transformBox.scaleX = this.transformBox.scaleY = 
            Math.max(0.0001, scale); // 只保留最小值限制
        this.render();
    },
    
    // 修改 generateMask 方法，使用原始mask进行变换
    generateMask() {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.canvas.width;
        maskCanvas.height = this.canvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        // 清除画布
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        // 遍历所有图层
        this.layers.forEach((layer, index) => {
            const img = this.layerImages[index];
            if (!img) return;

            maskCtx.save();

            const transform = index === this.activeLayerIndex ? 
                this.transformBox : layer.transform;

            // 应用与显示时完全相同的变换
            maskCtx.translate(maskCanvas.width/2, maskCanvas.height/2);
            maskCtx.translate(transform.position.x, transform.position.y);
            maskCtx.rotate(transform.rotation);
            maskCtx.scale(transform.scaleX, transform.scaleY);
            maskCtx.translate(-img.width/2, -img.height/2);

            // 使用图层的透明度值
            maskCtx.globalAlpha = transform.opacity;

            // 绘制mask
            maskCtx.drawImage(img, 0, 0);

            maskCtx.restore();
        });

        // 转换为灰度mask
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        
        // 创建新的ImageData
        const newImageData = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);
        const newData = newImageData.data;
        
        // 将alpha通道转换为灰度值，保持原始透明度值
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255.0; // 转换为0-1范围
            const value = Math.round(alpha * 255);
            newData[i] = value;     // R
            newData[i + 1] = value; // G
            newData[i + 2] = value; // B
            newData[i + 3] = 255;   // A
        }
        
        maskCtx.putImageData(newImageData, 0, 0);
        return maskCanvas;
    },

    // 修改 save 方法
    async save() {
        try {
            const finalCanvas = document.createElement('canvas');
            const maskCanvas = document.createElement('canvas');
            
            finalCanvas.width = this.canvas.width;
            finalCanvas.height = this.canvas.height;
            maskCanvas.width = this.canvas.width;
            maskCanvas.height = this.canvas.height;
            
            const ctx = finalCanvas.getContext('2d');
            const maskCtx = maskCanvas.getContext('2d');

            // 绘制背景
            ctx.drawImage(this.backImage, 0, 0, finalCanvas.width, finalCanvas.height);

            // 创建每个图层的独立mask画布数组，使用10个固定位置
            const layerMasks = new Array(10).fill(null);
            
            // 遍历所有图层
            this.layers.forEach((layer, index) => {
                const img = this.layerImages[index];
                if (!img) return;

                // 获取原始图层索引（从1开始）
                const originalIndex = parseInt(layer.name.split(' ')[1]) - 1;
                
                // 为当前图层创建mask画布
                const layerMaskCanvas = document.createElement('canvas');
                layerMaskCanvas.width = this.canvas.width;
                layerMaskCanvas.height = this.canvas.height;
                const layerMaskCtx = layerMaskCanvas.getContext('2d');

                // 保存状态
                ctx.save();
                maskCtx.save();
                layerMaskCtx.save();

                const transform = index === this.activeLayerIndex ? 
                    this.transformBox : layer.transform;

                // 应用变换到所有上下文
                [ctx, maskCtx, layerMaskCtx].forEach(context => {
                    context.translate(finalCanvas.width/2, finalCanvas.height/2);
                    context.translate(transform.position.x, transform.position.y);
                    context.rotate(transform.rotation);
                    context.scale(transform.scaleX, transform.scaleY);
                    context.translate(-img.width/2, -img.height/2);
                    context.globalAlpha = transform.opacity;
                });

                // 绘制图像和masks
                ctx.drawImage(img, 0, 0);
                maskCtx.drawImage(img, 0, 0);
                layerMaskCtx.drawImage(img, 0, 0);

                // 恢复状态
                ctx.restore();
                maskCtx.restore();
                layerMaskCtx.restore();

                // 处理图层mask的alpha通道
                const layerMaskData = layerMaskCtx.getImageData(0, 0, layerMaskCanvas.width, layerMaskCanvas.height);
                const processedLayerMaskData = this.processAlphaToGrayscale(layerMaskData);
                layerMaskCtx.putImageData(processedLayerMaskData, 0, 0);
                
                // 将mask放入对应的原始位置
                layerMasks[originalIndex] = layerMaskCanvas.toDataURL('image/png');
            });

            // 填充未使用的位置为黑色mask
            for (let i = 0; i < 10; i++) {
                if (!layerMasks[i]) {
                    const emptyCanvas = document.createElement('canvas');
                    emptyCanvas.width = 64;
                    emptyCanvas.height = 64;
                    const emptyCtx = emptyCanvas.getContext('2d');
                    emptyCtx.fillStyle = 'black';
                    emptyCtx.fillRect(0, 0, 64, 64);
                    layerMasks[i] = emptyCanvas.toDataURL('image/png');
                }
            }

            // 处理总mask的alpha通道
            const totalMaskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const processedTotalMaskData = this.processAlphaToGrayscale(totalMaskData);
            maskCtx.putImageData(processedTotalMaskData, 0, 0);

            // 发送数据到后端
            const response = await api.fetchApi('/canvas_pro/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: finalCanvas.toDataURL('image/png'),
                    mask: maskCanvas.toDataURL('image/png'),
                    layer_masks: layerMasks,
                    confirmed: true,
                })
            });

            if (!response.ok) {
                throw new Error(`Save failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            this.hide();
        }
    },

    // 处理alpha通道转换为灰度值的辅助方法
    processAlphaToGrayscale(imageData) {
        const data = imageData.data;
        const newImageData = new ImageData(imageData.width, imageData.height);
        const newData = newImageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255.0;
            const value = Math.round(alpha * 255);
            newData[i] = value;     // R
            newData[i + 1] = value; // G
            newData[i + 2] = value; // B
            newData[i + 3] = 255;   // A
        }
        
        return newImageData;
    },
    
    // 修改 cancel 方法
    async cancel() {
        try {
            const response = await api.fetchApi('/canvas_pro/save', {
                method: 'POST',
                body: JSON.stringify({
                    confirmed: false,
                })
            });
            
            if (!response.ok) {
                throw new Error(`Cancel failed: ${response.status}`);
            }
        } catch (error) {
            // console.error('Failed to cancel:', error);
        } finally {
            this.hide();
        }
    },
    
    // 隐藏对话框
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    },
    
    // 创建透明度控制
    createOpacityControl(maskValue = 1.0) {
        return $el("div.opacity-control", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: "8px"
            }
        }, [
            $el("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }
            }, [
                $el("span", { style: { color: "#fff" } }, ["透明度"]),
                $el("span.opacity-value", { style: { color: "#fff" } }, 
                    ['100%']) // 默认显示100%
            ]),
            $el("input", {
                type: "range",
                min: "0",
                max: "100",
                value: 100, // 默认值设为100
                style: {
                    width: "100%",
                    height: "4px",
                    background: 'linear-gradient(to right, #4CAF50 100%, #333 100%)'
                },
                oninput: (e) => {
                    const value = parseInt(e.target.value);
                    const opacity = value / 100;
                    
                    // 更新变换框的透明度
                    if (this.transformBox) {
                        this.transformBox.opacity = opacity;
                    }
                    
                    // 更新当前图层的透明度
                    if (this.layers[this.activeLayerIndex]) {
                        this.layers[this.activeLayerIndex].opacity = opacity;
                    }
                    
                    // 更新工具栏中的透明度值显示
                    const opacityValue = this.element.querySelector('.opacity-control .opacity-value');
                    if (opacityValue) {
                        opacityValue.textContent = value + '%';
                    }
                    
                    // 更新滑块背景
                    e.target.style.background = `linear-gradient(to right, #4CAF50 ${value}%, #333 ${value}%)`;
                    
                    // 触发重新渲染，这将同时更新顶部信息栏
                    this.render();
                }
            })
        ]);
    },
    
    // 添加快捷键提示组件
    createShortcutHints() {
        return $el("div.shortcut-hints", {
            style: {
                position: "absolute",
                left: "20px",
                bottom: "20px",
                background: "rgba(0, 0, 0, 0.7)",
                padding: "15px",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                zIndex: 1000,
                pointerEvents: "none", // 不影响鼠标操作
                userSelect: "none" // 防止文本选择
            }
        }, [
            $el("div", {
                style: {
                    marginBottom: "8px",
                    color: "#aaa",
                    fontSize: "12px"
                }
            }, ["快捷键操作提示:"]),
            $el("div", {
                style: {
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "8px 12px",
                    lineHeight: "1.6"
                }
            }, [
                // 添加快捷键提示
                $el("span", { style: { color: "#aaa" } }, ["Alt + 滚轮"]),
                $el("span", {}, ["旋转"]),
                $el("span", { style: { color: "#aaa" } }, ["滚轮"]),
                $el("span", {}, ["缩放"]),
                $el("span", { style: { color: "#aaa" } }, ["拖拽"]),
                $el("span", {}, ["移动位置"]),
                $el("span", { style: { color: "#aaa" } }, ["Shift + 拖拽"]),
                $el("span", {}, ["等比例缩放"]),
                $el("span", { style: { color: "#aaa" } }, ["Esc"]),
                $el("span", {}, ["取消编辑"])
            ])
        ]);
    }
};

// 注册扩展
app.registerExtension({
    name: "comfy.canvas.dialog.pro",
    async setup() {
        api.addEventListener("show_canvas_pro", async ({detail}) => {
            // console.log('Event detail:', detail);
            // 从画布获取正在运行的节点
            try {
                const prompt = await app.graphToPrompt();
                const res = prompt.workflow.nodes;

                // 遍历所有节点，找到 WebCanvasNodePro 节点
                let hasWebCanvasNode = false;
                let seednumber = [];
                // 找到所有WebCanvasNodePro节点，并获取seednumber列表
                for (const node of res) {
                    if (node.type === "WebCanvasNodePro") {
                        console.log("Found WebCanvasNodePro node");
                        hasWebCanvasNode = true;
                        if (node.widgets_values[1]) {
                            seednumber.push(node.widgets_values[1])
                        }
                    }
                }
                console.log("detail_window_seed:", detail.window_id);
                if (hasWebCanvasNode && seednumber.length > 0) {
                    // 检查窗口ID是否在seednumber数组中
                    let is_catch_window_id = seednumber.includes(detail.window_id);
                    // console.log("seednumber:", seednumber);
                    // console.log("is_catch_window_id:", is_catch_window_id);
                    
                    if (!is_catch_window_id) {
                        console.log('Window ID not found in seednumber array, skipping dialog');
                        return;
                    }
                    
                    // 保存图层数据
                    if (detail.layers) {
                        dialogPro.layers = detail.layers;
                        dialogPro.layerImages = detail.layers.map(layer => {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            img.src = layer.url;
                            return img;
                        });
                    }
                    
                    // 显示弹窗
                    dialogPro.show(
                        detail,
                        detail.back_image,
                        detail.fore_image,
                        detail.canvas_width,
                        detail.canvas_height,
                    );
                } else {
                    console.log('No WebCanvasNodePro node found, skipping dialog');
                }
            } catch (error) {
                console.error('Error getting graph output:', error);
            }
        });
    },
    async beforeRegisterNodeDef(nodeType, nodeData, app) {  
        if (nodeData.name === "WebCanvasNodePro") {
            // console.log("WebCanvasNodePro node found");
            nodeType.prototype.onNodeCreated = function() {
                // 创建随机数生成器回调函数
                const randomize = function() {
                    const randomNumber = Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
                    return randomNumber;
                };
                
                // 添加数字类型的widget，包含完整的回调函数
                let seed = this.addWidget("number", "windows_seed", randomize(), { 
                    min: 1000000000000000,
                    max: 9999999999999999,
                    precision: 0,
                    callback: (value) => {
                        // 更改seed的值
                        this.properties = this.properties || {};
                        this.properties.windows_seed = value;
                    }
                });
                
                // 更改seed的值
                seed.value = randomize();
                
                // 初始化属性
                this.properties = this.properties || {};
                this.properties.windows_seed = seed.value;
                // seed.hidden = true;
            };
        }
    }
}); 