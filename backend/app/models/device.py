"""
设备与传感器数据模型（护花使者 IoT 模块）
=========================================
这是本项目新增的硬件接入部分：
  Device        —— 一块 ESP32（对应一盆花）
  SensorReading —— 一条传感器读数

设计要点（面向学生讲解）：
  1. device_code 用字符串而不是外键：设备上报时可能还没绑定用户，
     用编号（如 FG-ESP32-001）作为业务主键更灵活，也方便设备端直接上报。
  2. 所有传感器字段都允许为空（nullable=True）：
     这样"先接土壤湿度、后接温度"的分阶段开发不会打断，
     缺哪个传感器就留空，App 端按字段是否存在来显示。
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.db.base import Base

# 土壤湿度低于此值就认为"该浇水了"（百分比）
# ⚠️ 真实阈值要等传感器到货后，按"干土/湿土标定"实测确定，这里先给经验值
DRY_THRESHOLD = 30.0


class Device(Base):
    """一台设备（一块 ESP32 开发板，可绑定一盆花）"""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)  # 设备编号 FG-ESP32-001
    name = Column(String(64), default="未命名设备")
    plant_name = Column(String(64), default="")          # 这盆花叫什么
    location = Column(String(100), default="")           # 摆放位置（阳台/客厅…）
    firmware = Column(String(32), default="")            # 固件版本
    ip_address = Column(String(32), default="")          # 设备局域网 IP
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 归属用户（可后续绑定）
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


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
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
