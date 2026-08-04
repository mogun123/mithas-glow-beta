"""
🎨 STABLE DIFFUSION SERVER FOR HIGH-END AI MAKEUP SYSTEM
Integrates with Automatic1111/ComfyUI backend for real-time makeup generation
Uses ControlNet for precise facial structure preservation
"""

import asyncio
import websockets
import json
import base64
import io
import numpy as np
from PIL import Image
import torch
from typing import Dict, Any, Optional
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StableDiffusionServer:
    """High-performance Stable Diffusion server for makeup generation"""
    
    def __init__(self):
        self.clients = set()
        self.sd_api_url = "http://127.0.0.1:7860"  # Automatic1111 API
        self.comfyui_url = "http://127.0.0.1:8188"  # ComfyUI API
        
        # ControlNet processors
        self.controlnet_processors = {
            'canny': self._apply_canny,
            'depth': self._apply_depth,
            'pose': self._apply_pose,
            'scribble': self._apply_scribble
        }
        
        logger.info("🎨 Stable Diffusion Server initialized")
    
    async def register_client(self, websocket, path):
        """Register new WebSocket client"""
        self.clients.add(websocket)
        logger.info(f"✅ Client connected: {websocket.remote_address}")
        
        try:
            await self.handle_client(websocket)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"🔌 Client disconnected: {websocket.remote_address}")
        finally:
            self.clients.discard(websocket)
    
    async def handle_client(self, websocket):
        """Handle incoming messages from client"""
        async for message in websocket:
            try:
                data = json.loads(message)
                await self.process_request(websocket, data)
            except json.JSONDecodeError:
                await self.send_error(websocket, "Invalid JSON format")
            except Exception as e:
                logger.error(f"Error processing request: {e}")
                await self.send_error(websocket, str(e))
    
    async def process_request(self, websocket, data: Dict[str, Any]):
        """Process Stable Diffusion request"""
        request_type = data.get('type', 'generate')
        
        if request_type == 'generate':
            await self.generate_makeup(websocket, data)
        elif request_type == 'inpaint':
            await self.inpaint_makeup(websocket, data)
        elif request_type == 'refine':
            await self.refine_makeup(websocket, data)
        else:
            await self.send_error(websocket, f"Unknown request type: {request_type}")
    
    async def generate_makeup(self, websocket, data: Dict[str, Any]):
        """Generate makeup look with ControlNet"""
        try:
            input_data = data.get('input', {})
            image_data = input_data.get('image', '')
            controlnet_data = input_data.get('controlnet', {})
            prompt = input_data.get('prompt', 'professional makeup')
            
            # Send progress start
            await self.send_progress(websocket, 0)
            
            # Decode base64 image
            image = self._decode_base64_image(image_data)
            
            # Apply ControlNet preprocessing
            control_type = controlnet_data.get('type', 'canny')
            control_image = self.controlnet_processors[control_type](image)
            
            # Prepare Stable Diffusion payload
            payload = {
                "prompt": prompt,
                "negative_prompt": input_data.get('negative_prompt', 'blurry, low quality'),
                "init_images": [image],
                "controlnet_units": [{
                    "input_image": control_image,
                    "module": control_type,
                    "model": "control_canny-fp16.safetensors",
                    "weight": 1.0,
                    "guidance_start": 0.0,
                    "guidance_end": 1.0
                }],
                "sampler_name": "DPM++ 2M Karras",
                "steps": input_data.get('steps', 20),
                "cfg_scale": input_data.get('guidance_scale', 7.5),
                "denoising_strength": input_data.get('strength', 0.8),
                "width": 512,
                "height": 768,
                "batch_size": 1
            }
            
            # Send to Automatic1111 API
            result = await self._call_sd_api(payload, websocket)
            
            if result:
                await self.send_complete(websocket, result)
            
        except Exception as e:
            logger.error(f"Error in generate_makeup: {e}")
            await self.send_error(websocket, str(e))
    
    async def inpaint_makeup(self, websocket, data: Dict[str, Any]):
        """Inpaint makeup areas only (lips, eyes, cheeks)"""
        try:
            input_data = data.get('input', {})
            image_data = input_data.get('image', '')
            mask_data = input_data.get('mask', '')
            prompt = input_data.get('prompt', 'makeup enhancement')
            
            await self.send_progress(websocket, 0)
            
            # Decode images
            image = self._decode_base64_image(image_data)
            mask = self._decode_base64_image(mask_data) if mask_data else None
            
            # Create precise makeup mask if not provided
            if mask is None:
                mask = self._create_makeup_mask(image)
            
            # Prepare inpainting payload
            payload = {
                "prompt": prompt,
                "negative_prompt": input_data.get('negative_prompt', 'blurry, bad makeup'),
                "init_images": [image],
                "mask": mask,
                "inpainting_fill": 1,  # Original
                "inpaint_full_res": 1,  # Full resolution
                "sampler_name": "DPM++ 2M Karras",
                "steps": input_data.get('steps', 20),
                "cfg_scale": input_data.get('guidance_scale', 7.5),
                "denoising_strength": input_data.get('strength', 0.8),
                "width": 512,
                "height": 768
            }
            
            result = await self._call_sd_api(payload, websocket)
            
            if result:
                await self.send_complete(websocket, result)
                
        except Exception as e:
            logger.error(f"Error in inpaint_makeup: {e}")
            await self.send_error(websocket, str(e))
    
    async def refine_makeup(self, websocket, data: Dict[str, Any]):
        """Refine existing makeup look"""
        try:
            input_data = data.get('input', {})
            image_data = input_data.get('image', '')
            prompt = input_data.get('prompt', 'refined makeup')
            
            await self.send_progress(websocket, 0)
            
            image = self._decode_base64_image(image_data)
            
            # Use depth ControlNet for structure preservation
            depth_image = self._apply_depth(image)
            
            payload = {
                "prompt": prompt,
                "negative_prompt": input_data.get('negative_prompt', 'blurry, oversaturated'),
                "init_images": [image],
                "controlnet_units": [{
                    "input_image": depth_image,
                    "module": "depth",
                    "model": "control_depth-fp16.safetensors",
                    "weight": 0.8,
                    "guidance_start": 0.0,
                    "guidance_end": 1.0
                }],
                "sampler_name": "DPM++ 2M Karras",
                "steps": input_data.get('steps', 15),
                "cfg_scale": input_data.get('guidance_scale', 5.0),
                "denoising_strength": input_data.get('strength', 0.3),
                "width": 512,
                "height": 768
            }
            
            result = await self._call_sd_api(payload, websocket)
            
            if result:
                await self.send_complete(websocket, result)
                
        except Exception as e:
            logger.error(f"Error in refine_makeup: {e}")
            await self.send_error(websocket, str(e))
    
    async def _call_sd_api(self, payload: Dict, websocket):
        """Call Automatic1111 API with progress tracking"""
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.sd_api_url}/sdapi/v1/img2img",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract generated image
                        if 'images' in result and result['images']:
                            # Send intermediate progress
                            await self.send_progress(websocket, 50)
                            
                            # Convert base64 to PIL Image
                            image_data = result['images'][0]
                            image_bytes = base64.b64decode(image_data.split(',')[1])
                            image = Image.open(io.BytesIO(image_bytes))
                            
                            # Convert back to base64 for React
                            buffered = io.BytesIO()
                            image.save(buffered, format="JPEG", quality=95)
                            img_str = base64.b64encode(buffered.getvalue()).decode()
                            
                            await self.send_progress(websocket, 90)
                            return img_str
                        
                        return None
                    else:
                        error_text = await response.text()
                        logger.error(f"SD API error: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error calling SD API: {e}")
            return None
    
    def _decode_base64_image(self, base64_str: str) -> Image.Image:
        """Decode base64 string to PIL Image"""
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_bytes = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_bytes))
    
    def _create_makeup_mask(self, image: Image.Image) -> Image.Image:
        """Create precise makeup mask for lips, eyes, cheeks"""
        # This would use face detection to create precise masks
        # For now, return a basic mask
        mask = Image.new('L', image.size, 0)  # Black background
        
        # Create makeup regions (simplified - would use face landmarks)
        width, height = image.size
        
        # Lip region (bottom center)
        lip_mask = Image.new('L', image.size, 0)
        for y in range(int(height * 0.7), height):
            for x in range(int(width * 0.3), int(width * 0.7)):
                lip_mask.putpixel((x, y), 255)
        
        # Eye regions (upper left and right)
        eye_mask = Image.new('L', image.size, 0)
        # Left eye
        for y in range(int(height * 0.3), int(height * 0.5)):
            for x in range(int(width * 0.1), int(width * 0.4)):
                eye_mask.putpixel((x, y), 255)
        # Right eye
        for y in range(int(height * 0.3), int(height * 0.5)):
            for x in range(int(width * 0.6), int(width * 0.9)):
                eye_mask.putpixel((x, y), 255)
        
        # Cheek regions
        cheek_mask = Image.new('L', image.size, 0)
        # Left cheek
        for y in range(int(height * 0.5), int(height * 0.7)):
            for x in range(int(width * 0.05), int(width * 0.35)):
                cheek_mask.putpixel((x, y), 128)
        # Right cheek
        for y in range(int(height * 0.5), int(height * 0.7)):
            for x in range(int(width * 0.65), int(width * 0.95)):
                cheek_mask.putpixel((x, y), 128)
        
        # Combine masks
        mask = Image.chop.add(mask, lip_mask)
        mask = Image.chop.add(mask, eye_mask)
        mask = Image.chop.add(mask, cheek_mask)
        
        return mask
    
    def _apply_canny(self, image: Image.Image) -> Image.Image:
        """Apply Canny edge detection for ControlNet"""
        import cv2
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Apply Canny edge detection
        edges = cv2.Canny(img_array, 100, 200)
        
        # Convert back to PIL
        return Image.fromarray(edges)
    
    def _apply_depth(self, image: Image.Image) -> Image.Image:
        """Apply depth map generation for ControlNet"""
        import cv2
        
        # Convert to grayscale
        gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
        
        # Apply depth estimation (simplified MiDaS would be better)
        depth = cv2.GaussianBlur(gray, (5, 5), 0)
        
        return Image.fromarray(depth)
    
    def _apply_pose(self, image: Image.Image) -> Image.Image:
        """Apply pose estimation for ControlNet"""
        # This would use MediaPipe or OpenPose for accurate pose detection
        # For now, return edge detection as placeholder
        return self._apply_canny(image)
    
    def _apply_scribble(self, image: Image.Image) -> Image.Image:
        """Apply scribble effect for ControlNet"""
        import cv2
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Apply edge detection with different parameters
        edges = cv2.Canny(img_array, 50, 150)
        
        # Make it look like scribbles
        kernel = np.ones((2,2), np.uint8)
        scribble = cv2.dilate(edges, kernel, iterations=1)
        
        return Image.fromarray(scribble)
    
    async def send_progress(self, websocket, progress: int):
        """Send progress update to client"""
        message = {
            "type": "progress",
            "data": {
                "progress": progress
            }
        }
        await websocket.send(json.dumps(message))
    
    async def send_complete(self, websocket, image_data: str):
        """Send completed generation to client"""
        message = {
            "type": "complete",
            "data": {
                "image": image_data,
                "metadata": {
                    "processingTime": datetime.now().isoformat(),
                    "model": "stable-diffusion-v1-5",
                    "resolution": "512x768"
                }
            }
        }
        await websocket.send(json.dumps(message))
    
    async def send_error(self, websocket, error_message: str):
        """Send error message to client"""
        message = {
            "type": "error",
            "data": {
                "error": error_message
            }
        }
        await websocket.send(json.dumps(message))

async def main():
    """Main server entry point"""
    server = StableDiffusionServer()
    
    # Start WebSocket server
    host = "localhost"
    port = 7860
    
    logger.info(f"🚀 Starting Stable Diffusion Server on {host}:{port}")
    
    async with websockets.serve(server.register_client, host, port):
        logger.info("✅ Stable Diffusion Server is running")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
