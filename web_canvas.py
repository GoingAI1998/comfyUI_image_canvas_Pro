import os
import torch
import numpy as np
from PIL import Image, ImageOps
from server import PromptServer
import folder_paths
import threading
import sys
from aiohttp import web
import json
import base64
from io import BytesIO

# 全局变量用于存储当前活动的画布实例
active_canvas_pro = None
@PromptServer.instance.routes.post("/canvas_pro/save")
async def save_canvas_pro(request):
    """Save canvas data endpoint"""
    global active_canvas_pro
    try:
        if active_canvas_pro is None:
            return web.Response(status=400, text="No active canvas instance")
            
        data = await request.json()
        
        if not isinstance(data, dict):
            print(f"Error: Invalid data format received: {type(data)}")
            return web.Response(status=400, text="Invalid data format")
      
        # 保存编辑数据到当前实例
        active_canvas_pro.edited_data = data
        
        # 设置当前实例的事件
        active_canvas_pro.save_event.set()
        
        return web.json_response({"status": "success"})
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {str(e)}")
        return web.Response(status=400, text=f"Invalid JSON: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in save_canvas_pro: {str(e)}")
        return web.Response(status=500, text=str(e))


class WebCanvasNodePro:
    def __init__(self):
        # print("Initializing WebCanvasNodePro")  # 添加初始化调试
        self.output_dir = os.path.join(folder_paths.get_output_directory(), "web_canvas_pro")
        # print(f"Output directory: {self.output_dir}")  # 检查输出目录
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            # print("Created output directory")
        
        # 创建事件对象用于同步
        self.save_event = threading.Event()
        self.edited_data = None
        self.ws_response = None  # 添加WebSocket响应存储

    RETURN_TYPES = ("IMAGE", "MASK","MASK","MASK","MASK","MASK","MASK","MASK","MASK","MASK","MASK","MASK")
    RETURN_NAMES = ("image", "mask","fore_image","fore_2_mask","fore_3_mask","fore_4_mask","fore_5_mask","fore_6_mask","fore_7_mask","fore_8_mask","fore_9_mask","fore_10_mask")
    FUNCTION = "process"
    CATEGORY = "image/process"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "back_image": ("IMAGE",), # 背景图片输入
                "fore_image": ("IMAGE",), # 前景图片输入
                "下次不再弹窗_保持本次画布": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "fore_mask": ("MASK",),   # 前景蒙版输入
                "fore_image2": ("IMAGE",), # 第二个前景图片输入
                "fore_mask2": ("MASK",), # 第二个前景蒙版输入
                "fore_image3": ("IMAGE",), # 第三个前景图片输入
                "fore_mask3": ("MASK",), # 第三个前景蒙版输入 
                "fore_image4": ("IMAGE",), # 第四个前景图片输入
                "fore_mask4": ("MASK",), # 第四个前景蒙版输入
                "fore_image5": ("IMAGE",), # 第五个前景图片输入
                "fore_mask5": ("MASK",), # 第五个前景蒙版输入
                "fore_image6": ("IMAGE",), # 第六个前景图片输入
                "fore_mask6": ("MASK",), # 第六个前景蒙版输入
                "fore_image7": ("IMAGE",), # 第七个前景图片输入
                "fore_mask7": ("MASK",), # 第七个前景蒙版输入
                "fore_image8": ("IMAGE",), # 第八个前景图片输入
                "fore_mask8": ("MASK",), # 第八个前景蒙版输入
                "fore_image9": ("IMAGE",), # 第九个前景图片输入
                "fore_mask9": ("MASK",), # 第九个前景蒙版输入
                "fore_image10": ("IMAGE",), # 第十个前景图片输入
                "fore_mask10": ("MASK",), # 第十个前景蒙版输入
            },
            "hidden": {
                "prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }

    def process(self, back_image, fore_image, 下次不再弹窗_保持本次画布, prompt,extra_pnginfo,fore_mask=None,
                fore_image2=None, fore_mask2=None,
                fore_image3=None, fore_mask3=None,
                fore_image4=None, fore_mask4=None,
                fore_image5=None, fore_mask5=None,
                fore_image6=None, fore_mask6=None,
                fore_image7=None, fore_mask7=None,
                fore_image8=None, fore_mask8=None,
                fore_image9=None, fore_mask9=None,
                fore_image10=None, fore_mask10=None):
        # 设置全局变量
        global active_canvas_pro
        active_canvas_pro = self
        # 生成随机种子
        try:
            #在extra_pnginfo中的workflow中的nodes查找所有所有节点，如果节点的type为WebCanvasNodePro，则获取widgets_values字段中的[1]
            # print("extra_pnginfo",extra_pnginfo)
            nodes = extra_pnginfo.get("workflow").get("nodes")
            # print("nodes",nodes)
            webpro = [node for node in nodes if node.get("type") == "WebCanvasNodePro"]
            # print("webpro",webpro)
            window_seed = webpro[0].get("widgets_values")[1]
            # print("window_seed",window_seed)
        except Exception as e:
            raise Exception(f"没找到WebCanvasNodePro节点，使用默认windows_id: {str(e)}")

        
        # print(f"seed: {seed}")
        import random
        seed = random.randint(0, 0xffffffffffffffff) if not 下次不再弹窗_保持本次画布 else "use_cache"
 
            
        try:
            # print("Validating input images...")  # 输入验证前
            if len(back_image.shape) != 4 or back_image.shape[-1] != 3:
                raise ValueError(f"Expected back_image shape (B,H,W,3), got {back_image.shape}")
            
            # print(f"Back image shape: {back_image.shape}")  # 打印图像形状
            # print(f"Fore image shape: {fore_image.shape}")
            
            # 确保数据类型正确
            back_image = back_image.float() if back_image.dtype != torch.float32 else back_image
            fore_image = fore_image.float() if fore_image.dtype != torch.float32 else fore_image
            
            # 收集所有图层信息
            layers = []
            output_unnormal_total_mask = torch.ones(1,back_image.shape[1],back_image.shape[2],dtype=torch.float32,device=fore_image.device)
            output_unnormal_fore_mask = torch.zeros(1,64,64,dtype=torch.float32,device=fore_image.device)
            # 处理第一个必需的前景图层
            if fore_mask is None:
                fore_mask = torch.ones((1, fore_image.shape[1], fore_image.shape[2]),
                                        dtype=torch.float32,
                                        device=fore_image.device)
                opacity = 1.0  # 默认不透明度
            else:
                if len(fore_mask.shape) != 3:
                    raise ValueError(f"Expected fore_mask shape (B,H,W), got {fore_mask.shape}")
                fore_mask = fore_mask.float() if fore_mask.dtype != torch.float32 else fore_mask
                opacity = fore_mask.mean().item()  # 计算第一个图层的opacity

            # 添加第一个图层
            layers.append({
                'image': fore_image,
                'mask': fore_mask,
                'index': 0,
                'name': 'Layer 1',
                'opacity': opacity  # 添加opacity
            })
            
            # 处理额外的图层(2-10)
            extra_layers = [
                (fore_image2, fore_mask2, 2),
                (fore_image3, fore_mask3, 3),
                (fore_image4, fore_mask4, 4),
                (fore_image5, fore_mask5, 5),
                (fore_image6, fore_mask6, 6),
                (fore_image7, fore_mask7, 7),
                (fore_image8, fore_mask8, 8),
                (fore_image9, fore_mask9, 9),
                (fore_image10, fore_mask10, 10)
            ]

            
            for img, mask, idx in extra_layers:
                if img is not None:
                    if mask is None:
                        mask = torch.ones((1, img.shape[1], img.shape[2]),
                                        dtype=torch.float32,
                                        device=img.device)
                        opacity = 1.0  # 默认不透明度
                    else:
                        # 如果有mask,使用该mask的平均值作为opacity
                        opacity = mask.mean().item()
                    #     print(f"Opacity: {opacity}")
                    # print(f"Mask shape: {mask.shape}")


                    # 如果mask的shape是64*64，则说明没有编辑MASK涂抹
                    if mask.shape[1] ==64 and mask.shape[2] == 64:
                        raise ValueError(f"请检查，是否链接了MASK插槽，但是没有编辑MASK涂抹")

                    layers.append({
                        'image': img,
                        'mask': mask,
                        'index': idx-1,
                        'name': f'Layer {idx}',
                        'opacity': opacity
                    })
            
            # 获取画布尺寸
            canvas_width = back_image.shape[2]
            canvas_height = back_image.shape[1]
            
            # 清除之前的事件状态和WebSocket响应
            self.save_event.clear()
            self.edited_data = None
            self.ws_response = None
  

            # 保存背景图片
            back_filename = f"back_{seed}.png"
            back_path = os.path.join(self.output_dir, back_filename)
            
            # 清空输出目录
            for file in os.listdir(self.output_dir):
                os.remove(os.path.join(self.output_dir, file))
            
            # 保存背景图片
            back_img = Image.fromarray(np.clip(255. * back_image[0].cpu().numpy(), 0, 255).astype(np.uint8))
            back_img.save(back_path, 'PNG')
            
            # 保存所有图层
            layer_files = []
            for i, layer in enumerate(layers):
                filename = f"fore_{seed}_{i}.png"
                filepath = os.path.join(self.output_dir, filename)
                
                # 保存图片(带Alpha通道)
                img = Image.fromarray(np.clip(255. * layer['image'][0].cpu().numpy(), 0, 255).astype(np.uint8))
                img = img.convert('RGBA')
                
                # 将mask转换为alpha通道
                alpha = Image.fromarray(np.clip(255. * layer['mask'][0].cpu().numpy(), 0, 255).astype(np.uint8))
                img.putalpha(alpha)
                img.save(filepath, 'PNG')
                # print(f"layer_files: {layer}")
                
                layer_files.append({
                    'url': f"/view?filename={filename}&subfolder=web_canvas_pro",
                    'index': layer['index'],
                    'name': f'Layer {i+1}',
                    'visible': True,
                    'opacity': layer['opacity']
                })
                # print(f"layer_files: {layer_files}")
            
            # 发送事件显示画布
            PromptServer.instance.send_sync("show_canvas_pro", {
                "back_image": f"/view?filename={back_filename}&subfolder=web_canvas_pro",
                "fore_image": f"/view?filename=fore_{seed}_0.png&subfolder=web_canvas_pro",
                "layers": layer_files,
                "seed": seed,
                "canvas_width": canvas_width,
                "canvas_height": canvas_height,
                "window_id": window_seed  # 添加窗口ID
            })
            
            # 等待用户编辑完成
            if not self.save_event.wait(timeout=300):
                # print("Timeout waiting for user edit")
                return (back_image, output_unnormal_total_mask,output_unnormal_fore_mask*10)
            
            # 处理WebSocket响应
            if not self.edited_data:
                raise Exception("没有编辑数据")

            
            # 如果是取消操作，直接返回原图
            if not self.edited_data.get('confirmed', False):
                # print("Edit cancelled by user")
                return (back_image, output_unnormal_total_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,output_unnormal_fore_mask,)
            
            # 处理前端发送的图像数据
            if 'image' in self.edited_data and 'mask' in self.edited_data:
                # 解码主图像和总mask
                image_data = self.edited_data['image'].split(',')[1]
                mask_data = self.edited_data['mask'].split(',')[1]
                
                # 解码各图层的mask
                layer_masks_data = self.edited_data.get('layer_masks', [])
                
                # 创建返回用的mask列表
                mask_tensors = []
                
                # 处理主图像和总mask
                image_bytes = base64.b64decode(image_data)
                mask_bytes = base64.b64decode(mask_data)
                
                final_image = Image.open(BytesIO(image_bytes))
                mask_image = Image.open(BytesIO(mask_bytes))
                
                # 确保mask是灰度图
                if mask_image.mode != 'L':
                    mask_image = mask_image.convert('L')
                
                # 转换主图像为tensor
                image_array = np.array(final_image)
                image_tensor = torch.from_numpy(image_array[:,:,:3]).float() / 255.0
                image_tensor = image_tensor.unsqueeze(0)
                
                # 转换总mask为tensor
                mask_array = np.array(mask_image)
                total_mask_tensor = torch.from_numpy(mask_array).float() / 255.0
                total_mask_tensor = total_mask_tensor.unsqueeze(0)
                
                # 处理各图层mask
                for i in range(10):  # 处理10个图层
                    if i < len(layer_masks_data) and layer_masks_data[i]:
                        # 解码图层mask
                        layer_mask_data = layer_masks_data[i].split(',')[1]
                        layer_mask_bytes = base64.b64decode(layer_mask_data)
                        layer_mask_image = Image.open(BytesIO(layer_mask_bytes))
                        
                        # 确保是灰度图
                        if layer_mask_image.mode != 'L':
                            layer_mask_image = layer_mask_image.convert('L')
                        
                        # 转换为tensor
                        layer_mask_array = np.array(layer_mask_image)
                        layer_mask_tensor = torch.from_numpy(layer_mask_array).float() / 255.0
                        layer_mask_tensor = layer_mask_tensor.unsqueeze(0)
                    else:
                        # 创建64x64的黑色mask tensor
                        layer_mask_tensor = torch.zeros((1, 64, 64), dtype=torch.float32)
                    
                    mask_tensors.append(layer_mask_tensor)
                
                # 返回所有tensor
                # 顺序：image, total_mask, 10个layer_masks
                return (image_tensor, total_mask_tensor, *mask_tensors)
                
            raise Exception("图片发生错误，请检查")# 返回原图和原mask
            
        except Exception as e:
            # print(f"\nError in WebCanvasNodePro process: {str(e)}")
            if str(e) == "请检查，是否链接了MASK插槽，但是没有编辑MASK涂抹":
                raise Exception(f"请检查，是否链接了MASK插槽，但是没有编辑MASK涂抹,输入的MASK：[64,64]")
            import traceback
            # print(traceback.format_exc())
            return (back_image, fore_mask)
        finally:
            # print("\n=== WebCanvasNodePro process completed ===")
            active_canvas_pro = None
            self.save_event.clear()
            self.ws_response = None

    @classmethod
    def IS_CHANGED(s,下次不再弹窗_保持本次画布,back_image, prompt,extra_pnginfo,fore_image, fore_mask=None,
                fore_image2=None, fore_mask2=None,
                fore_image3=None, fore_mask3=None,
                fore_image4=None, fore_mask4=None,
                fore_image5=None, fore_mask5=None,
                fore_image6=None, fore_mask6=None,
                fore_image7=None, fore_mask7=None,
                fore_image8=None, fore_mask8=None,
                fore_image9=None, fore_mask9=None,
                fore_image10=None, fore_mask10=None,):
        import random
        if 下次不再弹窗_保持本次画布:
            return "use_cache"
        else:
            return random.randint(0, 0xffffffffffffffff)
        
    def web_canvas(self, image, x: float, y: float, scale: float = 1.0, rotation: float = 0.0):
        with torch.no_grad():
            # 确保输入图像是正确的格式
            if len(image.shape) == 3:
                image = image.unsqueeze(0)
            
            # 获取输入图像尺寸作为标准尺寸
            input_height, input_width = image.shape[1:3]
            canvas_size = (input_width, input_height)
            
            # 将tensor转换为PIL Image
            img = Image.fromarray(np.clip(255. * image[0].cpu().numpy(), 0, 255).astype(np.uint8))
            
            # 确保图像是RGBA模式
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 创建画布（白色背景）和mask（黑色背景）
            canvas = Image.new('RGB', canvas_size, (255, 255, 255))
            mask = Image.new('L', canvas_size, 0)
            
            # 应用变换
            if scale != 1.0:
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.LANCZOS)
                
            if rotation != 0:
                img = img.rotate(-rotation, expand=True, resample=Image.BICUBIC)
            
            # 计算中心位置
            paste_x = int(canvas_size[0]//2 + x - img.width//2)
            paste_y = int(canvas_size[1]//2 + y - img.height//2)
            
            # 从alpha通道创建二值mask
            alpha = img.split()[3]
            temp_mask = Image.new('L', img.size, 0)
            temp_mask.paste(1, mask=alpha)  # 1表示占用区域
            
            # 粘贴图像（使用alpha通道）和mask
            canvas.paste(img, (paste_x, paste_y), alpha)
            mask.paste(temp_mask, (paste_x, paste_y))
            
            # 转换为tensor
            canvas_tensor = torch.from_numpy(np.array(canvas)).float() / 255.0
            mask_tensor = torch.from_numpy(np.array(mask)).float()
            
            # 确保tensor维度正确
            canvas_tensor = canvas_tensor.unsqueeze(0)
            mask_tensor = mask_tensor.unsqueeze(0)
            
            return canvas_tensor, mask_tensor