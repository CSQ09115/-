import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.database import engine
from app.db.base import Base
from contextlib import asynccontextmanager

# 管理后台（Next.js 静态导出）所在目录，由 web 目录执行 npm run build:admin 生成
ADMIN_UI_DIR = Path(__file__).resolve().parent.parent / "admin_ui"

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 先导入并注册全部模型，再建表，最后导入路由与服务。
# 识别服务在模块导入期会读取 YOLO 配置，必须保证此时 system_configs 已存在；
# create_all 只会补齐缺失的表，不会影响已有表和数据。
import app.models  # noqa: F401
Base.metadata.create_all(bind=engine)

# 轻量级列迁移：create_all 不会为已有表补列，这里为 users 表补 phone 列（短信登录）
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_phone ON users (phone)"))
        conn.commit()
        logger.info("users 表已新增 phone 列")
    except Exception:
        # 列已存在（重复启动/新库）时忽略
        pass

from app.api.router import api_router

# 定时任务调度器
scheduler = None


def setup_scheduler():
    """配置定时任务"""
    global scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from app.tasks.reminder_tasks import (
            check_upcoming_reminders,
            refresh_weather_factors,
            send_daily_reminders,
            send_overdue_reminders
        )

        scheduler = AsyncIOScheduler()

        # 每小时检查即将到期的提醒
        scheduler.add_job(
            check_upcoming_reminders,
            CronTrigger(minute=0),
            id="check_reminders",
            replace_existing=True
        )

        # 每日9点发送提醒
        scheduler.add_job(
            send_daily_reminders,
            CronTrigger(hour=9, minute=0),
            id="daily_reminders",
            replace_existing=True
        )

        # 每6小时刷新天气
        scheduler.add_job(
            refresh_weather_factors,
            CronTrigger(hour="*/6"),
            id="refresh_weather",
            replace_existing=True
        )

        # 每3小时检查逾期提醒
        scheduler.add_job(
            send_overdue_reminders,
            CronTrigger(hour="*/3"),
            id="overdue_reminders",
            replace_existing=True
        )

        scheduler.start()
        logging.info("定时任务调度器已启动")
    except ImportError:
        logging.warning("APScheduler 未安装，跳过定时任务配置")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化植物数据
    from app.db.seed_plants import seed_plants
    from app.db.seed_admin import seed_admin_user
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        seed_plants(db)
        seed_admin_user(db)
    finally:
        db.close()

    # 启动定时任务
    setup_scheduler()

    yield

    # 关闭定时任务
    if scheduler:
        scheduler.shutdown()
        logging.info("定时任务调度器已关闭")


app = FastAPI(title="护花使者 API", version="1.0.0", lifespan=lifespan)

# 挂载静态文件目录（植物图片）
app.mount("/static", StaticFiles(directory="static"), name="static")

# 挂载管理后台静态站点（Next.js 静态导出，入口 /admin/）
if (ADMIN_UI_DIR / "index.html").exists():
    app.mount("/admin", StaticFiles(directory=str(ADMIN_UI_DIR), html=True), name="admin")
    logging.info("管理后台已挂载：/admin -> %s", ADMIN_UI_DIR)
else:
    logging.warning("未找到管理后台静态资源 %s，请在 web 目录执行 npm run build:admin", ADMIN_UI_DIR)


# 浏览器标签页图标（admin_ui 内构建生成的 favicon.ico）
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(ADMIN_UI_DIR / "favicon.ico", media_type="image/x-icon")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# WebSocket CORS 中间件
@app.middleware("http")
async def add_websocket_cors_headers(request: Request, call_next):
    response = await call_next(request)
    # 为所有响应添加 WebSocket 相关的 CORS 头
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, CONNECT"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    return response

# Include API routes
app.include_router(api_router)

# Include WebSocket routes
from app.api.endpoints.websocket import router as websocket_router
app.include_router(websocket_router)


@app.get("/")
def root():
    return {"message": "护花使者 API"}


@app.get("/health")
def health_check():
    # 尝试导入服务，如果失败则返回警告
    try:
        from app.services.recognition import plant_recognition_service
        from app.services.pest_recognition import pest_recognition_service

        return {
            "status": "healthy",
            "plant_model": plant_recognition_service.model is not None,
            "pest_model": pest_recognition_service.model is not None
        }
    except Exception as e:
        return {
            "status": "healthy",
            "warning": str(e)
        }


@app.get("/models/status")
def models_status():
    """获取模型状态"""
    try:
        from app.services.recognition import plant_recognition_service
        from app.services.pest_recognition import pest_recognition_service

        return {
            "plant": {
                "loaded": plant_recognition_service.model is not None,
                "classes_count": len(plant_recognition_service.classes),
                "model_path": plant_recognition_service.model_path
            },
            "pest": {
                "loaded": pest_recognition_service.model is not None,
                "classes_count": len(pest_recognition_service.classes),
                "model_path": pest_recognition_service.model_path
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "plant": {"loaded": False, "classes_count": 0},
            "pest": {"loaded": False, "classes_count": 0}
        }
