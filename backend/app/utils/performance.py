import asyncio
import time
import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps
from contextlib import asynccontextmanager
import psutil
import torch
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor and manage system performance for AI services"""
    
    def __init__(self):
        self.max_cpu_usage = 80.0  # Percentage
        self.max_memory_usage = 80.0  # Percentage
        self.max_gpu_memory = 90.0  # Percentage
        self.request_timeout = 120.0  # Seconds
        self.active_requests = 0
        self.max_concurrent_requests = 5
        
    def check_system_resources(self) -> Dict[str, float]:
        """Check current system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            resources = {
                "cpu_usage": cpu_percent,
                "memory_usage": memory_percent,
                "active_requests": self.active_requests
            }
            
            # Check GPU if available
            if torch.cuda.is_available():
                gpu_memory_allocated = torch.cuda.memory_allocated() / 1024**3  # GB
                gpu_memory_total = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
                gpu_memory_percent = (gpu_memory_allocated / gpu_memory_total) * 100
                resources["gpu_memory_usage"] = gpu_memory_percent
            
            return resources
            
        except Exception as e:
            logger.error(f"Resource check failed: {e}")
            return {"error": str(e)}
    
    def can_accept_request(self) -> bool:
        """Check if system can accept new request"""
        resources = self.check_system_resources()
        
        # Check CPU usage
        if resources.get("cpu_usage", 0) > self.max_cpu_usage:
            return False
        
        # Check memory usage
        if resources.get("memory_usage", 0) > self.max_memory_usage:
            return False
        
        # Check GPU memory if available
        if "gpu_memory_usage" in resources and resources["gpu_memory_usage"] > self.max_gpu_memory:
            return False
        
        # Check concurrent requests
        if self.active_requests >= self.max_concurrent_requests:
            return False
        
        return True
    
    @asynccontextmanager
    async def monitor_request(self):
        """Context manager for monitoring individual requests"""
        if not self.can_accept_request():
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable due to high load"
            )
        
        self.active_requests += 1
        start_time = time.time()
        
        try:
            yield
        finally:
            self.active_requests -= 1
            duration = time.time() - start_time
            logger.info(f"Request completed in {duration:.2f}s")

# Global performance monitor
performance_monitor = PerformanceMonitor()

def timeout_handler(seconds: float):
    """Decorator to add timeout to functions"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                logger.error(f"Function {func.__name__} timed out after {seconds}s")
                raise HTTPException(
                    status_code=504,
                    detail=f"Request timed out after {seconds} seconds"
                )
        return wrapper
    return decorator

def resource_limiter(max_concurrent: int = 5):
    """Decorator to limit concurrent resource usage"""
    semaphore = asyncio.Semaphore(max_concurrent)
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            async with semaphore:
                return await func(*args, **kwargs)
        return wrapper
    return decorator

class GPUManager:
    """Manage GPU memory and operations"""
    
    def __init__(self):
        self.memory_threshold = 0.8  # 80% of total GPU memory
        self.cleanup_interval = 300  # 5 minutes
        
    def check_gpu_memory(self) -> Dict[str, float]:
        """Check GPU memory usage"""
        if not torch.cuda.is_available():
            return {"available": False}
        
        try:
            allocated = torch.cuda.memory_allocated() / 1024**3  # GB
            total = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
            usage = allocated / total
            
            return {
                "available": True,
                "allocated_gb": allocated,
                "total_gb": total,
                "usage_percent": usage * 100
            }
        except Exception as e:
            logger.error(f"GPU memory check failed: {e}")
            return {"available": False, "error": str(e)}
    
    def cleanup_memory(self):
        """Clean up GPU memory"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.info("GPU memory cache cleared")
    
    def is_memory_available(self, required_gb: float = 2.0) -> bool:
        """Check if enough GPU memory is available"""
        if not torch.cuda.is_available():
            return False
        
        memory_info = self.check_gpu_memory()
        if not memory_info.get("available"):
            return False
        
        total_gb = memory_info["total_gb"]
        allocated_gb = memory_info["allocated_gb"]
        available_gb = total_gb - allocated_gb
        
        return available_gb >= required_gb

# Global GPU manager
gpu_manager = GPUManager()

class ErrorHandler:
    """Centralized error handling for AI services"""
    
    @staticmethod
    def handle_ai_error(error: Exception, operation: str) -> HTTPException:
        """Handle AI service errors with appropriate HTTP status codes"""
        error_message = str(error).lower()
        
        if "memory" in error_message or "cuda" in error_message:
            logger.error(f"Memory error in {operation}: {error}")
            return HTTPException(
                status_code=507,
                detail="Insufficient memory to process request"
            )
        
        elif "timeout" in error_message:
            logger.error(f"Timeout in {operation}: {error}")
            return HTTPException(
                status_code=504,
                detail="Request timed out"
            )
        
        elif "model" in error_message or "load" in error_message:
            logger.error(f"Model error in {operation}: {error}")
            return HTTPException(
                status_code=503,
                detail="AI model temporarily unavailable"
            )
        
        elif "file" in error_message or "image" in error_message:
            logger.error(f"File processing error in {operation}: {error}")
            return HTTPException(
                status_code=400,
                detail="Invalid file format or corrupted image"
            )
        
        else:
            logger.error(f"Unexpected error in {operation}: {error}")
            return HTTPException(
                status_code=500,
                detail="Internal server error during AI processing"
            )

class BackgroundTaskManager:
    """Manage background tasks for heavy AI operations"""
    
    def __init__(self):
        self.active_tasks = set()
        self.max_background_tasks = 3
        
    async def add_task(self, coro, task_id: str = None):
        """Add background task with monitoring"""
        if len(self.active_tasks) >= self.max_background_tasks:
            raise HTTPException(
                status_code=503,
                detail="Too many background tasks running"
            )
        
        task_id = task_id or str(time.time())
        task = asyncio.create_task(coro)
        self.active_tasks.add(task_id)
        
        def cleanup(task_obj):
            self.active_tasks.discard(task_id)
            if task_obj.exception():
                logger.error(f"Background task {task_id} failed: {task_obj.exception()}")
        
        task.add_done_callback(lambda t: cleanup(t))
        return task_id
    
    def get_active_tasks(self) -> Dict[str, Any]:
        """Get status of active background tasks"""
        return {
            "active_count": len(self.active_tasks),
            "max_allowed": self.max_background_tasks,
            "task_ids": list(self.active_tasks)
        }

# Global managers
error_handler = ErrorHandler()
background_manager = BackgroundTaskManager()

# Performance monitoring middleware
async def performance_middleware(request, call_next):
    """FastAPI middleware for performance monitoring"""
    start_time = time.time()
    
    # Check if request should be allowed
    if not performance_monitor.can_accept_request():
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable due to high load"
        )
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log performance metrics
        logger.info(f"Request: {request.method} {request.url.path} - {process_time:.2f}s")
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed after {process_time:.2f}s: {e}")
        raise
