"""Web canvas pro extension for ComfyUI"""
from .web_canvas import WebCanvasNodePro


NODE_CLASS_MAPPINGS = {
    "WebCanvasNodePro": WebCanvasNodePro
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WebCanvasNodePro": "WebCanvasNodePro"
}

WEB_DIRECTORY = "./web_pro"




#黄色字体
print("\n\033[93m 【Success】Leon image canvas pro extension initialized\033[0m\n")
# 在扩展加载时设置路由
def setup():
    try:
        print(" Leon image canvas pro extension initialized")
    except Exception as e:
        print(f"Error setting up web canvas pro extension")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY", "setup"]