"""设备与传感器数据的请求/响应模型"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReadingCreate(BaseModel):
    """设备上报的数据（字段全部可空，方便分阶段接传感器）"""
    soil_moisture: Optional[float] = Field(None, ge=0, le=100)
    soil_temp: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_lux: Optional[float] = None
    firmware: Optional[str] = None
    ip_address: Optional[str] = None


class ReadingResponse(BaseModel):
    id: int
    device_code: str
    soil_moisture: Optional[float] = None
    soil_temp: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_lux: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceResponse(BaseModel):
    """设备列表里的每一项：设备信息 + 最新一条读数 + 是否需要浇水"""
    code: str
    name: str
    plant_name: str
    location: str
    firmware: str
    ip_address: str
    last_seen: Optional[datetime] = None
    latest: Optional[ReadingResponse] = None
    need_water: bool = False
    dry_threshold: float = 30.0

    class Config:
        from_attributes = True


class LatestResponse(BaseModel):
    """某设备的最新读数"""
    device_code: str
    soil_moisture: Optional[float] = None
    soil_temp: Optional[float] = None
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    light_lux: Optional[float] = None
    created_at: Optional[datetime] = None
    need_water: bool = False
    dry_threshold: float = 30.0


class DeviceBindRequest(BaseModel):
    """把设备绑定到某个用户和某盆花"""
    user_id: Optional[int] = None
    plant_name: Optional[str] = None
    location: Optional[str] = None
    name: Optional[str] = None
