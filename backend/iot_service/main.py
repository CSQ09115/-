"""
护花使者 · 轻量 IoT 数据服务（阶段 2 用）
=========================================
作用：接收 ESP32 上报的传感器数据，存库，并提供查询接口和一个能直接看的网页。

为什么要单独做一个轻量服务：
  主后端（backend/app）依赖 torch / ultralytics / transformers 等 AI 库（数 GB），
  装起来很慢。为了先把"设备 → 后台"这条链路打通，先用只依赖
  fastapi + uvicorn + sqlalchemy 的轻量版本，数据表与接口设计保持一致，
  后续可无缝迁移进主后端（换数据库连接即可，模型和接口不用改）。

启动方式（在 backend 目录下）：
  python -m uvicorn iot_service.main:app --host 0.0.0.0 --port 8001 --reload

接口一览：
  POST /api/devices/{code}/readings   设备上报一条传感器数据（首次上报自动注册设备）
  GET  /api/devices                   设备列表
  GET  /api/devices/{code}/latest     某设备最新一条数据（含是否需要浇水判断）
  GET  /api/devices/{code}/history    历史数据（?limit=50）
  GET  /dashboard                     可视化网页（5 秒自动刷新）
"""
import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import (Column, DateTime, Float, Integer, String,
                        create_engine, desc)
from sqlalchemy.orm import declarative_base, sessionmaker

# ---------------------------------------------------------------- 数据库配置
# 数据库文件放在 iot_service 目录下；将来换成主后端的 PostgreSQL 只需改这一行
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "iot.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# 土壤湿度低于这个值就认为"该浇水了"（百分比）。
# 真实阈值要等传感器到货后按"干土/湿土标定"确定，这里先给个经验值。
DRY_THRESHOLD = 30.0


# ---------------------------------------------------------------- 数据模型
class Device(Base):
    """设备（一块 ESP32 对应一个设备，可以绑定一盆花）"""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)  # 设备编号，如 FG-ESP32-001
    name = Column(String(64), default="未命名设备")
    plant_name = Column(String(64), default="")     # 这盆花叫什么
    firmware = Column(String(32), default="")       # 固件版本
    ip_address = Column(String(32), default="")     # 板子的局域网 IP
    last_seen = Column(DateTime, default=datetime.now)
    created_at = Column(DateTime, default=datetime.now)


class SensorReading(Base):
    """一条传感器读数"""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String(64), index=True, nullable=False)
    soil_moisture = Column(Float, nullable=True)   # 土壤湿度 %
    soil_temp = Column(Float, nullable=True)       # 土壤温度 ℃
    air_temp = Column(Float, nullable=True)        # 空气温度 ℃
    air_humidity = Column(Float, nullable=True)    # 空气湿度 %
    light_lux = Column(Float, nullable=True)       # 光照 lux
    raw = Column(String(512), default="")          # 原始报文（调试用）
    created_at = Column(DateTime, default=datetime.now, index=True)


Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------- 请求/响应模型
class ReadingIn(BaseModel):
    """设备上报的数据（字段都可空，方便分阶段接传感器）"""
    soil_moisture: Optional[float] = Field(None, ge=0, le=100)
    soil_temp: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_lux: Optional[float] = None
    firmware: Optional[str] = None
    ip_address: Optional[str] = None


class ReadingOut(BaseModel):
    id: int
    device_code: str
    soil_moisture: Optional[float]
    soil_temp: Optional[float]
    air_temp: Optional[float]
    air_humidity: Optional[float]
    light_lux: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------- 接口
app = FastAPI(title="护花使者 IoT 数据服务", version="0.2.0")


@app.post("/api/devices/{code}/readings", response_model=ReadingOut)
def post_reading(code: str, payload: ReadingIn):
    """设备上报数据。设备第一次上报时自动注册（省去手工录入的麻烦）"""
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.code == code).first()
        now = datetime.now()
        if device is None:
            device = Device(code=code, name=f"设备 {code}", last_seen=now, created_at=now)
            db.add(device)
        else:
            device.last_seen = now
        if payload.firmware:
            device.firmware = payload.firmware
        if payload.ip_address:
            device.ip_address = payload.ip_address

        reading = SensorReading(
            device_code=code,
            soil_moisture=payload.soil_moisture,
            soil_temp=payload.soil_temp,
            air_temp=payload.air_temp,
            air_humidity=payload.air_humidity,
            light_lux=payload.light_lux,
            created_at=now,
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
        return reading
    finally:
        db.close()


@app.get("/api/devices")
def list_devices():
    db = SessionLocal()
    try:
        devices = db.query(Device).all()
        result = []
        for d in devices:
            latest = (db.query(SensorReading)
                      .filter(SensorReading.device_code == d.code)
                      .order_by(desc(SensorReading.created_at))
                      .first())
            result.append({
                "code": d.code,
                "name": d.name,
                "plant_name": d.plant_name,
                "firmware": d.firmware,
                "ip_address": d.ip_address,
                "last_seen": d.last_seen,
                "latest": {
                    "soil_moisture": latest.soil_moisture if latest else None,
                    "soil_temp": latest.soil_temp if latest else None,
                    "created_at": latest.created_at if latest else None,
                } if latest else None,
                "need_water": (latest.soil_moisture < DRY_THRESHOLD) if (latest and latest.soil_moisture is not None) else False,
            })
        return result
    finally:
        db.close()


@app.get("/api/devices/{code}/latest")
def latest_reading(code: str):
    db = SessionLocal()
    try:
        r = (db.query(SensorReading)
             .filter(SensorReading.device_code == code)
             .order_by(desc(SensorReading.created_at))
             .first())
        if not r:
            raise HTTPException(status_code=404, detail="该设备还没有上报过数据")
        return {
            "device_code": r.device_code,
            "soil_moisture": r.soil_moisture,
            "soil_temp": r.soil_temp,
            "air_temp": r.air_temp,
            "air_humidity": r.air_humidity,
            "light_lux": r.light_lux,
            "created_at": r.created_at,
            "dry_threshold": DRY_THRESHOLD,
            "need_water": (r.soil_moisture is not None and r.soil_moisture < DRY_THRESHOLD),
        }
    finally:
        db.close()


@app.get("/api/devices/{code}/history", response_model=List[ReadingOut])
def history(code: str, limit: int = 50):
    db = SessionLocal()
    try:
        rows = (db.query(SensorReading)
                .filter(SensorReading.device_code == code)
                .order_by(desc(SensorReading.created_at))
                .limit(limit)
                .all())
        return rows
    finally:
        db.close()


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    """简单的可视化页面：列出设备、最新数据、是否需要浇水，5 秒自动刷新"""
    html_path = os.path.join(BASE_DIR, "dashboard.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/")
def root():
    return JSONResponse({
        "service": "护花使者 IoT 数据服务",
        "docs": "/docs",
        "dashboard": "/dashboard",
        "db": DB_PATH,
    })
